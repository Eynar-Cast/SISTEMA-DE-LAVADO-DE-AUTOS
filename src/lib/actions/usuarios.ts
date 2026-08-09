'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requerirAdmin, obtenerIp } from '@/lib/session'
import { manejarError } from '@/lib/errores'

const schemaCrear = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  email: z.string().email('Email invÃ¡lido'),
  password: z.string().min(8, 'La contraseÃ±a debe tener al menos 8 caracteres'),
  rolId: z.number().int().positive('Seleccione un rol'),
})

const schemaEditar = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  email: z.string().email('Email invÃ¡lido'),
  rolId: z.number().int().positive('Seleccione un rol'),
  password: z.string().optional().refine((p) => !p || p.length >= 8, {
    message: 'La contraseÃ±a debe tener al menos 8 caracteres',
  }),
})

export type UsuarioResult = { ok: true } | { ok: false; error: string }

export async function crearUsuario(input: {
  nombre: string
  email: string
  password: string
  rolId: number
}): Promise<UsuarioResult> {
  try {
    const admin = await requerirAdmin()
    const datos = schemaCrear.parse(input)
    const ip = await obtenerIp()

    const existe = await prisma.usuario.findUnique({ where: { email: datos.email } })
    if (existe) return { ok: false, error: 'Ya existe un usuario con ese email' }

    const passwordHash = await bcrypt.hash(datos.password, 10)

    await prisma.$transaction(async (tx) => {
      const creado = await tx.usuario.create({
        data: {
          nombre: datos.nombre,
          email: datos.email,
          passwordHash,
          rolId: datos.rolId,
          estado: 'activo',
        },
      })
      await tx.auditoria.create({
        data: {
          usuarioId: admin.id,
          accion: 'crear_usuario',
          tablaAfectada: 'usuarios',
          valoresAnteriores: undefined,
          valoresNuevos: { id: creado.id, nombre: creado.nombre, email: creado.email, rolId: creado.rolId },
          ip,
        },
      })
    })

    revalidatePath('/admin/usuarios')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}

export async function actualizarUsuario(
  id: number,
  input: { nombre: string; email: string; rolId: number; password?: string }
): Promise<UsuarioResult> {
  try {
    const admin = await requerirAdmin()
    const datos = schemaEditar.parse(input)
    const ip = await obtenerIp()

    const anterior = await prisma.usuario.findUnique({ where: { id } })
    if (!anterior) return { ok: false, error: 'Usuario no encontrado' }

    const existeOtro = await prisma.usuario.findFirst({
      where: { email: datos.email, NOT: { id } },
    })
    if (existeOtro) return { ok: false, error: 'Ya existe otro usuario con ese email' }

    const passwordHash = datos.password ? await bcrypt.hash(datos.password, 10) : undefined

    await prisma.$transaction(async (tx) => {
      const actualizado = await tx.usuario.update({
        where: { id },
        data: {
          nombre: datos.nombre,
          email: datos.email,
          rolId: datos.rolId,
          ...(passwordHash ? { passwordHash } : {}),
        },
      })
      await tx.auditoria.create({
        data: {
          usuarioId: admin.id,
          accion: 'editar_usuario',
          tablaAfectada: 'usuarios',
          valoresAnteriores: {
            nombre: anterior.nombre,
            email: anterior.email,
            rolId: anterior.rolId,
          },
          valoresNuevos: {
            nombre: actualizado.nombre,
            email: actualizado.email,
            rolId: actualizado.rolId,
          },
          ip,
        },
      })
    })

    revalidatePath('/admin/usuarios')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}

export async function cambiarEstadoUsuario(
  id: number,
  estado: 'activo' | 'inactivo'
): Promise<UsuarioResult> {
  try {
    const admin = await requerirAdmin()
    if (admin.id === id) {
      return { ok: false, error: 'No puede desactivar su propio usuario' }
    }
    const ip = await obtenerIp()

    const anterior = await prisma.usuario.findUnique({ where: { id } })
    if (!anterior) return { ok: false, error: 'Usuario no encontrado' }

    await prisma.$transaction(async (tx) => {
      const actualizado = await tx.usuario.update({ where: { id }, data: { estado } })
      await tx.auditoria.create({
        data: {
          usuarioId: admin.id,
          accion: estado === 'activo' ? 'activar_usuario' : 'desactivar_usuario',
          tablaAfectada: 'usuarios',
          valoresAnteriores: { estado: anterior.estado, email: anterior.email },
          valoresNuevos: {
            estado: actualizado.estado,
            email: actualizado.email,
          },
          ip,
        },
      })
    })

    revalidatePath('/admin/usuarios')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}