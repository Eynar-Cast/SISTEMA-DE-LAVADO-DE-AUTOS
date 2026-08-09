import { redirect } from 'next/navigation'
import { obtenerSesion } from '@/lib/session'
import { Icon } from '@/components/icons'
import { CambiarContrasenaForm } from './form'

export default async function CambiarContrasenaPage() {
  const { usuario } = await obtenerSesion()
  if (!usuario) {
    redirect('/login')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-sky-900 via-slate-900 to-slate-950 px-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-cyan-500 shadow-xl shadow-sky-500/30">
            <Icon nombre="usuarios" className="h-8 w-8 text-white" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
          <h1 className="mb-1 text-center text-2xl font-bold tracking-tight text-slate-900">
            Cambio obligatorio de contraseña
          </h1>
          <p className="mb-6 text-center text-sm text-slate-500">
            Tu contraseña actual es temporal. Definí una nueva para continuar.
          </p>
          <CambiarContrasenaForm />
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Sistema de gestión para lavado de autos
        </p>
      </div>
    </div>
  )
}