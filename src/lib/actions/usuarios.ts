'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { requerirAdmin, obtenerIp } from '@/lib/session'
import { manejarError } from '@/lib/errores'
import { esquemaContrasena } from '@/lib/password'

const schemaCrear = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  email: z.string().email('Email inválido'),
  password: esquemaContrasena,
  rolId: z.number().int().positive('Seleccione un rol'),
})

const schemaEditar = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  email: z.string().email('Email inválido'),
  rolId: z.number().int().positive('Seleccione un rol'),
  password: z
    .string()
    .optional()
    .refine(
      (p) => !p || esquemaContrasena.safeParse(p).success,
      'La contraseña debe tener al menos 8 caracteres con mayúsculas, minúsculas y números'
    ),
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
          debeCambiarPassword: true,
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

    const anterior = await prisma.usuario.findUnique({
      where: { id },
      include: { rol: true },
    })
    if (!anterior) return { ok: false, error: 'Usuario no encontrado' }

    const nuevoRol = await prisma.rol.findUnique({ where: { id: datos.rolId } })
    if (!nuevoRol) return { ok: false, error: 'Rol no válido' }

    // No permitir que un admin se rebaje su propio privilegio
    if (admin.id === id && nuevoRol.nombre !== 'Administrador') {
      return { ok: false, error: 'No puede quitarse el rol de Administrador a sí mismo' }
    }

    // No permitir degradar al último administrador restante
    if (
      anterior.rol.nombre === 'Administrador' &&
      nuevoRol.nombre !== 'Administrador'
    ) {
      const totalAdmins = await prisma.usuario.count({
        where: { rol: { nombre: 'Administrador' }, estado: 'activo' },
      })
      if (totalAdmins <= 1) {
        return { ok: false, error: 'Debe existir al menos un administrador activo' }
      }
    }

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
          ...(passwordHash ? { passwordHash, debeCambiarPassword: true } : {}),
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

    const anterior = await prisma.usuario.findUnique({
      where: { id },
      include: { rol: true },
    })
    if (!anterior) return { ok: false, error: 'Usuario no encontrado' }

    if (estado === 'inactivo' && anterior.rol.nombre === 'Administrador') {
      const totalAdmins = await prisma.usuario.count({
        where: { rol: { nombre: 'Administrador' }, estado: 'activo' },
      })
      if (totalAdmins <= 1) {
        return { ok: false, error: 'No puede desactivar al último administrador activo' }
      }
    }

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