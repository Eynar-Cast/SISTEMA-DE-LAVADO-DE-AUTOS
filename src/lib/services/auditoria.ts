import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

interface RegistrarAuditoriaParams {
  usuarioId: number
  accion: string
  tablaAfectada: string
  valoresAnteriores: Prisma.InputJsonValue | null
  valoresNuevos: Prisma.InputJsonValue | null
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
      valoresAnteriores: valoresAnteriores ?? undefined,
      valoresNuevos: valoresNuevos ?? undefined,
      ip: ip ?? null,
    },
  })
}