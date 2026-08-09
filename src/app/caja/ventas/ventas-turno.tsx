'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { cambiarEstadoVenta } from '@/lib/actions/ventas'
import { formatearMoneda, formatearFecha, TEXTO_METODO_PAGO } from '@/lib/format'
import { Icon } from '@/components/icons'
import {
  inputCls,
  cardCls,
  btnMiniCls,
  thCls,
  tdCls,
  tablaCls,
  badgeOkCls,
} from '@/components/ui'

type VentaItem = {
  id: number
  numeroCorrelativo: number
  metodoPago: string
  total: number
  estadoVehiculo: string
  fecha: Date
  detalleVentas: { servicioNombre: string; cantidad: number }[]
}

const TEXTO_ESTADO: Record<string, string> = {
  registrado: 'Registrado',
  pagado: 'Pagado',
  finalizado: 'Finalizado',
}

function badge(estado: string) {
  const base = badgeOkCls
  if (estado === 'finalizado')
    return `${base} bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300`
  if (estado === 'pagado')
    return `${base} bg-blue-100 text-blue-700 dark:bg-sky-500/15 dark:text-sky-300`
  return `${base} bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300`
}

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

export function VentasTurno({
  ventas,
  cajaAbierta,
}: {
  ventas: VentaItem[]
  cajaAbierta: boolean
}) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return ventas
    return ventas.filter((v) => {
      const servicios = v.detalleVentas
        .map((d) => d.servicioNombre)
        .join(' ')
        .toLowerCase()
      const metodo = (TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago).toLowerCase()
      const estado = (TEXTO_ESTADO[v.estadoVehiculo] ?? v.estadoVehiculo).toLowerCase()
      return (
        `#${v.numeroCorrelativo}`.includes(term) ||
        String(v.numeroCorrelativo).includes(term) ||
        servicios.includes(term) ||
        metodo.includes(term) ||
        estado.includes(term) ||
        formatearFecha(v.fecha).toLowerCase().includes(term)
      )
    })
  }, [ventas, busqueda])

  const totalFiltrado = filtradas.reduce((acc, v) => acc + v.total, 0)

  function avanzar(v: VentaItem) {
    setError('')
    const siguiente = v.estadoVehiculo === 'registrado' ? 'pagado' : 'finalizado'
    startTransition(async () => {
      const res = await cambiarEstadoVenta(v.id, siguiente as 'pagado' | 'finalizado')
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className={cardCls}>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Ventas del turno</h2>
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
              <Icon nombre="ventas" className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por correlativo, servicio..."
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>

        {ventas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
            <Icon nombre="ventas" className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Sin ventas en este turno.</p>
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
            <table className={`${tablaCls} min-w-[760px]`}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className={thCls}>Correlativo</th>
                  <th className={thCls}>Fecha</th>
                  <th className={thCls}>Servicios</th>
                  <th className={thCls}>Método</th>
                  <th className={thCls}>Estado</th>
                  <th className={`${thCls} text-right`}>Total</th>
                  <th className={`${thCls} text-right`}>Acción</th>
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
                          .map((d) => `${d.servicioNombre} x${d.cantidad}`)
                          .join(', ')}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className={badgeMetodo(v.metodoPago)}>
                        {TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className={badge(v.estadoVehiculo)}>
                        {TEXTO_ESTADO[v.estadoVehiculo] ?? v.estadoVehiculo}
                      </span>
                    </td>
                    <td className={`${tdCls} text-right font-semibold`}>{formatearMoneda(v.total)}</td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      {cajaAbierta && v.estadoVehiculo !== 'finalizado' && (
                        <button
                          onClick={() => avanzar(v)}
                          disabled={pendiente}
                          className={`${btnMiniCls} bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25`}
                        >
                          {v.estadoVehiculo === 'registrado' ? 'Marcar pagado' : 'Finalizar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/40">
                  <td colSpan={4} className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}
                  </td>
                  <td className={`${tdCls} text-right font-semibold text-slate-500 dark:text-slate-400`}>
                    Total
                  </td>
                  <td className={`${tdCls} text-right font-bold text-slate-900 dark:text-slate-100`}>
                    {formatearMoneda(totalFiltrado)}
                  </td>
                  <td className={tdCls} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}