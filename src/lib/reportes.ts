import { prisma } from '@/lib/prisma'

function inicioDeDia(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  return d
}

function finDeDia(fecha: Date): Date {
  const d = new Date(fecha)
  d.setHours(23, 59, 59, 999)
  return d
}

export type ResumenDashboard = {
  vehiculosHoy: number
  ingresosHoy: number
  gastosHoy: number
  utilidadHoy: number
  cajasAbiertas: number
  topServicios: { nombre: string; cantidad: number; total: number }[]
}

export async function obtenerResumenDashboard(): Promise<ResumenDashboard> {
  const hoyDesde = inicioDeDia(new Date())
  const hoyHasta = finDeDia(new Date())

  const [
    vehiculosHoy,
    ingresos,
    gastos,
    cajasAbiertas,
    top,
  ] = await Promise.all([
    prisma.venta.count({
      where: { fecha: { gte: hoyDesde, lte: hoyHasta } },
    }),
    prisma.venta.aggregate({
      where: { fecha: { gte: hoyDesde, lte: hoyHasta } },
      _sum: { total: true },
    }),
    prisma.gasto.aggregate({
      where: { fecha: { gte: hoyDesde, lte: hoyHasta }, estado: 'activo' },
      _sum: { monto: true },
    }),
    prisma.caja.count({ where: { estado: 'abierta' } }),
    prisma.detalleVenta.groupBy({
      by: ['servicioId'],
      where: {
        venta: { fecha: { gte: hoyDesde, lte: hoyHasta } },
      },
      _sum: { cantidad: true, precioAplicado: true },
      orderBy: { _sum: { cantidad: 'desc' } },
      take: 5,
    }),
  ])

  const servicios = await prisma.servicio.findMany()
  const nombrePorId = new Map(servicios.map((s) => [s.id, s.nombre]))

  const ingresosHoy = ingresos._sum.total?.toNumber() ?? 0
  const gastosHoy = gastos._sum.monto?.toNumber() ?? 0

  return {
    vehiculosHoy,
    ingresosHoy,
    gastosHoy,
    utilidadHoy: ingresosHoy - gastosHoy,
    cajasAbiertas,
    topServicios: top.map((t) => ({
      nombre: nombrePorId.get(t.servicioId) ?? `Servicio #${t.servicioId}`,
      cantidad: t._sum.cantidad ?? 0,
      total: (t._sum.precioAplicado?.toNumber() ?? 0) * (t._sum.cantidad ?? 0),
    })),
  }
}

export type ReporteRango = {
  rango: { fecha: Date; cantidad: number; total: number }[]
  vehiculos: number
  ingresos: number
  egresos: number
  utilidad: number
  rankingServicio: { nombre: string; cantidad: number; total: number }[]
  porMetodoPago: { metodoPago: string; total: number; cantidad: number }[]
}

export async function obtenerReporteRango(
  fechaDesde: Date,
  fechaHasta: Date
): Promise<ReporteRango> {
  const desde = inicioDeDia(fechaDesde)
  const hasta = finDeDia(fechaHasta)

  const [ventas, gastos, ranking, porMetodo] = await Promise.all([
    prisma.venta.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
      select: { fecha: true, total: true },
      orderBy: { fecha: 'asc' },
    }),
    prisma.gasto.aggregate({
      where: { fecha: { gte: desde, lte: hasta }, estado: 'activo' },
      _sum: { monto: true },
    }),
    prisma.detalleVenta.groupBy({
      by: ['servicioId'],
      where: { venta: { fecha: { gte: desde, lte: hasta } } },
      _sum: { cantidad: true, precioAplicado: true },
      orderBy: { _sum: { cantidad: 'desc' } },
    }),
    prisma.venta.groupBy({
      by: ['metodoPago'],
      where: { fecha: { gte: desde, lte: hasta } },
      _sum: { total: true },
      _count: true,
    }),
  ])

  const servicios = await prisma.servicio.findMany()
  const nombrePorId = new Map(servicios.map((s) => [s.id, s.nombre]))

  const ingresos = ventas.reduce((acc, v) => acc + v.total.toNumber(), 0)
  const egresos = gastos._sum.monto?.toNumber() ?? 0

  const agrupado = new Map<string, { cantidad: number; total: number }>()
  for (const v of ventas) {
    const key = inicioDeDia(v.fecha).toISOString()
    const actual = agrupado.get(key) ?? { cantidad: 0, total: 0 }
    actual.cantidad += 1
    actual.total += v.total.toNumber()
    agrupado.set(key, actual)
  }

  return {
    rango: Array.from(agrupado.entries()).map(([iso, { cantidad, total }]) => ({
      fecha: new Date(iso),
      cantidad,
      total,
    })),
    vehiculos: ventas.length,
    ingresos,
    egresos,
    utilidad: ingresos - egresos,
    rankingServicio: ranking.map((r) => ({
      nombre: nombrePorId.get(r.servicioId) ?? `Servicio #${r.servicioId}`,
      cantidad: r._sum.cantidad ?? 0,
      total: (r._sum.precioAplicado?.toNumber() ?? 0) * (r._sum.cantidad ?? 0),
    })),
    porMetodoPago: porMetodo.map((m) => ({
      metodoPago: m.metodoPago,
      total: m._sum.total?.toNumber() ?? 0,
      cantidad: m._count,
    })),
  }
}

export type ResumenMensual = {
  actual: { etiqueta: string; vehiculos: number; ingresos: number; egresos: number; utilidad: number }
  anterior: { etiqueta: string; vehiculos: number; ingresos: number; egresos: number; utilidad: number }
}

export async function obtenerResumenMensual(): Promise<ResumenMensual> {
  const ahora = new Date()
  const mesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
  const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1)
  const mesSiguiente = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 1)

  async function calcular(
    fecha: Date,
    siguienteMes: Date
  ) {
    const [ventas, gastos] = await Promise.all([
      prisma.venta.aggregate({
        where: { fecha: { gte: fecha, lt: siguienteMes } },
        _count: true,
        _sum: { total: true },
      }),
      prisma.gasto.aggregate({
        where: { fecha: { gte: fecha, lt: siguienteMes }, estado: 'activo' },
        _sum: { monto: true },
      }),
    ])
    const ingresos = ventas._sum.total?.toNumber() ?? 0
    const egresos = gastos._sum.monto?.toNumber() ?? 0
    return {
      vehiculos: ventas._count,
      ingresos,
      egresos,
      utilidad: ingresos - egresos,
    }
  }

  const [actual, anterior] = await Promise.all([
    calcular(mesActual, mesSiguiente),
    calcular(mesAnterior, mesActual),
  ])

  const fmt = new Intl.DateTimeFormat('es-BO', { month: 'long', year: 'numeric' })
  return {
    actual: { ...actual, etiqueta: fmt.format(mesActual) },
    anterior: { ...anterior, etiqueta: fmt.format(mesAnterior) },
  }
}