import { prisma } from '@/lib/prisma'

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
}: {
  cajaId?: number
  fechaDesde?: Date
  fechaHasta?: Date
} = {}): Promise<VentaConDetalles[]> {
  const ventas = await prisma.venta.findMany({
    where: {
      ...(cajaId !== undefined ? { cajaId } : {}),
      ...(fechaDesde || fechaHasta
        ? {
            fecha: {
              ...(fechaDesde ? { gte: fechaDesde } : {}),
              ...(fechaHasta ? { lte: fechaHasta } : {}),
            },
          }
        : {}),
    },
    include: {
      caja: { select: { estado: true } },
      usuario: { select: { nombre: true } },
      detalleVentas: {
        include: { servicio: { select: { nombre: true } } },
      },
    },
    orderBy: { fecha: 'desc' },
    take: 500,
  })

  return ventas.map((v) => ({
    ...v,
    total: v.total.toNumber(),
    detalleVentas: v.detalleVentas.map((d) => ({
      ...d,
      precioAplicado: d.precioAplicado.toNumber(),
    })),
  }))
}

export async function listarGastos(
  criterios: { cajaId?: number; estado?: string } = {}
) {
  const gastos = await prisma.gasto.findMany({
    where: {
      ...(criterios.cajaId !== undefined ? { cajaId: criterios.cajaId } : {}),
      ...(criterios.estado ? { estado: criterios.estado } : {}),
    },
    include: {
      categoriaGasto: { select: { nombre: true } },
      caja: { select: { estado: true } },
      usuario: { select: { nombre: true } },
    },
    orderBy: { fecha: 'desc' },
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

export async function listarUsuarios() {
  const usuarios = await prisma.usuario.findMany({
    include: { rol: { select: { nombre: true } } },
    orderBy: { createdAt: 'asc' },
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

export async function obtenerUltimaAuditoria(limit = 50) {
  const registros = await prisma.auditoria.findMany({
    include: { usuario: { select: { nombre: true, email: true } } },
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
  return registros.map((r) => ({
    id: r.id,
    usuarioId: r.usuarioId,
    usuarioNombre: r.usuario.nombre,
    accion: r.accion,
    tablaAfectada: r.tablaAfectada,
    valoresAnteriores: r.valoresAnteriores,
    valoresNuevos: r.valoresNuevos,
    ip: r.ip,
    timestamp: r.timestamp,
  }))
}