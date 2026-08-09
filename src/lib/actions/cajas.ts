'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requerirCaja, obtenerIp } from '@/lib/session'
import { manejarError } from '@/lib/errores'
import { Prisma } from '@prisma/client'

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

    const resultado = await prisma.$transaction(
      async (tx) => {
        // Serializa la operación por usuario para evitar doble apertura
        const rows = await tx.$queryRaw<{ id: number }[]>`
          SELECT id FROM "usuarios" WHERE id = ${usuario.id} FOR UPDATE
        `
        if (!rows || rows.length === 0) {
          throw new Error('Usuario no encontrado')
        }

        const existente = await tx.caja.findFirst({
          where: { usuarioId: usuario.id, estado: 'abierta' },
        })
        if (existente) {
          return { yaAbierta: true, cajaId: null as number | null }
        }

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
        return { yaAbierta: false, cajaId: creada.id }
      },
      {
        timeout: 15000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    )

    if (resultado.yaAbierta) {
      return { ok: false, error: 'Ya tienes una caja abierta para este turno' }
    }

    revalidatePath('/caja')
    revalidatePath('/admin/dashboard')
    return { ok: true, cajaId: resultado.cajaId! }
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

    const resultado = await prisma.$transaction(
      async (tx) => {
        // Lock de fila para impedir un doble cierre simultáneo
        const rows = await tx.$queryRaw<{ id: number }[]>`
          SELECT id FROM "cajas" WHERE id = ${caja.id} FOR UPDATE
        `
        if (!rows || rows.length === 0) {
          throw new Error('La caja ya no está disponible')
        }

        const sigueAbierta = await tx.caja.findFirst({
          where: { id: caja.id, estado: 'abierta' },
          select: { id: true },
        })
        if (!sigueAbierta) {
          return { yaCerrada: true, diferencia: 0 }
        }

        const ventasEfectivo = await tx.venta.aggregate({
          where: { cajaId: caja.id, metodoPago: 'efectivo' },
          _sum: { total: true },
        })
        const gastos = await tx.gasto.aggregate({
          where: { cajaId: caja.id, estado: 'activo' },
          _sum: { monto: true },
        })

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

        return { yaCerrada: false, diferencia }
      },
      {
        timeout: 60000,
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    )

    if (resultado.yaCerrada) {
      return { ok: false, error: 'La caja ya fue cerrada' }
    }

    revalidatePath('/caja')
    revalidatePath('/admin/dashboard')
    return { ok: true, diferencia: resultado.diferencia }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}