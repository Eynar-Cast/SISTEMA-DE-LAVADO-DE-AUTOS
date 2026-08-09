import { z } from 'zod'

export function manejarError(e: unknown): string {
  if (e instanceof z.ZodError) {
    return e.issues.map((issue) => issue.message).join(', ')
  }
  if (e instanceof Error) return e.message
  return 'Ocurrió un error inesperado'
}