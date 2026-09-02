'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requerirAdmin } from '@/lib/session'
import { manejarError } from '@/lib/errores'

const schemaServicio = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
  precio: z
    .coerce
    .number()
    .finite('El precio debe ser un número válido')
    .positive('El precio debe ser mayor a 0')
    .max(10_000_000, 'El precio es demasiado alto'),
})

const schemaIdServicio = z.object({
  id: z.number().int().positive('Servicio inválido'),
})

const schemaEstado = z.object({
  estado: z.enum(['activo', 'inactivo'], 'Estado inválido'),
})

export type ServicioResult = { ok: true } | { ok: false; error: string }

export async function crearServicio(input: {
  nombre: string
  precio: number
}): Promise<ServicioResult> {
  try {
    await requerirAdmin()
    const datos = schemaServicio.parse(input)

    await prisma.$transaction(async (tx) => {
      await tx.servicio.create({
        data: { nombre: datos.nombre, precio: datos.precio },
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
    await requerirAdmin()
    schemaIdServicio.parse({ id })
    const datos = schemaServicio.parse(input)

    const anterior = await prisma.servicio.findUnique({ where: { id } })
    if (!anterior) return { ok: false, error: 'Servicio no encontrado' }

    await prisma.$transaction(async (tx) => {
      await tx.servicio.update({
        where: { id },
        data: { nombre: datos.nombre, precio: datos.precio },
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
    await requerirAdmin()
    schemaIdServicio.parse({ id })
    schemaEstado.parse({ estado })

    const anterior = await prisma.servicio.findUnique({ where: { id } })
    if (!anterior) return { ok: false, error: 'Servicio no encontrado' }

    await prisma.$transaction(async (tx) => {
      await tx.servicio.update({
        where: { id },
        data: { estado },
      })
    })

    revalidatePath('/admin/servicios')
    revalidatePath('/caja')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}