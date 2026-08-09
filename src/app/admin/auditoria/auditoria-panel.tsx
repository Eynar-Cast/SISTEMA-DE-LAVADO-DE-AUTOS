'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { AuditoriaRegistro } from '@/lib/queries'
import {
  inputCls,
  cardCls,
  btnPrimarioCls,
  btnSecundarioCls,
  thCls,
  tdCls,
  tablaCls,
  badgeOkCls,
} from '@/components/ui'

function tinteAccion(accion: string): string {
  const base = badgeOkCls
  if (accion.includes('login'))
    return `${base} bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300`
  if (accion.includes('venta'))
    return `${base} bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300`
  if (accion.includes('gasto'))
    return `${base} bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300`
  if (accion.includes('anular'))
    return `${base} bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300`
  if (accion.includes('caja') || accion.includes('apertura') || accion.includes('cierre'))
    return `${base} bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200`
  if (accion.includes('usuario') || accion.includes('servicio') || accion.includes('contrasena'))
    return `${base} bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300`
  return `${base} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`
}

function DetalleJSON({ valor }: { valor: unknown }) {
  if (valor == null) return <span className="text-slate-400 dark:text-slate-500">—</span>
  const legible = JSON.stringify(valor, null, 2)
  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-xs font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300">
        Ver detalle
      </summary>
      <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-2 font-mono text-xs leading-relaxed text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
        {legible}
      </pre>
    </details>
  )
}

export function AuditoriaPanel({
  registros,
  acciones,
}: {
  registros: AuditoriaRegistro[]
  acciones: { accion: string; cantidad: number }[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState(() => searchParams.get('q') ?? '')
  const [accion, setAccion] = useState(() => searchParams.get('accion') ?? '')
  const [desde, setDesde] = useState(() => searchParams.get('desde') ?? '')
  const [hasta, setHasta] = useState(() => searchParams.get('hasta') ?? '')
  const [orden, setOrden] = useState(() => searchParams.get('orden') ?? 'desc')

  const hayFiltros = !!(q.trim() || accion || desde || hasta || orden === 'asc')

  function aplicar(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    const termino = q.trim()
    if (termino) params.set('q', termino)
    if (accion) params.set('accion', accion)
    if (desde) params.set('desde', desde)
    if (hasta) params.set('hasta', hasta)
    if (orden === 'asc') params.set('orden', 'asc')
    const qs = params.toString()
    router.push(qs ? `/admin/auditoria?${qs}` : '/admin/auditoria')
  }

  function limpiar() {
    setQ('')
    setAccion('')
    setDesde('')
    setHasta('')
    setOrden('desc')
    router.push('/admin/auditoria')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {registros.length} registro(s){hayFiltros ? ' filtrados' : ' recientes'}
        </span>
        {hayFiltros && (
          <button type="button" onClick={limpiar} className={btnSecundarioCls}>
            Limpiar filtros
          </button>
        )}
      </div>

      <form onSubmit={aplicar} className={`${cardCls} flex flex-wrap items-end gap-3 p-4`}>
        <div className="w-full flex-1 sm:min-w-60">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Buscar
          </label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Usuario, acción, tabla, IP o id…"
            className={inputCls}
          />
        </div>
        <div className="w-full sm:w-60">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Tipo de acción
          </label>
          <select value={accion} onChange={(e) => setAccion(e.target.value)} className={inputCls}>
            <option value="">Todas</option>
            {acciones.map((a) => (
              <option key={a.accion} value={a.accion}>
                {a.accion} ({a.cantidad})
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Desde
          </label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} />
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Hasta
          </label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputCls} />
        </div>
        <div className="w-full sm:w-52">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Orden
          </label>
          <select value={orden} onChange={(e) => setOrden(e.target.value)} className={inputCls}>
            <option value="desc">Más recientes primero</option>
            <option value="asc">Más antiguos primero</option>
          </select>
        </div>
        <button type="submit" className={btnPrimarioCls}>
          Aplicar
        </button>
      </form>

      <div className={`${cardCls} overflow-hidden`}>
        {registros.length === 0 ? (
          <p className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No se encontraron eventos de auditoría con los criterios indicados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tablaCls} min-w-[900px]`}>
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/40">
                  <th className={thCls}>Fecha y hora</th>
                  <th className={thCls}>Usuario</th>
                  <th className={thCls}>Acción</th>
                  <th className={thCls}>Entidad</th>
                  <th className={thCls}>Datos anteriores</th>
                  <th className={thCls}>Datos nuevos</th>
                  <th className={thCls}>IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {registros.map((r) => (
                  <tr key={r.id} className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className={`${tdCls} whitespace-nowrap`}>{r.timestamp.toLocaleString('es-VE')}</td>
                    <td className={`${tdCls} whitespace-nowrap font-medium`}>{r.usuarioNombre}</td>
                    <td className={tdCls}>
                      <span className={tinteAccion(r.accion)}>{r.accion}</span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>{r.tablaAfectada}</td>
                    <td className={tdCls}>
                      <DetalleJSON valor={r.valoresAnteriores} />
                    </td>
                    <td className={tdCls}>
                      <DetalleJSON valor={r.valoresNuevos} />
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>{r.ip ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}