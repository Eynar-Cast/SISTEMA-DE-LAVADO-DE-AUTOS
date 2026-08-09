'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { resolverAnulacionGasto, solicitarAnulacionGasto } from '@/lib/actions/gastos'
import type { listarGastos } from '@/lib/queries'
import { formatearMoneda } from '@/lib/format'

type Gasto = Awaited<ReturnType<typeof listarGastos>>[number]

const TEXTO_ESTADO: Record<string, string> = {
  activo: 'Activo',
  pendiente_autorizacion: 'Pendiente de autorización',
  anulado: 'Anulado',
}

function badgeEstado(estado: string) {
  const base = 'rounded-full px-2 py-0.5 text-xs font-medium'
  if (estado === 'anulado') return `${base} bg-slate-200 text-slate-600`
  if (estado === 'pendiente_autorizacion') return `${base} bg-amber-100 text-amber-800`
  return `${base} bg-green-100 text-green-700`
}

export function GastosAdmin({ gastos }: { gastos: Gasto[] }) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')

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

  if (gastos.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <p className="text-sm text-slate-500">No hay gastos registrados.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
      {error && (
        <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700">{error}</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2">Fecha</th>
              <th className="py-2">Categoría</th>
              <th className="py-2">Motivo</th>
              <th className="py-2">Caja</th>
              <th className="py-2">Registrado por</th>
              <th className="py-2">Monto</th>
              <th className="py-2">Estado</th>
              <th className="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {gastos.map((g) => (
              <tr key={g.id}>
                <td className="py-2 whitespace-nowrap">{g.fecha.toLocaleString()}</td>
                <td className="py-2">{g.categoriaGasto.nombre}</td>
                <td className="py-2">{g.motivo}</td>
                <td className="py-2">#{g.cajaId}</td>
                <td className="py-2">{g.usuario.nombre}</td>
                <td className="py-2 font-medium">{formatearMoneda(g.monto)}</td>
                <td className="py-2">
                  <span className={badgeEstado(g.estado)}>
                    {TEXTO_ESTADO[g.estado] ?? g.estado}
                  </span>
                </td>
                <td className="py-2 text-right">
                  {g.estado === 'pendiente_autorizacion' && (
                    <>
                      <button
                        onClick={() => ejecutar(() => resolverAnulacionGasto(g.id, true))}
                        disabled={pendiente}
                        className="mr-2 rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => ejecutar(() => resolverAnulacionGasto(g.id, false))}
                        disabled={pendiente}
                        className="rounded bg-slate-400 px-2 py-1 text-xs text-white hover:bg-slate-500 disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  {g.estado === 'activo' && (
                    <button
                      onClick={() => ejecutar(() => solicitarAnulacionGasto(g.id))}
                      disabled={pendiente}
                      className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200 disabled:opacity-50"
                    >
                      Anular
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}