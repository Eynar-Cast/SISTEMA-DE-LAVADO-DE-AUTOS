'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ReporteRango, ResumenMensual } from '@/lib/reportes'
import { formatearMoneda, TEXTO_METODO_PAGO } from '@/lib/format'

export function ReportesPanel({
  reporte,
  mensual,
}: {
  reporte: ReporteRango
  mensual: ResumenMensual
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [desde, setDesde] = useState(() => searchParams.get('desde') ?? '')
  const [hasta, setHasta] = useState(() => searchParams.get('hasta') ?? '')

  function aplicar(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    router.push(`/admin/reportes?${params.toString()}`)
  }

  function exportarCSV(nombre: string, filas: (string | number)[][]) {
    const contenido = filas
      .map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${nombre}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fichas = [
    { titulo: 'Vehículos atendidos', valor: String(reporte.vehiculos) },
    { titulo: 'Ingresos', valor: formatearMoneda(reporte.ingresos) },
    { titulo: 'Egresos (gastos)', valor: formatearMoneda(reporte.egresos) },
    { titulo: 'Utilidad', valor: formatearMoneda(reporte.utilidad) },
  ]

  return (
    <div className="space-y-6">
      <form onSubmit={aplicar} className="flex flex-wrap items-end gap-3 rounded-lg bg-white p-4 shadow">
        <div>
          <label className="block text-sm text-slate-600">Desde</label>
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-600">Hasta</label>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700"
        >
          Consultar
        </button>
        <button
          type="button"
          onClick={() =>
            exportarCSV('reporte_rango', [
              ['Fecha', 'Vehículos', 'Total'],
              ...reporte.rango.map((r) => [
                r.fecha.toLocaleDateString('es-BO'),
                r.cantidad,
                r.total,
              ]),
            ])
          }
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          Exportar CSV
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fichas.map((f) => (
          <div key={f.titulo} className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
            <p className="text-sm text-slate-500">{f.titulo}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{f.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Vehículos por día</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2">Día</th>
                <th className="py-2">Vehículos</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reporte.rango.map((r) => (
                <tr key={r.fecha.toISOString()}>
                  <td className="py-2">{r.fecha.toLocaleDateString('es-BO')}</td>
                  <td className="py-2">{r.cantidad}</td>
                  <td className="py-2 text-right">{formatearMoneda(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Ranking de servicios</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2">Servicio</th>
                <th className="py-2">Cantidad</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reporte.rankingServicio.map((s) => (
                <tr key={s.nombre}>
                  <td className="py-2">{s.nombre}</td>
                  <td className="py-2">{s.cantidad}</td>
                  <td className="py-2 text-right">{formatearMoneda(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Por método de pago</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2">Método</th>
                <th className="py-2">Ventas</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reporte.porMetodoPago.map((m) => (
                <tr key={m.metodoPago}>
                  <td className="py-2">{TEXTO_METODO_PAGO[m.metodoPago] ?? m.metodoPago}</td>
                  <td className="py-2">{m.cantidad}</td>
                  <td className="py-2 text-right">{formatearMoneda(m.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">Comparativo mensual</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2">Período</th>
                <th className="py-2">Vehículos</th>
                <th className="py-2">Ingresos</th>
                <th className="py-2">Egresos</th>
                <th className="py-2 text-right">Utilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[mensual.anterior, mensual.actual].map((m) => (
                <tr key={m.etiqueta}>
                  <td className="py-2 capitalize">{m.etiqueta}</td>
                  <td className="py-2">{m.vehiculos}</td>
                  <td className="py-2">{formatearMoneda(m.ingresos)}</td>
                  <td className="py-2">{formatearMoneda(m.egresos)}</td>
                  <td className="py-2 text-right">{formatearMoneda(m.utilidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}