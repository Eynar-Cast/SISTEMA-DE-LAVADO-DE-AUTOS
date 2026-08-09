'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cambiarMiContrasena } from '@/lib/actions/cuenta'
import { REQUISITOS_CONTRASENA } from '@/lib/password'
import { btnPrimarioCls, inputCls } from '@/components/ui'

export function CambiarContrasenaForm() {
  const router = useRouter()
  const [passwordActual, setPasswordActual] = useState('')
  const [nuevaPassword, setNuevaPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (nuevaPassword !== confirmar) {
      setError('La confirmación no coincide con la nueva contraseña')
      return
    }

    setCargando(true)
    const res = await cambiarMiContrasena({ passwordActual, nuevaPassword })
    setCargando(false)

    if (!res.ok) {
      setError(res.error)
      return
    }

    setExito(true)
    setTimeout(() => router.push('/'), 1500)
  }

  if (exito) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center text-sm text-emerald-800">
        <p className="mb-2 font-semibold">Contraseña actualizada correctamente.</p>
        <p>Redirigiendo al panel principal…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Contraseña actual
        </label>
        <input
          type="password"
          value={passwordActual}
          onChange={(e) => setPasswordActual(e.target.value)}
          required
          autoComplete="current-password"
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Nueva contraseña
        </label>
        <input
          type="password"
          value={nuevaPassword}
          onChange={(e) => setNuevaPassword(e.target.value)}
          required
          autoComplete="new-password"
          placeholder="Mín. 8 caracteres, mayúscula, minúscula y número"
          className={inputCls}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Confirmar nueva contraseña
        </label>
        <input
          type="password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          required
          autoComplete="new-password"
          className={inputCls}
        />
      </div>

      <p className="text-xs text-slate-500">{REQUISITOS_CONTRASENA}</p>

      <button type="submit" disabled={cargando} className={`${btnPrimarioCls} w-full py-2.5`}>
        {cargando ? 'Guardando…' : 'Actualizar contraseña'}
      </button>
    </form>
  )
}