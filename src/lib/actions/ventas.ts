'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requerirCaja } from '@/lib/session'
import { manejarError, ErrorDeNegocio } from '@/lib/errores'
import { Prisma } from '@prisma/client'

const schemaVenta = z.object({
  servicios: z
    .array(
      z.object({
        servicioId: z.number().int().positive(),
        cantidad: z
          .number()
          .int()
          .positive()
          .max(1000, 'La cantidad por servicio no puede superar 1000')
          .default(1),
      })
    )
    .min(1, 'Debe seleccionar al menos un servicio')
    .max(50, 'No puede registrar más de 50 servicios por venta'),
  metodoPago: z.enum(['efectivo', 'QR', 'tarjeta', 'otro']),
})

const schemaEstado = z.object({
  ventaId: z.number().int().positive(),
  estado: z.enum(['pagado', 'finalizado']),
})

export type VentaResult =
  | { ok: true; ventaId: number; numeroCorrelativo: number }
  | { ok: false; error: string }

export async function registrarVenta(input: {
  servicios: { servicioId: number; cantidad: number }[]
  metodoPago: 'efectivo' | 'QR' | 'tarjeta' | 'otro'
}): Promise<VentaResult> {
  try {
    const usuario = await requerirCaja()
    const datos = schemaVenta.parse(input)

    const caja = await prisma.caja.findFirst({
      where: { usuarioId: usuario.id, estado: 'abierta' },
    })
    if (!caja) {
      return { ok: false, error: 'Debe abrir la caja antes de registrar ventas' }
    }

    const servicioIds = datos.servicios.map((s) => s.servicioId)
    const servicios = await prisma.servicio.findMany({
      where: { id: { in: servicioIds }, estado: 'activo' },
    })
    const precioPorId = new Map(servicios.map((s) => [s.id, s.precio.toNumber()]))

    let total = 0
    for (const item of datos.servicios) {
      const precio = precioPorId.get(item.servicioId)
      if (precio === undefined) {
        return { ok: false, error: 'Uno de los servicios no existe o está inactivo' }
      }
      total += precio * item.cantidad
    }

    const resultado = await prisma.$transaction(
      async (tx) => {
        // Lock de fila sobre la caja para serializar la generación del correlativo
        const rows = await tx.$queryRaw<{ id: number; estado: string }[]>`
          SELECT id, estado FROM "cajas" WHERE id = ${caja.id} FOR UPDATE
        `
        if (!rows || rows.length === 0) {
          throw new ErrorDeNegocio('La caja ya no está disponible')
        }
        if (rows[0].estado !== 'abierta') {
          throw new ErrorDeNegocio('La caja ya fue cerrada, no se puede registrar la venta')
        }

        const ultima = await tx.venta.findFirst({
          where: { cajaId: caja.id },
          orderBy: { numeroCorrelativo: 'desc' },
        })
        const numeroCorrelativo = (ultima?.numeroCorrelativo ?? 0) + 1

        const venta = await tx.venta.create({
          data: {
            cajaId: caja.id,
            numeroCorrelativo,
            usuarioId: usuario.id,
            metodoPago: datos.metodoPago,
            total,
            estadoVehiculo: 'registrado',
          },
        })

        const detalleData: Prisma.DetalleVentaCreateManyInput[] = datos.servicios.map(
          (item) => ({
            ventaId: venta.id,
            servicioId: item.servicioId,
            cantidad: item.cantidad,
            precioAplicado: precioPorId.get(item.servicioId)!,
          })
        )
        await tx.detalleVenta.createMany({ data: detalleData })

        return { ventaId: venta.id, numeroCorrelativo }
      },
      {
        timeout: 60000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    )

    revalidatePath('/caja')
    revalidatePath('/admin/dashboard')
    return { ok: true, ventaId: resultado.ventaId, numeroCorrelativo: resultado.numeroCorrelativo }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}

export type CambioEstadoResult = { ok: true } | { ok: false; error: string }

export async function cambiarEstadoVenta(
  ventaId: number,
  estado: 'pagado' | 'finalizado'
): Promise<CambioEstadoResult> {
  try {
    const usuario = await requerirCaja()
    const datos = schemaEstado.parse({ ventaId, estado })

    const venta = await prisma.venta.findUnique({
      where: { id: datos.ventaId },
      include: { caja: true },
    })
    if (!venta) return { ok: false, error: 'Venta no encontrada' }
    if (venta.caja.estado !== 'abierta') {
      return { ok: false, error: 'La caja ya está cerrada, no puede modificar esta venta' }
    }
    if (usuario.rol !== 'Administrador' && venta.caja.usuarioId !== usuario.id) {
      return { ok: false, error: 'No puede modificar ventas de otro turno' }
    }

    const estadoActual = venta.estadoVehiculo
    const transiciones: Record<string, string[]> = {
      registrado: ['pagado', 'finalizado'],
      pagado: ['finalizado'],
      finalizado: [],
    }
    if (!transiciones[estadoActual].includes(datos.estado)) {
      return { ok: false, error: `Transición inválida de "${estadoActual}" a "${datos.estado}"` }
    }

    await prisma.$transaction(async (tx) => {
      // Lock de caja y re-chequeo: evita avanzar el estado tras un cierre concurrente
      const rows = await tx.$queryRaw<{ id: number; estado: string }[]>`
        SELECT id, estado FROM "cajas" WHERE id = ${venta.caja.id} FOR UPDATE
      `
      if (!rows || rows.length === 0 || rows[0].estado !== 'abierta') {
        throw new ErrorDeNegocio('La caja se cerró, no se puede modificar la venta')
      }

      await tx.venta.update({
        where: { id: venta.id },
        data: { estadoVehiculo: datos.estado },
      })
    })

    revalidatePath('/caja')
    revalidatePath('/admin/ventas')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}