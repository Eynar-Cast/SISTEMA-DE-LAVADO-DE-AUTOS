'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requerirCaja, obtenerIp } from '@/lib/session'
import { manejarError } from '@/lib/errores'

const schemaApertura = z.object({
  montoApertura: z.coerce.number().gte(0, 'El monto inicial no puede ser negativo'),
})

const schemaCierre = z.object({
  montoCierreReal: z.coerce.number().gte(0, 'El monto real no puede ser negativo'),
})

export type CajaResult =
  | { ok: true; cajaId: number }
  | { ok: false; error: string }

export async function abrirCaja(montoApertura: number): Promise<CajaResult> {
  try {
    const usuario = await requerirCaja()
    const { montoApertura: monto } = schemaApertura.parse({ montoApertura })
    const ip = await obtenerIp()

    const existente = await prisma.caja.findFirst({
      where: { usuarioId: usuario.id, estado: 'abierta' },
    })
    if (existente) {
      return { ok: false, error: 'Ya tienes una caja abierta para este turno' }
    }

    const caja = await prisma.$transaction(async (tx) => {
      const creada = await tx.caja.create({
        data: { usuarioId: usuario.id, montoApertura: monto, estado: 'abierta' },
      })
      await tx.auditoria.create({
        data: {
          usuarioId: usuario.id,
          accion: 'apertura_caja',
          tablaAfectada: 'cajas',
          valoresAnteriores: undefined,
          valoresNuevos: { id: creada.id, montoApertura: monto },
          ip,
        },
      })
      return creada
    })

    revalidatePath('/caja')
    revalidatePath('/admin/dashboard')
    return { ok: true, cajaId: caja.id }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}

export type CierreResult =
  | { ok: true; diferencia: number }
  | { ok: false; error: string }

export async function cerrarCaja(montoCierreReal: number): Promise<CierreResult> {
  try {
    const usuario = await requerirCaja()
    const { montoCierreReal: montoReal } = schemaCierre.parse({ montoCierreReal })
    const ip = await obtenerIp()

    const caja = await prisma.caja.findFirst({
      where: { usuarioId: usuario.id, estado: 'abierta' },
    })
    if (!caja) return { ok: false, error: 'No hay una caja abierta para cerrar' }

    const resultado = await prisma.$transaction(async (tx) => {
      const ventas = await tx.venta.aggregate({
        where: { cajaId: caja.id },
        _sum: { total: true },
      })
      const ventasEfectivo = await tx.venta.aggregate({
        where: { cajaId: caja.id, metodoPago: 'efectivo' },
        _sum: { total: true },
      })
      const gastos = await tx.gasto.aggregate({
        where: { cajaId: caja.id, estado: 'activo' },
        _sum: { monto: true },
      })

      const ingresosTotales = ventas._sum.total?.toNumber() ?? 0
      const ingresosEfectivo = ventasEfectivo._sum.total?.toNumber() ?? 0
      const egresos = gastos._sum.monto?.toNumber() ?? 0
      const sistema = caja.montoApertura.toNumber() + ingresosEfectivo - egresos
      const diferencia = montoReal - sistema

      const cerrada = await tx.caja.update({
        where: { id: caja.id },
        data: {
          estado: 'cerrada',
          fechaCierre: new Date(),
          montoCierreSistema: sistema,
          montoCierreReal: montoReal,
          diferencia,
        },
      })

      await tx.auditoria.create({
        data: {
          usuarioId: usuario.id,
          accion: 'cierre_caja',
          tablaAfectada: 'cajas',
          valoresAnteriores: { estado: caja.estado },
          valoresNuevos: {
            id: cerrada.id,
            estado: cerrada.estado,
            montoCierreSistema: sistema,
            montoCierreReal: montoReal,
            diferencia,
          },
          ip,
        },
      })

      return { diferencia, ingresosTotales, ingresosEfectivo, egresos, sistema }
    })

    revalidatePath('/caja')
    revalidatePath('/admin/dashboard')
    return { ok: true, diferencia: resultado.diferencia }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}