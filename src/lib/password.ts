import { z } from 'zod'

export const REQUISITOS_CONTRASENA =
  'Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número'

export const esquemaContrasena = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una letra mayúscula')
  .regex(/[a-z]/, 'Debe contener al menos una letra minúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')

export function contrasenaCumplePolitica(password: string): boolean {
  return esquemaContrasena.safeParse(password).success
}