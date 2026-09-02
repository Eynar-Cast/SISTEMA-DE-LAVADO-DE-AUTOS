'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { obtenerSesion } from '@/lib/session'
import { manejarError } from '@/lib/errores'
import { esquemaContrasena } from '@/lib/password'

const schemaCambio = z.object({
  passwordActual: z.string().min(1, 'Ingrese su contraseña actual'),
  nuevaPassword: esquemaContrasena,
})

export type CambiarContrasenaResult = { ok: true } | { ok: false; error: string }

export async function cambiarMiContrasena(input: {
  passwordActual: string
  nuevaPassword: string
}): Promise<CambiarContrasenaResult> {
  try {
    const { usuario } = await obtenerSesion()
    if (!usuario) return { ok: false, error: 'No autorizado: inicie sesión' }

    const datos = schemaCambio.parse(input)

    const actual = await prisma.usuario.findUnique({
      where: { id: usuario.id },
      select: { passwordHash: true },
    })
    if (!actual) return { ok: false, error: 'Usuario no encontrado' }

    const validaActual = await bcrypt.compare(datos.passwordActual, actual.passwordHash)
    if (!validaActual) {
      return { ok: false, error: 'La contraseña actual no es correcta' }
    }
    if (datos.passwordActual === datos.nuevaPassword) {
      return { ok: false, error: 'La nueva contraseña debe ser diferente a la actual' }
    }

    const nuevaPasswordHash = await bcrypt.hash(datos.nuevaPassword, 10)

    await prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: usuario.id },
        data: { passwordHash: nuevaPasswordHash, debeCambiarPassword: false },
      })
    })

    revalidatePath('/')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}