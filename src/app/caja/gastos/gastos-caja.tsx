'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registrarGasto, solicitarAnulacionGasto } from '@/lib/actions/gastos'
import type { listarCategoriasGasto } from '@/lib/queries'
import { formatearMoneda } from '@/lib/format'

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
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 lg:col-span-2">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Registrar gasto</h2>
        {!cajaAbierta ? (
          <p className="text-sm text-slate-500">
            Debe abrir la caja antes de registrar gastos.
          </p>
        ) : (
          <form onSubmit={registrar} className="space-y-3">
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            />
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              required
              minLength={10}
              placeholder="Detalle del motivo (mínimo 10 caracteres)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              rows={3}
            />
            <button
              type="submit"
              disabled={pendiente}
              className="w-full rounded-lg bg-orange-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-50"
            >
              {pendiente ? 'Guardando...' : 'Registrar gasto'}
            </button>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Gastos del turno ({gastos.length})
        </h2>
        {gastos.length === 0 ? (
          <p className="text-sm text-slate-500">Sin gastos en este turno.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {gastos.map((g) => (
              <li key={g.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-900">
                    {g.categoria} · {formatearMoneda(g.monto)}
                  </p>
                  <p className="text-xs text-slate-500">{g.motivo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      g.estado === 'activo'
                        ? 'bg-green-100 text-green-700'
                        : g.estado === 'anulado'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {TEXTO_ESTADO[g.estado] ?? g.estado}
                  </span>
                  {g.estado === 'activo' && (
                    <button
                      onClick={() => anular(g.id)}
                      disabled={pendiente}
                      className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      Solicitar anulación
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