import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

function finDeDia(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(23, 59, 59, 999)
  return d
}

export type OrdenVentas = 'fecha_desc' | 'fecha_asc' | 'correlativo_desc' | 'total_desc'

export type OrdenGastos = 'fecha_desc' | 'fecha_asc' | 'monto_desc' | 'monto_asc'

export type OrdenUsuarios = 'creado_desc' | 'creado_asc' | 'nombre_asc' | 'rol_asc'

export type ServicioItem = {
  id: number
  nombre: string
  precio: number
  estado: string
  createdAt: Date
  updatedAt: Date
}

export async function listarServicios({
  soloActivos = false,
}: { soloActivos?: boolean } = {}): Promise<ServicioItem[]> {
  const servicios = await prisma.servicio.findMany({
    where: soloActivos ? { estado: 'activo' } : undefined,
    orderBy: { nombre: 'asc' },
  })
  return servicios.map((s) => ({
    ...s,
    precio: s.precio.toNumber(),
  }))
}

export async function obtenerCajaActiva(usuarioId: number) {
  return prisma.caja.findFirst({
    where: { usuarioId, estado: 'abierta' },
    include: {
      ventas: {
        include: { detalleVentas: { include: { servicio: true } } },
        orderBy: { numeroCorrelativo: 'desc' },
      },
      gastos: { include: { categoriaGasto: true }, orderBy: { fecha: 'desc' } },
    },
  })
}

export type VentaConDetalles = {
  id: number
  cajaId: number
  numeroCorrelativo: number
  usuarioId: number
  fecha: Date
  estadoVehiculo: string
  metodoPago: string
  total: number
  cliente: string | null
  placa: string | null
  createdAt: Date
  caja: { estado: string }
  usuario: { nombre: string }
  detalleVentas: {
    id: number
    precioAplicado: number
    cantidad: number
    servicio: { nombre: string }
  }[]
}

export async function listarVentas({
  cajaId,
  fechaDesde,
  fechaHasta,
  cliente,
  placa,
  orden = 'fecha_desc',
}: {
  cajaId?: number
  fechaDesde?: Date
  fechaHasta?: Date
  cliente?: string
  placa?: string
  orden?: OrdenVentas
} = {}): Promise<VentaConDetalles[]> {
  const orderBy: Record<OrdenVentas, Prisma.VentaOrderByWithRelationInput> = {
    fecha_desc: { fecha: 'desc' },
    fecha_asc: { fecha: 'asc' },
    correlativo_desc: { numeroCorrelativo: 'desc' },
    total_desc: { total: 'desc' },
  }

  const ventas = await prisma.venta.findMany({
    where: {
      ...(cajaId !== undefined ? { cajaId } : {}),
      ...(fechaDesde || fechaHasta
        ? {
            fecha: {
              ...(fechaDesde ? { gte: fechaDesde } : {}),
              ...(fechaHasta ? { lte: finDeDia(fechaHasta) } : {}),
            },
          }
        : {}),
      ...(cliente && cliente.trim() ? { cliente: { contains: cliente, mode: 'insensitive' } } : {}),
      ...(placa && placa.trim() ? { placa: { contains: placa, mode: 'insensitive' } } : {}),
    },
    include: {
      caja: { select: { estado: true } },
      usuario: { select: { nombre: true } },
      detalleVentas: {
        include: { servicio: { select: { nombre: true } } },
      },
    },
    orderBy: orderBy[orden],
    take: 500,
  })

  return ventas.map((v) => ({
    ...v,
    total: v.total.toNumber(),
    cliente: v.cliente,
    placa: v.placa,
    detalleVentas: v.detalleVentas.map((d) => ({
      ...d,
      precioAplicado: d.precioAplicado.toNumber(),
    })),
  }))
}

export async function listarGastos(
  criterios: {
    cajaId?: number
    estado?: string
    fechaDesde?: Date
    fechaHasta?: Date
    orden?: OrdenGastos
  } = {}
) {
  const {
    cajaId,
    estado,
    fechaDesde,
    fechaHasta,
    orden = 'fecha_desc',
  } = criterios
  const orderBy: Record<OrdenGastos, Prisma.GastoOrderByWithRelationInput> = {
    fecha_desc: { fecha: 'desc' },
    fecha_asc: { fecha: 'asc' },
    monto_desc: { monto: 'desc' },
    monto_asc: { monto: 'asc' },
  }
  const gastos = await prisma.gasto.findMany({
    where: {
      ...(cajaId !== undefined ? { cajaId } : {}),
      ...(estado ? { estado } : {}),
      ...(fechaDesde || fechaHasta
        ? {
            fecha: {
              ...(fechaDesde ? { gte: fechaDesde } : {}),
              ...(fechaHasta ? { lte: finDeDia(fechaHasta) } : {}),
            },
          }
        : {}),
    },
    include: {
      categoriaGasto: { select: { nombre: true } },
      caja: { select: { estado: true } },
      usuario: { select: { nombre: true } },
    },
    orderBy: orderBy[orden],
    take: 500,
  })

  return gastos.map((g) => ({ ...g, monto: g.monto.toNumber() }))
}

export async function listarCajas({ incluirCerradas = true } = {}) {
  const cajas = await prisma.caja.findMany({
    where: incluirCerradas ? undefined : { estado: 'abierta' },
    include: { usuario: { select: { nombre: true } } },
    orderBy: { fechaApertura: 'desc' },
  })
  return cajas.map((c) => ({
    ...c,
    montoApertura: c.montoApertura.toNumber(),
    montoCierreSistema: c.montoCierreSistema?.toNumber() ?? null,
    montoCierreReal: c.montoCierreReal?.toNumber() ?? null,
    diferencia: c.diferencia?.toNumber() ?? null,
  }))
}

export async function listarUsuarios({
  fechaDesde,
  fechaHasta,
  orden = 'creado_asc',
}: {
  fechaDesde?: Date
  fechaHasta?: Date
  orden?: OrdenUsuarios
} = {}) {
  const orderBy: Record<OrdenUsuarios, Prisma.UsuarioOrderByWithRelationInput> = {
    creado_desc: { createdAt: 'desc' },
    creado_asc: { createdAt: 'asc' },
    nombre_asc: { nombre: 'asc' },
    rol_asc: { rol: { nombre: 'asc' } },
  }
  const usuarios = await prisma.usuario.findMany({
    where: {
      ...(fechaDesde || fechaHasta
        ? {
            createdAt: {
              ...(fechaDesde ? { gte: fechaDesde } : {}),
              ...(fechaHasta ? { lte: finDeDia(fechaHasta) } : {}),
            },
          }
        : {}),
    },
    include: { rol: { select: { nombre: true } } },
    orderBy: orderBy[orden],
  })
  return usuarios.map((u) => ({
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol.nombre,
    estado: u.estado,
    createdAt: u.createdAt,
  }))
}

export async function listarCategoriasGasto() {
  return prisma.categoriaGasto.findMany({ orderBy: { nombre: 'asc' } })
}

export async function listarRoles() {
  return prisma.rol.findMany({ orderBy: { id: 'asc' } })
}