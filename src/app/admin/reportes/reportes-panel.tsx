'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ReporteRango, ResumenMensual, DetalleReporte } from '@/lib/reportes'
import {
  formatearMoneda,
  formatearFecha,
  TEXTO_METODO_PAGO,
  TEXTO_ESTADO_VEHICULO,
  TEXTO_ESTADO_GASTO,
} from '@/lib/format'
import { exportarExcel, type HojaExporte } from '@/lib/excel'
import {
  inputCls,
  cardCls,
  cardHeaderCls,
  btnPrimarioCls,
  btnExitoCls,
  thCls,
  tdCls,
  tablaCls,
} from '@/components/ui'

type Orden = 'fecha_asc' | 'fecha_desc' | 'monto_desc'

function fechaCorta(d: Date): string {
  return d.toLocaleDateString('es-BO')
}

function fechaLegibleDesdeISO(iso: string): string {
  if (!iso) return ''
  const [a, m, d] = iso.split('-').map(Number)
  if (!Number.isFinite(a) || !Number.isFinite(m) || !Number.isFinite(d)) return iso
  return new Date(a, m - 1, d).toLocaleDateString('es-BO')
}

export function ReportesPanel({
  reporte,
  detalle,
  mensual,
}: {
  reporte: ReporteRango
  detalle: DetalleReporte
  mensual: ResumenMensual
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [desde, setDesde] = useState(() => searchParams.get('desde') ?? '')
  const [hasta, setHasta] = useState(() => searchParams.get('hasta') ?? '')
  const [orden, setOrden] = useState<Orden>('fecha_asc')
  const [busqueda, setBusqueda] = useState('')
  const [exportando, setExportando] = useState(false)
  const [msgExport, setMsgExport] = useState<string | null>(null)

  const termino = busqueda.trim().toLowerCase()

  const aplicado = useMemo(() => {
    const d = searchParams.get('desde')
    const h = searchParams.get('hasta')
    return { desde: d ?? '', hasta: h ?? '' }
  }, [searchParams])

  function aplicar(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    router.push(`/admin/reportes?${params.toString()}`)
  }

  const rango = useMemo(() => {
    const filas = [...reporte.rango]
    if (orden === 'fecha_desc') filas.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
    else if (orden === 'monto_desc') filas.sort((a, b) => b.total - a.total)
    else filas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    if (!termino) return filas
    return filas.filter((f) => `${fechaCorta(f.fecha)} ${f.cantidad}`.toLowerCase().includes(termino))
  }, [reporte.rango, orden, termino])

  const ranking = useMemo(() => {
    if (!termino) return reporte.rankingServicio
    return reporte.rankingServicio.filter((s) => s.nombre.toLowerCase().includes(termino))
  }, [reporte.rankingServicio, termino])

  const metodos = useMemo(() => {
    if (!termino) return reporte.porMetodoPago
    return reporte.porMetodoPago.filter((m) =>
      (TEXTO_METODO_PAGO[m.metodoPago] ?? m.metodoPago).toLowerCase().includes(termino)
    )
  }, [reporte.porMetodoPago, termino])

  const rangoExportar = useMemo(() => {
    const filas = [...reporte.rango]
    filas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
    return filas
  }, [reporte.rango])

  const utilidad = reporte.utilidad

  const fichas = [
    {
      titulo: 'Total ventas',
      valor: formatearMoneda(reporte.ingresos),
      icono: '+',
      iconoCls: 'bg-emerald-500',
      textoCls: 'text-emerald-700 dark:text-emerald-300',
    },
    {
      titulo: 'Total gastos',
      valor: formatearMoneda(reporte.egresos),
      icono: '−',
      iconoCls: 'bg-amber-500',
      textoCls: 'text-amber-700 dark:text-amber-300',
    },
    {
      titulo: 'Utilidad',
      valor: formatearMoneda(reporte.utilidad),
      icono: utilidad >= 0 ? '+' : '−',
      iconoCls: utilidad >= 0 ? 'bg-teal-500' : 'bg-rose-500',
      textoCls: utilidad >= 0 ? 'text-teal-700 dark:text-teal-300' : 'text-rose-700 dark:text-rose-300',
    },
    {
      titulo: 'N° de ventas',
      valor: String(reporte.vehiculos),
      icono: '#',
      iconoCls: 'bg-sky-500',
      textoCls: 'text-sky-700 dark:text-sky-300',
    },
  ]

  function construirHojas(): HojaExporte[] {
    const hojas: HojaExporte[] = []

    hojas.push({
      nombre: 'Resumen',
      prefacio: [
        ['Reporte del sistema de lavado de autos'],
        ['Período', `${fechaLegibleDesdeISO(aplicado.desde) || '—'} — ${fechaLegibleDesdeISO(aplicado.hasta) || '—'}`],
        ['Generado', new Date().toLocaleString('es-BO')],
        [],
      ],
      encabezados: ['Indicador', 'Valor'],
      filas: [
        ['N° de ventas', reporte.vehiculos],
        ['Total ventas', reporte.ingresos],
        ['Total gastos', reporte.egresos],
        ['Utilidad', reporte.utilidad],
      ],
      columnasMoneda: [1],
      congelar: false,
    })

    if (rangoExportar.length > 0) {
      hojas.push({
        nombre: 'Ventas por día',
        encabezados: ['Día', 'Vehículos', 'Total'],
        filas: rangoExportar.map((f) => [fechaCorta(f.fecha), f.cantidad, f.total]),
        columnasMoneda: [2],
        congelar: true,
      })
    }

    if (detalle.ventas.length > 0) {
      hojas.push({
        nombre: 'Detalle de ventas',
        encabezados: ['N°', 'Fecha', 'Usuario', 'Método de pago', 'Estado del vehículo', 'Servicios', 'Total'],
        filas: detalle.ventas.map((v) => [
          v.id,
          formatearFecha(v.fecha),
          v.usuario,
          TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago,
          TEXTO_ESTADO_VEHICULO[v.estadoVehiculo] ?? v.estadoVehiculo,
          v.servicios,
          v.total,
        ]),
        columnasMoneda: [6],
        congelar: true,
      })
    }

    if (detalle.gastos.length > 0) {
      hojas.push({
        nombre: 'Detalle de gastos',
        encabezados: ['N°', 'Fecha', 'Usuario', 'Categoría', 'Motivo', 'Monto', 'Estado'],
        filas: detalle.gastos.map((g) => [
          g.id,
          formatearFecha(g.fecha),
          g.usuario,
          g.categoria,
          g.motivo,
          g.monto,
          TEXTO_ESTADO_GASTO[g.estado] ?? g.estado,
        ]),
        columnasMoneda: [5],
        congelar: true,
      })
    }

    if (reporte.rankingServicio.length > 0) {
      hojas.push({
        nombre: 'Ranking de servicios',
        encabezados: ['Servicio', 'Cantidad', 'Total'],
        filas: reporte.rankingServicio.map((s) => [s.nombre, s.cantidad, s.total]),
        columnasMoneda: [2],
        congelar: true,
      })
    }

    if (reporte.porMetodoPago.length > 0) {
      hojas.push({
        nombre: 'Métodos de pago',
        encabezados: ['Método de pago', 'Ventas', 'Total'],
        filas: reporte.porMetodoPago.map((m) => [
          TEXTO_METODO_PAGO[m.metodoPago] ?? m.metodoPago,
          m.cantidad,
          m.total,
        ]),
        columnasMoneda: [2],
        congelar: true,
      })
    }

    return hojas
  }

  async function exportar() {
    if (exportando) return
    setExportando(true)
    setMsgExport(null)
    try {
      const hayDatos =
        reporte.vehiculos > 0 || detalle.ventas.length > 0 || detalle.gastos.length > 0
      if (!hayDatos) {
        setMsgExport('No hay datos en el rango seleccionado para exportar.')
        return
      }
      const res = await exportarExcel(construirHojas())
      if (res.ok) setMsgExport('Reporte exportado como reporte-lavado.xlsx.')
      else setMsgExport(res.motivo ?? 'No se pudo exportar el reporte.')
    } catch {
      setMsgExport('Ocurrió un error al exportar el reporte.')
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={aplicar} className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} />
        </div>
        <div className="w-full sm:w-44">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputCls} />
        </div>
        <div className="w-full sm:w-56">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Ordenar por</label>
          <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)} className={inputCls}>
            <option value="fecha_asc">Fecha (antigua primero)</option>
            <option value="fecha_desc">Fecha (reciente primero)</option>
            <option value="monto_desc">Monto (mayor primero)</option>
          </select>
        </div>
        <div className="w-full flex-1 sm:min-w-56">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Buscar</label>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Filtrar día, servicio o método…"
            className={inputCls}
          />
        </div>
        <button type="submit" className={btnPrimarioCls}>
          Consultar
        </button>
        <button type="button" onClick={exportar} disabled={exportando} className={btnExitoCls}>
          {exportando ? 'Exportando…' : 'Exportar Excel'}
        </button>
      </form>

      {msgExport && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {msgExport}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {fichas.map((f) => (
          <div key={f.titulo} className={`${cardCls} flex items-center gap-4 p-5`}>
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white ${f.iconoCls}`}
            >
              {f.icono}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{f.titulo}</p>
              <p className={`mt-0.5 truncate text-2xl font-bold ${f.textoCls}`}>{f.valor}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${cardCls} p-5`}>
          <h2 className={cardHeaderCls}>Ventas por día</h2>
          {rango.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
              Sin ventas en el período seleccionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tablaCls}>
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/40">
                    <th className={thCls}>Día</th>
                    <th className={thCls}>Vehículos</th>
                    <th className={`${thCls} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {rango.map((r) => (
                    <tr key={r.fecha.toISOString()} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className={tdCls}>{fechaCorta(r.fecha)}</td>
                      <td className={tdCls}>{r.cantidad}</td>
                      <td className={`${tdCls} text-right font-medium`}>{formatearMoneda(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`${cardCls} p-5`}>
          <h2 className={cardHeaderCls}>Ranking de servicios</h2>
          {ranking.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
              Sin servicios en el período seleccionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tablaCls}>
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/40">
                    <th className={thCls}>Servicio</th>
                    <th className={thCls}>Cantidad</th>
                    <th className={`${thCls} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {ranking.map((s) => (
                    <tr key={s.nombre} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className={`${tdCls} font-medium`}>{s.nombre}</td>
                      <td className={tdCls}>{s.cantidad}</td>
                      <td className={`${tdCls} text-right font-medium`}>{formatearMoneda(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${cardCls} p-5`}>
          <h2 className={cardHeaderCls}>Por método de pago</h2>
          {metodos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-600 dark:text-slate-500">
              Sin métodos de pago en el período seleccionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className={tablaCls}>
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/40">
                    <th className={thCls}>Método</th>
                    <th className={thCls}>Ventas</th>
                    <th className={`${thCls} text-right`}>Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {metodos.map((m) => (
                    <tr key={m.metodoPago} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                      <td className={`${tdCls} font-medium`}>
                        {TEXTO_METODO_PAGO[m.metodoPago] ?? m.metodoPago}
                      </td>
                      <td className={tdCls}>{m.cantidad}</td>
                      <td className={`${tdCls} text-right font-medium`}>{formatearMoneda(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className={`${cardCls} p-5`}>
          <h2 className={cardHeaderCls}>Comparativo mensual</h2>
          <div className="overflow-x-auto">
            <table className={`${tablaCls} min-w-[560px]`}>
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/40">
                  <th className={thCls}>Período</th>
                  <th className={thCls}>Vehículos</th>
                  <th className={thCls}>Ingresos</th>
                  <th className={thCls}>Egresos</th>
                  <th className={`${thCls} text-right`}>Utilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {[mensual.anterior, mensual.actual].map((m) => (
                  <tr key={m.etiqueta} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className={`${tdCls} capitalize`}>{m.etiqueta}</td>
                    <td className={tdCls}>{m.vehiculos}</td>
                    <td className={tdCls}>{formatearMoneda(m.ingresos)}</td>
                    <td className={tdCls}>{formatearMoneda(m.egresos)}</td>
                    <td className={`${tdCls} text-right font-medium`}>{formatearMoneda(m.utilidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}