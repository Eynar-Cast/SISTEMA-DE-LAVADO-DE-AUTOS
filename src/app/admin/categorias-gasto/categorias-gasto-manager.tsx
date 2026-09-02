'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { listarCategoriasGasto } from '@/lib/queries'
import {
  crearCategoriaGasto,
  actualizarCategoriaGasto,
  eliminarCategoriaGasto,
} from '@/lib/actions/categoriasGasto'
import { Icon } from '@/components/icons'
import {
  inputCls,
  cardCls,
  cardHeaderCls,
  btnPrimarioCls,
  btnSecundarioCls,
  btnMiniCls,
  thCls,
  tdCls,
  tablaCls,
  badgeOkCls,
} from '@/components/ui'

type Categoria = Awaited<ReturnType<typeof listarCategoriasGasto>>[number]

export function CategoriasGastoManager({ categorias }: { categorias: Categoria[] }) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [nombre, setNombre] = useState('')
  const [editando, setEditando] = useState<Categoria | null>(null)
  const [editNombre, setEditNombre] = useState('')

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return categorias
    return categorias.filter((c) => c.nombre.toLowerCase().includes(term))
  }, [categorias, busqueda])

  const activos = categorias.length

  function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string }>) {
    setError('')
    startTransition(async () => {
      const res = await tarea()
      if (!res.ok) {
        setError(res.error ?? 'Ocurrió un error')
        return
      }
      setNombre('')
      setEditando(null)
      router.refresh()
    })
  }

  function guardarNuevo(e: React.FormEvent) {
    e.preventDefault()
    ejecutar(() => crearCategoriaGasto({ nombre }))
  }

  function guardarEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    ejecutar(() => actualizarCategoriaGasto(editando.id, { nombre: editNombre }))
  }

  function eliminar(c: Categoria) {
    if (!confirm(`¿Eliminar la categoría "${c.nombre}"?`)) return
    ejecutar(() => eliminarCategoriaGasto(c.id))
  }

  function editar(c: Categoria) {
    setEditando(c)
    setEditNombre(c.nombre)
    setError('')
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 lg:col-span-2 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className={`${cardCls} p-5`}>
        <h2 className={cardHeaderCls}>
          {editando ? `Editar: ${editando.nombre}` : 'Nueva categoría'}
        </h2>
        {editando ? (
          <form onSubmit={guardarEdicion} className="space-y-3">
            <input
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              required
              className={inputCls}
              placeholder="Nombre de la categoría"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={pendiente} className={btnPrimarioCls}>
                Guardar cambios
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(null)
                  setError('')
                }}
                className={btnSecundarioCls}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={guardarNuevo} className="space-y-3">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              className={inputCls}
              placeholder="Nombre de la categoría"
            />
            <button type="submit" disabled={pendiente} className={`${btnPrimarioCls} w-full py-2.5`}>
              Crear categoría
            </button>
          </form>
        )}
      </div>

      <div className={`${cardCls} p-5`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Listado</h2>
          <span className={`${badgeOkCls} bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300`}>
            {activos} categorías
          </span>
        </div>

        <div className="relative mb-4">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
            <Icon nombre="gastos" className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre..."
            className={`${inputCls} pl-9`}
          />
        </div>

        {categorias.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
            <Icon nombre="gastos" className="h-9 w-9 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              Aún no hay categorías registradas.
            </p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
            <Icon nombre="gastos" className="h-9 w-9 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No se encontraron resultados para «{busqueda}».
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tablaCls} min-w-[560px]`}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className={thCls}>Nombre</th>
                  <th className={`${thCls} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filtrados.map((c) => (
                  <tr key={c.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className={tdCls}>
                      <span className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                          <Icon nombre="gastos" className="h-4 w-4" />
                        </span>
                        {c.nombre}
                      </span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      <button
                        onClick={() => editar(c)}
                        className={`${btnMiniCls} mr-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600`}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => eliminar(c)}
                        disabled={pendiente}
                        className={`${btnMiniCls} bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25`}
                      >
                        Eliminar
                      </button>
                    </td>
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