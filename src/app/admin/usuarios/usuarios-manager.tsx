'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
} from '@/lib/actions/usuarios'
import { listarUsuarios, listarRoles } from '@/lib/queries'

type UsuarioItem = Awaited<ReturnType<typeof listarUsuarios>>[number]
type RolItem = Awaited<ReturnType<typeof listarRoles>>[number]

export function UsuariosManager({
  usuarios,
  roles,
}: {
  usuarios: UsuarioItem[]
  roles: RolItem[]
}) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rolId: '',
  })

  const [editando, setEditando] = useState<UsuarioItem | null>(null)
  const [editForm, setEditForm] = useState({
    nombre: '',
    email: '',
    password: '',
    rolId: '',
  })

  function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string }>) {
    setError('')
    startTransition(async () => {
      const res = await tarea()
      if (!res.ok) {
        setError(res.error ?? 'Ocurrió un error')
        return
      }
      setForm({ nombre: '', email: '', password: '', rolId: '' })
      setEditando(null)
      router.refresh()
    })
  }

  function guardarNuevo(e: React.FormEvent) {
    e.preventDefault()
    ejecutar(() =>
      crearUsuario({
        nombre: form.nombre,
        email: form.email,
        password: form.password,
        rolId: Number(form.rolId),
      })
    )
  }

  function guardarEdicion(e: React.FormEvent) {
    e.preventDefault()
    if (!editando) return
    ejecutar(() =>
      actualizarUsuario(editando.id, {
        nombre: editForm.nombre,
        email: editForm.email,
        rolId: Number(editForm.rolId),
        password: editForm.password || undefined,
      })
    )
  }

  function editar(u: UsuarioItem) {
    setEditando(u)
    setEditForm({
      nombre: u.nombre,
      email: u.email,
      password: '',
      rolId: String(
        roles.find((r) => r.nombre === u.rol)?.id
      ),
    })
    setError('')
  }

  function cambiarEstado(u: UsuarioItem) {
    ejecutar(() =>
      cambiarEstadoUsuario(u.id, u.estado === 'activo' ? 'inactivo' : 'activo')
    )
  }

  const inputCls =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30'

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 lg:col-span-3">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {editando ? `Editar: ${editando.nombre}` : 'Nuevo usuario'}
        </h2>
        {editando ? (
          <form onSubmit={guardarEdicion} className="space-y-3">
            <input
              className={inputCls}
              value={editForm.nombre}
              onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
              placeholder="Nombre"
              required
            />
            <input
              type="email"
              className={inputCls}
              value={editForm.email}
              onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              placeholder="Email"
              required
            />
            <input
              type="password"
              className={inputCls}
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              placeholder="Nueva contraseña (dejar vacío para no cambiar)"
            />
            <select
              className={inputCls}
              value={editForm.rolId}
              onChange={(e) => setEditForm({ ...editForm, rolId: e.target.value })}
              required
            >
              <option value="">Seleccione rol</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pendiente}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:opacity-50"
              >
                Guardar
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
              className={inputCls}
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Nombre"
              required
            />
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email"
              required
            />
            <input
              type="password"
              className={inputCls}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Contraseña (mín. 8 caracteres)"
              required
            />
            <select
              className={inputCls}
              value={form.rolId}
              onChange={(e) => setForm({ ...form, rolId: e.target.value })}
              required
            >
              <option value="">Seleccione rol</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={pendiente}
              className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
            >
              Crear usuario
            </button>
          </form>
        )}
      </div>

      <div className="rounded-lg bg-white p-5 shadow lg:col-span-2">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Listado</h2>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="py-2">Nombre</th>
              <th className="py-2">Email</th>
              <th className="py-2">Rol</th>
              <th className="py-2">Estado</th>
              <th className="py-2 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td className="py-2 font-medium text-slate-900">{u.nombre}</td>
                <td className="py-2">{u.email}</td>
                <td className="py-2">{u.rol}</td>
                <td className="py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.estado === 'activo'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {u.estado}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => editar(u)}
                    className="mr-2 rounded bg-slate-200 px-2 py-1 text-xs hover:bg-slate-300"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => cambiarEstado(u)}
                    disabled={pendiente}
                    className={`rounded px-2 py-1 text-xs ${
                      u.estado === 'activo'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}