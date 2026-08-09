import { z } from 'zod'
import { Prisma } from '@prisma/client'

/**
 * Error de negocio con mensaje seguro y redactado para mostrarse al usuario.
 * Solo los errores de este tipo exponen su mensaje al cliente; cualquier otro
 * error se convierte en un mensaje genérico para no filtrar internals
 * (stack traces, SQL, rutas ni credenciales).
 */
export class ErrorDeNegocio extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ErrorDeNegocio'
  }
}

/**
 * Convierte cualquier error a un mensaje seguro para el usuario.
 * - Zod: devuelve los mensajes de validación (esperados).
 * - ErrorDeNegocio: devuelve su mensaje (definido y redactado por nosotros).
 * - Errores de base de datos / inesperados: mensaje genérico (no filtra
 *   detalles internos, stack traces, SQL ni credenciales al cliente).
 */
export function manejarError(e: unknown): string {
  if (e instanceof z.ZodError) {
    return e.issues.map((issue) => issue.message).join(', ')
  }
  if (e instanceof ErrorDeNegocio) {
    return e.message
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
  }
  return 'Ocurrió un error inesperado. Intente nuevamente.'
}