'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requerirAdmin, obtenerIp } from '@/lib/session'
import { manejarError } from '@/lib/errores'

const schemaServicio = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  precio: z.coerce.number().positive('El precio debe ser mayor a 0'),
})

export type ServicioResult = { ok: true } | { ok: false; error: string }

export async function crearServicio(input: {
  nombre: string
  precio: number
}): Promise<ServicioResult> {
  try {
    const usuario = await requerirAdmin()
    const datos = schemaServicio.parse(input)
    const ip = await obtenerIp()

    await prisma.$transaction(async (tx) => {
      const creado = await tx.servicio.create({
        data: { nombre: datos.nombre, precio: datos.precio },
      })
      await tx.auditoria.create({
        data: {
          usuarioId: usuario.id,
          accion: 'crear_servicio',
          tablaAfectada: 'servicios',
          valoresAnteriores: undefined,
          valoresNuevos: {
            id: creado.id,
            nombre: creado.nombre,
            precio: creado.precio.toString(),
          },
          ip,
        },
      })
    })

    revalidatePath('/admin/servicios')
    revalidatePath('/caja')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}

export async function actualizarServicio(
  id: number,
  input: { nombre: string; precio: number }
): Promise<ServicioResult> {
  try {
    const usuario = await requerirAdmin()
    const datos = schemaServicio.parse(input)
    const ip = await obtenerIp()

    const anterior = await prisma.servicio.findUnique({ where: { id } })
    if (!anterior) return { ok: false, error: 'Servicio no encontrado' }

    await prisma.$transaction(async (tx) => {
      const editado = await tx.servicio.update({
        where: { id },
        data: { nombre: datos.nombre, precio: datos.precio },
      })
      await tx.auditoria.create({
        data: {
          usuarioId: usuario.id,
          accion: 'editar_servicio',
          tablaAfectada: 'servicios',
          valoresAnteriores: {
            nombre: anterior.nombre,
            precio: anterior.precio.toString(),
          },
          valoresNuevos: {
            nombre: editado.nombre,
            precio: editado.precio.toString(),
          },
          ip,
        },
      })
    })

    revalidatePath('/admin/servicios')
    revalidatePath('/caja')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}

export async function cambiarEstadoServicio(
  id: number,
  estado: 'activo' | 'inactivo'
): Promise<ServicioResult> {
  try {
    const usuario = await requerirAdmin()
    const ip = await obtenerIp()

    const anterior = await prisma.servicio.findUnique({ where: { id } })
    if (!anterior) return { ok: false, error: 'Servicio no encontrado' }

    await prisma.$transaction(async (tx) => {
      const editado = await tx.servicio.update({
        where: { id },
        data: { estado },
      })
      await tx.auditoria.create({
        data: {
          usuarioId: usuario.id,
          accion: estado === 'activo' ? 'activar_servicio' : 'desactivar_servicio',
          tablaAfectada: 'servicios',
          valoresAnteriores: { estado: anterior.estado },
          valoresNuevos: { estado: editado.estado, nombre: editado.nombre },
          ip,
        },
      })
    })

    revalidatePath('/admin/servicios')
    revalidatePath('/caja')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}