import { prisma } from '@/lib/prisma'

// Límite del plan free de Neon: 0.5 GB por proyecto
const LIMITE_BYTES_FREE = 512 * 1024 * 1024

export type EstadoAlmacenamiento = {
  bytesUsados: number
  limiteBytes: number
  porcentaje: number
  nivel: 'ok' | 'atencion' | 'critico'
}

export async function obtenerEstadoAlmacenamiento(): Promise<EstadoAlmacenamiento> {
  const resultado = await prisma.$queryRaw<{ bytes: bigint }[]>`
    SELECT pg_database_size(current_database()) AS bytes
  `
  const bytesUsados = Number(resultado[0]?.bytes ?? 0)
  const porcentaje = Math.min(100, Math.round((bytesUsados / LIMITE_BYTES_FREE) * 1000) / 10)

  let nivel: EstadoAlmacenamiento['nivel'] = 'ok'
  if (porcentaje >= 85) nivel = 'critico'
  else if (porcentaje >= 60) nivel = 'atencion'

  return {
    bytesUsados,
    limiteBytes: LIMITE_BYTES_FREE,
    porcentaje,
    nivel,
  }
}

export function formatearBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}