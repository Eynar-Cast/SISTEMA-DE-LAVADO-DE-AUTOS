import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

interface RegistrarAuditoriaParams {
  usuarioId: number
  accion: string
  tablaAfectada: string
  valoresAnteriores: Record<string, unknown> | null
  valoresNuevos: Record<string, unknown> | null
  ip?: string
  tx?: Prisma.TransactionClient
}

export async function registrarAuditoria({
  usuarioId,
  accion,
  tablaAfectada,
  valoresAnteriores,
  valoresNuevos,
  ip,
  tx,
}: RegistrarAuditoriaParams) {
  const client = tx ?? prisma

  return client.auditoria.create({
    data: {
      usuarioId,
      accion,
      tablaAfectada,
      valoresAnteriores: valoresAnteriores as any,
      valoresNuevos: valoresNuevos as any,
      ip: ip ?? null,
    },
  })
}