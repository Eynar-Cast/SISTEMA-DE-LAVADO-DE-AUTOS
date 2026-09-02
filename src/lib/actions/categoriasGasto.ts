'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requerirAdmin } from '@/lib/session'
import { manejarError } from '@/lib/errores'

const schemaCrear = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
})

const schemaEditar = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(80),
})

const schemaId = z.object({
  id: z.number().int().positive('Categoría inválida'),
})

export type CategoriaGastoResult = { ok: true } | { ok: false; error: string }

export async function crearCategoriaGasto(input: {
  nombre: string
}): Promise<CategoriaGastoResult> {
  try {
    await requerirAdmin()
    const datos = schemaCrear.parse(input)

    const existe = await prisma.categoriaGasto.findUnique({
      where: { nombre: datos.nombre },
    })
    if (existe) return { ok: false, error: 'Ya existe una categoría con ese nombre' }

    await prisma.$transaction(async (tx) => {
      await tx.categoriaGasto.create({
        data: { nombre: datos.nombre },
      })
    })

    revalidatePath('/admin/categorias-gasto')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}

export async function actualizarCategoriaGasto(
  id: number,
  input: { nombre: string }
): Promise<CategoriaGastoResult> {
  try {
    await requerirAdmin()
    schemaId.parse({ id })
    const datos = schemaEditar.parse(input)

    const anterior = await prisma.categoriaGasto.findUnique({
      where: { id },
    })
    if (!anterior) return { ok: false, error: 'Categoría no encontrada' }

    const existe = await prisma.categoriaGasto.findUnique({
      where: { nombre: datos.nombre },
    })
    if (existe && existe.id !== id) {
      return { ok: false, error: 'Ya existe una categoría con ese nombre' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.categoriaGasto.update({
        where: { id },
        data: { nombre: datos.nombre },
      })
    })

    revalidatePath('/admin/categorias-gasto')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}

export async function eliminarCategoriaGasto(id: number): Promise<CategoriaGastoResult> {
  try {
    await requerirAdmin()
    schemaId.parse({ id })

    const categoria = await prisma.categoriaGasto.findUnique({
      where: { id },
      include: { gastos: { select: { id: true } } },
    })
    if (!categoria) return { ok: false, error: 'Categoría no encontrada' }

    if (categoria.gastos.length > 0) {
      return { ok: false, error: 'No se puede eliminar una categoría que tiene gastos asociados' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.categoriaGasto.delete({ where: { id } })
    })

    revalidatePath('/admin/categorias-gasto')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: manejarError(e) }
  }
}