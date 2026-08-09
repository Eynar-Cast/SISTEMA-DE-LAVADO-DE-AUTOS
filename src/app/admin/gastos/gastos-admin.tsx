'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { resolverAnulacionGasto, solicitarAnulacionGasto } from '@/lib/actions/gastos'
import type { listarGastos, OrdenGastos } from '@/lib/queries'
import { formatearMoneda, formatearFecha } from '@/lib/format'
import { Icon } from '@/components/icons'
import {
  inputCls,
  cardCls,
  btnMiniCls,
  badgeOkCls,
  btnPrimarioCls,
  btnSecundarioCls,
  thCls,
  tdCls,
  tablaCls,
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
  const searchParams = useSearchParams()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState(() => searchParams.get('desde') ?? '')
  const [hasta, setHasta] = useState(() => searchParams.get('hasta') ?? '')
  const [orden, setOrden] = useState<OrdenGastos>(() => {
    const v = searchParams.get('orden')
    return v === 'fecha_asc' || v === 'monto_desc' || v === 'monto_asc' ? v : 'fecha_desc'
  })

  function aplicar(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    p.set('orden', orden)
    router.push(`/admin/gastos?${p.toString()}`)
  }

  function limpiar() {
    setDesde('')
    setHasta('')
    setOrden('fecha_desc')
    router.push('/admin/gastos')
  }

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

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return gastos
    return gastos.filter(
      (g) =>
        g.categoriaGasto.nombre.toLowerCase().includes(term) ||
        g.motivo.toLowerCase().includes(term) ||
        g.usuario.nombre.toLowerCase().includes(term) ||
        formatearFecha(g.fecha).toLowerCase().includes(term)
    )
  }, [gastos, busqueda])

  const totalFiltrado = filtrados.reduce((acc, g) => acc + g.monto, 0)

  if (gastos.length === 0) {
    return (
      <div className={`${cardCls} p-5`}>
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
          <Icon nombre="gastos" className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No hay gastos en el período seleccionado.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cardCls}>
      {error && (
        <div className="border-b border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Gastos registrados
          </h2>
          <span className={`${badgeOkCls} bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300`}>
            {gastos.length} gastos
          </span>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
            <Icon nombre="gastos" className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por categoría, motivo, usuario..."
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

      <form
        onSubmit={aplicar}
        className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Desde
          </label>
          <div className="w-full sm:w-44">
            <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Hasta
          </label>
          <div className="w-full sm:w-44">
            <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Ordenar por
          </label>
          <div className="w-full sm:w-56">
            <select value={orden} onChange={(e) => setOrden(e.target.value as OrdenGastos)} className={inputCls}>
              <option value="fecha_desc">Fecha (reciente primero)</option>
              <option value="fecha_asc">Fecha (antigua primero)</option>
              <option value="monto_desc">Monto (mayor primero)</option>
              <option value="monto_asc">Monto (menor primero)</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className={btnPrimarioCls}>
            Consultar
          </button>
          <button type="button" onClick={limpiar} className={btnSecundarioCls}>
            Limpiar
          </button>
        </div>
      </form>

      {filtrados.length === 0 ? (
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
                  <td className={tdCls}>{g.categoriaGasto.nombre}</td>
                  <td className={`${tdCls} max-w-[240px]`}>
                    <span className="block truncate">{g.motivo}</span>
                  </td>
                  <td className={tdCls}>#{g.cajaId}</td>
                  <td className={tdCls}>{g.usuario.nombre}</td>
                  <td className={`${tdCls} text-right font-medium`}>{formatearMoneda(g.monto)}</td>
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
                          className={`${btnMiniCls} mr-1.5 bg-green-100 text-green-700 hover:bg-green-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25`}
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => ejecutar(() => resolverAnulacionGasto(g.id, false))}
                          disabled={pendiente}
                          className={`${btnMiniCls} bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600`}
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
                <td className={`${tdCls} text-right font-bold text-slate-900 dark:text-slate-100`}>
                  {formatearMoneda(totalFiltrado)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}