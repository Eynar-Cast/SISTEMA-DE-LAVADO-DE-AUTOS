'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Icon } from '@/components/icons'
import { ThemeToggle } from '@/components/ThemeToggle'
import { btnPrimarioCls, inputCls } from '@/components/ui'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (res?.ok) {
        // Navegación dura: con router.push el login quedaba pegado en /login (bug del router en dev).
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign('/')
        return
      }

      setCargando(false)
      setError('Email o contraseña incorrectos')
    } catch {
      setCargando(false)
      setError('No se pudo conectar con el servidor. Intenta de nuevo.')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-900 via-slate-900 to-slate-950 px-4 dark:from-sky-950 dark:via-slate-950 dark:to-black">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="absolute right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 shadow-xl shadow-sky-500/30 dark:from-sky-500 dark:to-cyan-400">
            <Icon nombre="servicio" className="h-8 w-8 text-white" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur dark:border-white/10 dark:bg-slate-900/90">
          <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Bienvenido al sistema
          </h1>
          <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Car Wash · Ingresa con tus credenciales
          </p>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                autoComplete="email"
                placeholder="usuario@carwash.com"
                className={inputCls}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className={`${btnPrimarioCls} w-full py-2.5`}
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Sistema de gestión para lavado de autos
        </p>
      </div>
    </div>
  )
}