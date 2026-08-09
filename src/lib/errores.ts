import { z } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * Convierte cualquier error a un mensaje seguro para el usuario.
 * - Zod: devuelve los mensajes de validación (esperados).
 * - Errores de negocio: devuelve su mensaje.
 * - Errores de base de datos / inesperados: mensaje genérico (no filtra
 *   detalles internos, rutas, credenciales ni stack traces al cliente).
 */
export function manejarError(e: unknown): string {
  if (e instanceof z.ZodError) {
    return e.issues.map((issue) => issue.message).join(', ')
  }
  if (e instanceof Error) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError ||
      e instanceof Prisma.PrismaClientValidationError ||
      e instanceof Prisma.PrismaClientInitializationError ||
      e instanceof Prisma.PrismaClientRustPanicError ||
      e instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return 'Ocurrió un error en la base de datos. Intente nuevamente.'
    }
    // Mensajes de negocio definidos por nosotros (throw new Error('...')).
    return e.message
  }
  return 'Ocurrió un error inesperado'
}