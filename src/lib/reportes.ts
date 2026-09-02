import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

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

export function fechaDesdeISO(iso: string | undefined): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  return new Date(y, m - 1, d)
}

async function agregarRanking(
  desde: Date,
  hasta: Date,
  limite: number | null
): Promise<{ nombre: string; cantidad: number; total: number }[]> {
  const filas = await prisma.$queryRaw<
    { nombre: string; cantidad: number; total: Prisma.Decimal }[]
  >`
    SELECT s.nombre AS nombre,
           SUM(dv.cantidad)::int AS cantidad,
           SUM(dv.cantidad * dv.precio_aplicado)::numeric AS total
    FROM "detalle_ventas" dv
    JOIN "ventas" v ON v.id = dv.venta_id
    JOIN "servicios" s ON s.id = dv.servicio_id
    WHERE v.fecha >= ${desde} AND v.fecha <= ${hasta}
    GROUP BY s.nombre
    ORDER BY cantidad DESC, total DESC
    LIMIT ${limite}
  `
  return filas.map((f) => ({
    nombre: f.nombre,
    cantidad: Number(f.cantidad),
    total: f.total.toNumber(),
  }))
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

  const [ventasHoy, gastos, cajasAbiertas, topServicios] = await Promise.all([
    prisma.venta.aggregate({
      where: { fecha: { gte: hoyDesde, lte: hoyHasta } },
      _count: true,
      _sum: { total: true },
    }),
    prisma.gasto.aggregate({
      where: { fecha: { gte: hoyDesde, lte: hoyHasta }, estado: 'activo' },
      _sum: { monto: true },
    }),
    prisma.caja.count({ where: { estado: 'abierta' } }),
    agregarRanking(hoyDesde, hoyHasta, 5),
  ])

  const ingresosHoy = ventasHoy._sum.total?.toNumber() ?? 0
  const gastosHoy = gastos._sum.monto?.toNumber() ?? 0
  const vehiculosHoy = ventasHoy._count

  return {
    vehiculosHoy,
    ingresosHoy,
    gastosHoy,
    utilidadHoy: ingresosHoy - gastosHoy,
    cajasAbiertas,
    topServicios,
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

  const [porDia, gastos, ranking, porMetodo] = await Promise.all([
    prisma.$queryRaw<
      { dia: string; cantidad: number; total: Prisma.Decimal }[]
    >`
      SELECT to_char(DATE_TRUNC('day', (v.fecha AT TIME ZONE 'America/La_Paz')), 'YYYY-MM-DD') AS dia,
             COUNT(*)::int AS cantidad,
             SUM(v.total)::numeric AS total
      FROM "ventas" v
      WHERE v.fecha >= ${desde} AND v.fecha <= ${hasta}
      GROUP BY dia
      ORDER BY dia ASC
    `,
    prisma.gasto.aggregate({
      where: { fecha: { gte: desde, lte: hasta }, estado: 'activo' },
      _sum: { monto: true },
    }),
    agregarRanking(desde, hasta, null),
    prisma.venta.groupBy({
      by: ['metodoPago'],
      where: { fecha: { gte: desde, lte: hasta } },
      _sum: { total: true },
      _count: true,
    }),
  ])

  const vehiculos = porDia.reduce((acc, d) => acc + Number(d.cantidad), 0)
  const ingresos = porDia.reduce((acc, d) => acc + d.total.toNumber(), 0)
  const egresos = gastos._sum.monto?.toNumber() ?? 0

  return {
    rango: porDia.map((d) => ({
      fecha: new Date(`${d.dia}T00:00:00`),
      cantidad: Number(d.cantidad),
      total: d.total.toNumber(),
    })),
    vehiculos,
    ingresos,
    egresos,
    utilidad: ingresos - egresos,
    rankingServicio: ranking.map((r) => ({
      nombre: r.nombre,
      cantidad: r.cantidad,
      total: r.total,
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

export type DetalleVentaReporte = {
  id: number
  numeroCorrelativo: number
  fecha: Date
  usuario: string
  metodoPago: string
  estadoVehiculo: string
  servicios: string
  total: number
}

export type DetalleGastoReporte = {
  id: number
  fecha: Date
  usuario: string
  categoria: string
  motivo: string
  monto: number
  estado: string
}

export type DetalleReporte = {
  ventas: DetalleVentaReporte[]
  gastos: DetalleGastoReporte[]
}

export async function obtenerDetalleReporte(
  fechaDesde: Date,
  fechaHasta: Date
): Promise<DetalleReporte> {
  const desde = inicioDeDia(fechaDesde)
  const hasta = finDeDia(fechaHasta)

  const [ventas, gastos] = await Promise.all([
    prisma.venta.findMany({
      where: { fecha: { gte: desde, lte: hasta } },
      include: {
        usuario: { select: { nombre: true } },
        detalleVentas: {
          include: { servicio: { select: { nombre: true } } },
        },
      },
      orderBy: { fecha: 'desc' },
    }),
    prisma.gasto.findMany({
      where: { fecha: { gte: desde, lte: hasta }, estado: 'activo' },
      include: {
        usuario: { select: { nombre: true } },
        categoriaGasto: { select: { nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    }),
  ])

  return {
    ventas: ventas.map((v) => ({
      id: v.id,
      numeroCorrelativo: v.numeroCorrelativo,
      fecha: v.fecha,
      usuario: v.usuario.nombre,
      metodoPago: v.metodoPago,
      estadoVehiculo: v.estadoVehiculo,
      servicios: v.detalleVentas.map((d) => d.servicio.nombre).join(', '),
      total: v.total.toNumber(),
    })),
    gastos: gastos.map((g) => ({
      id: g.id,
      fecha: g.fecha,
      usuario: g.usuario.nombre,
      categoria: g.categoriaGasto.nombre,
      motivo: g.motivo,
      monto: g.monto.toNumber(),
      estado: g.estado,
    })),
  }
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

export type DatosCaja = {
  totalAperturas: number
  totalCierresReales: number
  totalEgresos: number
  totalIngresos: number
  efectivoEsperado: number
  diferencia: number
  cajasAbiertas: number
}

export async function obtenerDatosCaja(
  fechaDesde: Date,
  fechaHasta: Date
): Promise<DatosCaja> {
  const desde = inicioDeDia(fechaDesde)
  const hasta = finDeDia(fechaHasta)

  const [aperturas, cierres, ingresos, egresos] = await Promise.all([
    prisma.caja.aggregate({
      where: { fechaApertura: { gte: desde, lte: hasta } },
      _sum: { montoApertura: true },
    }),
    prisma.caja.aggregate({
      where: { fechaApertura: { gte: desde, lte: hasta }, montoCierreReal: { not: null } },
      _sum: { montoCierreReal: true },
    }),
    prisma.venta.aggregate({
      where: { fecha: { gte: desde, lte: hasta } },
      _sum: { total: true },
    }),
    prisma.gasto.aggregate({
      where: { fecha: { gte: desde, lte: hasta }, estado: 'activo' },
      _sum: { monto: true },
    }),
  ])

  const totalAperturas = aperturas._sum.montoApertura?.toNumber() ?? 0
  const totalCierresReales = cierres._sum.montoCierreReal?.toNumber() ?? 0
  const totalIngresos = ingresos._sum.total?.toNumber() ?? 0
  const totalEgresos = egresos._sum.monto?.toNumber() ?? 0
  const cajasAbiertas = await prisma.caja.count({
    where: { estado: 'abierta', fechaApertura: { gte: desde, lte: hasta } },
  })

  const efectivoEsperado = totalAperturas + totalIngresos - totalEgresos
  const diferencia = totalCierresReales > 0 ? totalCierresReales - efectivoEsperado : 0

  return {
    totalAperturas,
    totalCierresReales,
    totalEgresos,
    totalIngresos,
    efectivoEsperado,
    diferencia,
    cajasAbiertas,
  }
}