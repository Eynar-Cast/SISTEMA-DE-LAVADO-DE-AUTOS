'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ServicioItem } from '@/lib/queries'
import {
  crearServicio,
  actualizarServicio,
  cambiarEstadoServicio,
} from '@/lib/actions/servicios'
import { formatearMoneda } from '@/lib/format'

export function ServiciosManager({ servicios }: { servicios: ServicioItem[] }) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [editando, setEditando] = useState<ServicioItem | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editPrecio, setEditPrecio] = useState('')

  function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string }>) {
    setError('')
    startTransition(async () => {
      const res = await tarea()
      if (!res.ok) {
        setError(res.error ?? 'Ocurrió un error')
        return
      }
      setNombre('')
      setPrecio('')
      setEditando(null)
      router.refresh()
    })
  }

  function guardarNuevo(e: React.FormEvent) {
    e.preventDefault()
    ejecutar(() =>
      crearServicio({ nombre, precio: Number(precio) })
    )
  }

  function guardarEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    ejecutar(() =>
      actualizarServicio(editando.id, {
        nombre: editNombre,
        precio: Number(editPrecio),
      })
    )
  }

  function cambiarEstado(s: ServicioItem) {
    ejecutar(() =>
      cambiarEstadoServicio(s.id, s.estado === 'activo' ? 'inactivo' : 'activo')
    )
  }

  function editar(s: ServicioItem) {
    setEditando(s)
    setEditNombre(s.nombre)
    setEditPrecio(String(s.precio))
    setError('')
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 lg:col-span-2">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {editando ? `Editar: ${editando.nombre}` : 'Nuevo servicio'}
        </h2>
        {editando ? (
          <form onSubmit={guardarEdicion} className="space-y-3">
            <input
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              placeholder="Nombre del servicio"
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={editPrecio}
              onChange={(e) => setEditPrecio(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              placeholder="Precio (Bs)"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pendiente}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                Guardar cambios
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditando(null)
                  setError('')
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              placeholder="Nombre del servicio"
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              placeholder="Precio (Bs)"
            />
            <button
              type="submit"
              disabled={pendiente}
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
            >
              Crear servicio
            </button>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Listado</h2>
        {servicios.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay servicios registrados.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b-2 border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2">Servicio</th>
                <th className="py-2">Precio</th>
                <th className="py-2">Estado</th>
                <th className="py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {servicios.map((s) => (
                <tr key={s.id}>
                  <td className="py-2 font-medium text-slate-900">{s.nombre}</td>
                  <td className="py-2">{formatearMoneda(s.precio)}</td>
                  <td className="py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.estado === 'activo'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {s.estado}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => editar(s)}
                      className="mr-2 rounded bg-slate-200 px-2 py-1 text-xs hover:bg-slate-300"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => cambiarEstado(s)}
                      disabled={pendiente}
                      className={`rounded px-2 py-1 text-xs ${
                        s.estado === 'activo'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {s.estado === 'activo' ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}