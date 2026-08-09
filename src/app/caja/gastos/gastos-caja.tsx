'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { registrarGasto, solicitarAnulacionGasto } from '@/lib/actions/gastos'
import type { listarCategoriasGasto } from '@/lib/queries'
import { formatearMoneda } from '@/lib/format'
import { Icon } from '@/components/icons'
import {
  inputCls,
  cardCls,
  cardHeaderCls,
  btnMiniCls,
  badgeOkCls,
} from '@/components/ui'

type Categoria = Awaited<ReturnType<typeof listarCategoriasGasto>>[number]

type GastoItem = {
  id: number
  categoria: string
  monto: number
  motivo: string
  estado: string
  fecha: Date
}

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

export function GastosCaja({
  categorias,
  gastos,
  cajaAbierta,
}: {
  categorias: Categoria[]
  gastos: GastoItem[]
  cajaAbierta: boolean
}) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [categoriaId, setCategoriaId] = useState('')
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')

  const totalTurno = useMemo(() => gastos.reduce((acc, g) => acc + g.monto, 0), [gastos])

  function registrar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const res = await registrarGasto({
        categoriaGastoId: Number(categoriaId),
        monto: Number(monto),
        motivo,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setCategoriaId('')
      setMonto('')
      setMotivo('')
      router.refresh()
    })
  }

  function anular(id: number) {
    setError('')
    startTransition(async () => {
      const res = await solicitarAnulacionGasto(id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 lg:col-span-2 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className={`${cardCls} h-fit p-5`}>
        <h2 className={cardHeaderCls}>Registrar gasto</h2>
        {!cajaAbierta ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
            <Icon nombre="caja" className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Debe abrir la caja antes de registrar gastos.
            </p>
          </div>
        ) : (
          <form onSubmit={registrar} className="space-y-3">
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
              className={inputCls}
            >
              <option value="">Seleccione categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              placeholder="Monto (Bs)"
              className={inputCls}
            />
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              minLength={10}
              placeholder="Detalle del motivo (mínimo 10 caracteres)"
              className={inputCls}
              rows={3}
            />
            <button
              type="submit"
              disabled={pendiente}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500/40 disabled:pointer-events-none disabled:opacity-50 dark:bg-orange-500 dark:hover:bg-orange-400"
            >
              <Icon nombre="plus" className="h-4 w-4" />
              {pendiente ? 'Guardando...' : 'Registrar gasto'}
            </button>
          </form>
        )}
      </div>

      <div className={`${cardCls} p-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Gastos del turno
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              {gastos.length}
            </span>
          </h2>
          <div className="rounded-lg bg-slate-50 px-3 py-1.5 text-sm dark:bg-slate-700/40">
            <span className="font-medium text-slate-500 dark:text-slate-400">Total: </span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {formatearMoneda(totalTurno)}
            </span>
          </div>
        </div>
        {gastos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
            <Icon nombre="gastos" className="h-9 w-9 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">Sin gastos en este turno.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {gastos.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      <Icon nombre="gastos" className="h-4 w-4" />
                    </span>
                    {g.categoria} · {formatearMoneda(g.monto)}
                  </p>
                  <p className="mt-0.5 truncate pl-9 text-xs text-slate-500 dark:text-slate-400">
                    {g.motivo}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`${badgeEstado(g.estado)} whitespace-nowrap`}>
                    {TEXTO_ESTADO[g.estado] ?? g.estado}
                  </span>
                  {g.estado === 'activo' && (
                    <button
                      onClick={() => anular(g.id)}
                      disabled={pendiente}
                      className={`${btnMiniCls} bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25`}
                    >
                      Anular
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}