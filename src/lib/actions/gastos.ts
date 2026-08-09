'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requerirAdmin, requerirCaja, obtenerIp } from '@/lib/session'
import { manejarError } from '@/lib/errores'

const schemaRegistro = z.object({
  categoriaGastoId: z.number().int().positive('Seleccione una categorÃ­a'),
  monto: z.coerce.number().gt(0, 'El monto debe ser mayor a 0'),
  motivo: z.string().min(10, 'El motivo debe tener al menos 10 caracteres').max(300),
})

export type GastoResult = { ok: true; gastoId: number } | { ok: false; error: string }

export async function registrarGasto(input: {
  categoriaGastoId: number
  monto: number
  motivo: string
}): Promise<GastoResult> {
  try {
    const usuario = await requerirCaja()
    const datos = schemaRegistro.parse(input)
    const ip = await obtenerIp()

    const caja = await prisma.caja.findFirst({
      where: { usuarioId: usuario.id, estado: 'abierta' },
    })
    if (!caja) {
      return { ok: false, error: 'Debe abrir la caja antes de registrar gastos' }
    }

    const categoria = await prisma.categoriaGasto.findUnique({
      where: { id: datos.categoriaGastoId },
    })
    if (!categoria) return { ok: false, error: 'CategorÃ­a de gasto no vÃ¡lida' }

    const gasto = await prisma.$transaction(async (tx) => {
      const creado = await tx.gasto.create({
        data: {
          cajaId: caja.id,
          categoriaGastoId: datos.categoriaGastoId,
          usuarioId: usuario.id,
          monto: datos.monto,
          motivo: datos.motivo,
        },
      })
      await tx.auditoria.create({
        data: {
          usuarioId: usuario.id,
          accion: 'registrar_gasto',
          tablaAfectada: 'gastos',
          valoresAnteriores: undefined,
          valoresNuevos: {
            id: creado.id,
            cajaId: caja.id,
            monto: creado.monto.toString(),
            motivo: creado.motivo,
          },
          ip,
        },
      })
      return creado
    })

    revalidatePath('/caja')
    revalidatePath('/caja/gastos')
    revalidatePath('/admin/dashboard')
    return { ok: true, gastoId: gasto.id }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}

export type AnulacionResult = { ok: true } | { ok: false; error: string }

export async function solicitarAnulacionGasto(gastoId: number): Promise<AnulacionResult> {
  try {
    const usuario = await requerirCaja()
    const ip = await obtenerIp()

    const gasto = await prisma.gasto.findUnique({
      where: { id: gastoId },
      include: { caja: true },
    })
    if (!gasto) return { ok: false, error: 'Gasto no encontrado' }
    if (gasto.estado === 'anulado') return { ok: false, error: 'El gasto ya estÃ¡ anulado' }
    if (gasto.estado === 'pendiente_autorizacion') {
      return { ok: false, error: 'La anulaciÃ³n ya fue solicitada y estÃ¡ en espera' }
    }
    if (usuario.rol !== 'Administrador' && gasto.caja.usuarioId !== usuario.id) {
      return { ok: false, error: 'No puede anular gastos de otro turno' }
    }
    if (gasto.caja.estado !== 'abierta') {
      return { ok: false, error: 'La caja estÃ¡ cerrada, no se puede anular este gasto' }
    }

    const estadoDestino = usuario.rol === 'Administrador' ? 'anulado' : 'pendiente_autorizacion'
    const accion =
      usuario.rol === 'Administrador' ? 'anular_gasto' : 'solicitar_anulacion_gasto'

    await prisma.$transaction(async (tx) => {
      const actualizado = await tx.gasto.update({
        where: { id: gasto.id },
        data: { estado: estadoDestino },
      })
      await tx.auditoria.create({
        data: {
          usuarioId: usuario.id,
          accion,
          tablaAfectada: 'gastos',
          valoresAnteriores: { estado: gasto.estado },
          valoresNuevos: {
            id: actualizado.id,
            estado: actualizado.estado,
            solicitante: usuario.nombre,
          },
          ip,
        },
      })
    })

    revalidatePath('/caja')
    revalidatePath('/caja/gastos')
    revalidatePath('/admin/gastos')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}

export async function resolverAnulacionGasto(
  gastoId: number,
  aprobar: boolean
): Promise<AnulacionResult> {
  try {
    const admin = await requerirAdmin()
    const ip = await obtenerIp()

    const gasto = await prisma.gasto.findUnique({ where: { id: gastoId } })
    if (!gasto) return { ok: false, error: 'Gasto no encontrado' }
    if (gasto.estado !== 'pendiente_autorizacion') {
      return { ok: false, error: 'Este gasto no tiene una anulaciÃ³n pendiente' }
    }

    const estadoDestino = aprobar ? 'anulado' : 'activo'
    const accion = aprobar ? 'autorizar_anulacion_gasto' : 'rechazar_anulacion_gasto'

    await prisma.$transaction(async (tx) => {
      const actualizado = await tx.gasto.update({
        where: { id: gasto.id },
        data: { estado: estadoDestino },
      })
      await tx.auditoria.create({
        data: {
          usuarioId: admin.id,
          accion,
          tablaAfectada: 'gastos',
          valoresAnteriores: { estado: gasto.estado },
          valoresNuevos: {
            id: actualizado.id,
            estado: actualizado.estado,
            autorizadoPor: admin.nombre,
          },
          ip,
        },
      })
    })

    revalidatePath('/admin/gastos')
    revalidatePath('/caja/gastos')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}