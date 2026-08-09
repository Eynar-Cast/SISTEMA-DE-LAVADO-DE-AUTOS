'use client'

import { useMemo, useState } from 'react'
import type { VentaConDetalles } from '@/lib/queries'
import {
  formatearMoneda,
  formatearFecha,
  TEXTO_METODO_PAGO,
  TEXTO_ESTADO_VEHICULO,
} from '@/lib/format'
import { Icon } from '@/components/icons'
import { inputCls, cardCls, thCls, tdCls, tablaCls, badgeOkCls } from '@/components/ui'

function badgeMetodo(metodo: string) {
  const base = badgeOkCls
  if (metodo === 'QR')
    return `${base} bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300`
  if (metodo === 'tarjeta')
    return `${base} bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300`
  if (metodo === 'otro')
    return `${base} bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300`
  return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`
}

function badgeEstado(estado: string) {
  const base = badgeOkCls
  if (estado === 'finalizado')
    return `${base} bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300`
  if (estado === 'pagado')
    return `${base} bg-blue-100 text-blue-700 dark:bg-sky-500/15 dark:text-sky-300`
  return `${base} bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300`
}

export function VentasAdmin({ ventas }: { ventas: VentaConDetalles[] }) {
  const [busqueda, setBusqueda] = useState('')

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return ventas
    return ventas.filter((v) => {
      const servicios = v.detalleVentas
        .map((d) => d.servicio.nombre)
        .join(' ')
        .toLowerCase()
      const metodo = (TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago).toLowerCase()
      const estado = (TEXTO_ESTADO_VEHICULO[v.estadoVehiculo] ?? v.estadoVehiculo).toLowerCase()
      return (
        `#${v.numeroCorrelativo}`.includes(term) ||
        String(v.numeroCorrelativo).includes(term) ||
        v.usuario.nombre.toLowerCase().includes(term) ||
        servicios.includes(term) ||
        metodo.includes(term) ||
        estado.includes(term) ||
        formatearFecha(v.fecha).toLowerCase().includes(term)
      )
    })
  }, [ventas, busqueda])

  const totalFiltrado = filtradas.reduce((acc, v) => acc + v.total, 0)

  return (
    <div className={cardCls}>
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Historial de ventas
          </h2>
          <span className={`${badgeOkCls} bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300`}>
            {ventas.length} ventas
          </span>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
            <Icon nombre="ventas" className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por correlativo, fecha, cliente..."
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      {ventas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <Icon nombre="ventas" className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No hay ventas registradas.</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <Icon nombre="ventas" className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No se encontraron resultados para «{busqueda}».
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`${tablaCls} min-w-[820px]`}>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className={thCls}>Correlativo</th>
                <th className={thCls}>Fecha</th>
                <th className={thCls}>Servicios</th>
                <th className={thCls}>Método de pago</th>
                <th className={thCls}>Estado vehículo</th>
                <th className={thCls}>Vendedor</th>
                <th className={`${thCls} text-right`}>Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtradas.map((v) => (
                <tr key={v.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className={tdCls}>
                    <span className="font-semibold text-sky-700 dark:text-sky-300">
                      #{v.numeroCorrelativo}
                    </span>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap`}>{formatearFecha(v.fecha)}</td>
                  <td className={`${tdCls} max-w-[260px]`}>
                    <span className="block truncate">
                      {v.detalleVentas
                        .map((d) => `${d.servicio.nombre} x${d.cantidad}`)
                        .join(', ')}
                    </span>
                  </td>
                  <td className={tdCls}>
                    <span className={badgeMetodo(v.metodoPago)}>
                      {TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago}
                    </span>
                  </td>
                  <td className={tdCls}>
                    <span className={badgeEstado(v.estadoVehiculo)}>
                      {TEXTO_ESTADO_VEHICULO[v.estadoVehiculo] ?? v.estadoVehiculo}
                    </span>
                  </td>
                  <td className={tdCls}>{v.usuario.nombre}</td>
                  <td className={`${tdCls} text-right font-semibold`}>{formatearMoneda(v.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/40">
                <td colSpan={5} className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}
                </td>
                <td className={`${tdCls} text-right font-semibold text-slate-500 dark:text-slate-400`}>
                  Total
                </td>
                <td className={`${tdCls} text-right font-bold text-slate-900 dark:text-slate-100`}>
                  {formatearMoneda(totalFiltrado)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}