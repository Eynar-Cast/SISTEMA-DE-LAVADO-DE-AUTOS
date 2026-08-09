'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
} from '@/lib/actions/usuarios'
import { listarUsuarios, listarRoles, type OrdenUsuarios } from '@/lib/queries'
import { formatearFecha } from '@/lib/format'
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

type UsuarioItem = Awaited<ReturnType<typeof listarUsuarios>>[number]
type RolItem = Awaited<ReturnType<typeof listarRoles>>[number]

function badgeRol(rol: string) {
  const base = badgeOkCls
  const r = rol.toLowerCase()
  if (r.includes('admin'))
    return `${base} bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300`
  if (r.includes('caj'))
    return `${base} bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300`
  return `${base} bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300`
}

function colorAvatar(rol: string) {
  const r = rol.toLowerCase()
  if (r.includes('admin'))
    return 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
  if (r.includes('caj'))
    return 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
  return 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
}

export function UsuariosManager({
  usuarios,
  roles,
}: {
  usuarios: UsuarioItem[]
  roles: RolItem[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState(() => searchParams.get('desde') ?? '')
  const [hasta, setHasta] = useState(() => searchParams.get('hasta') ?? '')
  const [orden, setOrden] = useState<OrdenUsuarios>(() => {
    const v = searchParams.get('orden')
    return v === 'creado_desc' || v === 'nombre_asc' || v === 'rol_asc' ? v : 'creado_asc'
  })

  function aplicar(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    p.set('orden', orden)
    router.push(`/admin/usuarios?${p.toString()}`)
  }

  function limpiar() {
    setDesde('')
    setHasta('')
    setOrden('creado_asc')
    router.push('/admin/usuarios')
  }

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

  const filtrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return usuarios
    return usuarios.filter(
      (u) =>
        u.nombre.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        u.rol.toLowerCase().includes(term)
    )
  }, [usuarios, busqueda])

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
      rolId: String(roles.find((r) => r.nombre === u.rol)?.id),
    })
    setError('')
  }

  function cambiarEstado(u: UsuarioItem) {
    ejecutar(() =>
      cambiarEstadoUsuario(u.id, u.estado === 'activo' ? 'inactivo' : 'activo')
    )
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 lg:col-span-3 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className={`${cardCls} h-fit p-5`}>
        <h2 className={cardHeaderCls}>
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
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={pendiente} className={btnPrimarioCls}>
                Guardar
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
              className={`${btnPrimarioCls} w-full py-2.5`}
            >
              Crear usuario
            </button>
          </form>
        )}
      </div>

      <div className={`${cardCls} p-5 lg:col-span-2`}>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">Listado</h2>
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
              <Icon nombre="usuarios" className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, email o rol..."
              className={`${inputCls} pl-9`}
            />
          </div>
        </div>

        <form
          onSubmit={aplicar}
          className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/20"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Creado desde
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
            <div className="w-full sm:w-52">
              <select value={orden} onChange={(e) => setOrden(e.target.value as OrdenUsuarios)} className={inputCls}>
                <option value="creado_asc">Creado (antiguo primero)</option>
                <option value="creado_desc">Creado (reciente primero)</option>
                <option value="nombre_asc">Nombre (A–Z)</option>
                <option value="rol_asc">Rol</option>
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

        {usuarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <Icon nombre="usuarios" className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No hay usuarios registrados.
            </p>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
            <Icon nombre="usuarios" className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            <p className="text-sm text-slate-400 dark:text-slate-500">
              No se encontraron resultados para «{busqueda}».
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tablaCls} min-w-[820px]`}>
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className={thCls}>Nombre</th>
                  <th className={thCls}>Email</th>
                  <th className={thCls}>Rol</th>
                  <th className={thCls}>Estado</th>
                  <th className={thCls}>Creado</th>
                  <th className={`${thCls} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {filtrados.map((u) => (
                  <tr
                    key={u.id}
                    className="transition hover:bg-slate-50 dark:hover:bg-slate-700/40"
                  >
                    <td className={tdCls}>
                      <span className="flex items-center gap-3">
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colorAvatar(u.rol)}`}
                        >
                          {u.nombre.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {u.nombre}
                        </span>
                      </span>
                    </td>
                    <td className={`${tdCls} truncate`}>{u.email}</td>
                    <td className={tdCls}>
                      <span className={badgeRol(u.rol)}>{u.rol}</span>
                    </td>
                    <td className={tdCls}>
                      <span
                        className={`${badgeOkCls} ${
                          u.estado === 'activo'
                            ? 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {u.estado === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className={`${tdCls} whitespace-nowrap`}>{formatearFecha(u.createdAt)}</td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      <button
                        onClick={() => editar(u)}
                        className={`${btnMiniCls} mr-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600`}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => cambiarEstado(u)}
                        disabled={pendiente}
                        className={`${btnMiniCls} ${
                          u.estado === 'activo'
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:hover:bg-rose-500/25'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:hover:bg-emerald-500/25'
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
        )}
      </div>
    </div>
  )
}