'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { resolverAnulacionGasto, solicitarAnulacionGasto } from '@/lib/actions/gastos'
import type { listarGastos } from '@/lib/queries'
import { formatearMoneda, formatearFecha } from '@/lib/format'
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

type Gasto = Awaited<ReturnType<typeof listarGastos>>[number]

const TEXTO_ESTADO: Record<string, string> = {
  activo: 'Activo',
  pendiente_autorizacion: 'Pendiente de autorización',
  anulado: 'Anulado',
}

function badgeEstado(estado: string) {
  const base = badgeOkCls
  if (estado === 'anulado')
    return `${base} bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300`
  if (estado === 'pendiente_autorizacion')
    return `${base} bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300`
  return `${base} bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300`
}

export function GastosAdmin({ gastos }: { gastos: Gasto[] }) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return gastos
    return gastos.filter((g) => {
      const estado = (TEXTO_ESTADO[g.estado] ?? g.estado).toLowerCase()
      return (
        g.motivo.toLowerCase().includes(term) ||
        g.categoriaGasto.nombre.toLowerCase().includes(term) ||
        g.usuario.nombre.toLowerCase().includes(term) ||
        `#${g.cajaId}`.includes(term) ||
        estado.includes(term) ||
        formatearFecha(g.fecha).toLowerCase().includes(term)
      )
    })
  }, [gastos, busqueda])

  const totalFiltrado = filtrados.reduce((acc, g) => acc + g.monto, 0)

  function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string }>) {
    setError('')
    startTransition(async () => {
      const res = await tarea()
      if (!res.ok) {
        setError(res.error ?? 'Ocurrió un error')
        return
      }
      router.refresh()
    })
  }

  return (
    <div className={cardCls}>
      {error && (
        <div className="m-5 mb-0 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Listado de gastos</h2>
        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
            <Icon nombre="gastos" className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por motivo, categoría, caja..."
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      {gastos.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <Icon nombre="gastos" className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">No hay gastos registrados.</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <Icon nombre="gastos" className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No se encontraron resultados para «{busqueda}».
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`${tablaCls} min-w-[820px]`}>
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className={thCls}>Fecha</th>
                <th className={thCls}>Categoría</th>
                <th className={thCls}>Motivo</th>
                <th className={thCls}>Caja</th>
                <th className={thCls}>Registrado por</th>
                <th className={`${thCls} text-right`}>Monto</th>
                <th className={thCls}>Estado</th>
                <th className={`${thCls} text-right`}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {filtrados.map((g) => (
                <tr key={g.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                  <td className={`${tdCls} whitespace-nowrap`}>{formatearFecha(g.fecha)}</td>
                  <td className={tdCls}>
                    <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                        <Icon nombre="gastos" className="h-4 w-4" />
                      </span>
                      {g.categoriaGasto.nombre}
                    </span>
                  </td>
                  <td className={`${tdCls} max-w-[260px]`}>
                    <span className="block truncate">{g.motivo}</span>
                  </td>
                  <td className={tdCls}>
                    <span className="font-semibold text-slate-600 dark:text-slate-300">#{g.cajaId}</span>
                  </td>
                  <td className={tdCls}>{g.usuario.nombre}</td>
                  <td className={`${tdCls} text-right font-semibold`}>{formatearMoneda(g.monto)}</td>
                  <td className={tdCls}>
                    <span className={badgeEstado(g.estado)}>
                      {TEXTO_ESTADO[g.estado] ?? g.estado}
                    </span>
                  </td>
                  <td className={`${tdCls} whitespace-nowrap text-right`}>
                    {g.estado === 'pendiente_autorizacion' && (
                      <>
                        <button
                          onClick={() => ejecutar(() => resolverAnulacionGasto(g.id, true))}
                          disabled={pendiente}
                          className={`${btnMiniCls} mr-1.5 bg-emerald-600 text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400`}
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => ejecutar(() => resolverAnulacionGasto(g.id, false))}
                          disabled={pendiente}
                          className={`${btnMiniCls} bg-slate-500 text-white hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-500`}
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {g.estado === 'activo' && (
                      <button
                        onClick={() => ejecutar(() => solicitarAnulacionGasto(g.id))}
                        disabled={pendiente}
                        className={`${btnMiniCls} bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25`}
                      >
                        Anular
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/40">
                <td colSpan={5} className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
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
  )
}