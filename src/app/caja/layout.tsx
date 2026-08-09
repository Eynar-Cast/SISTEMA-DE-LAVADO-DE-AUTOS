import { redirect } from 'next/navigation'
import { Salir } from '@/components/Salir'
import { NavLink } from '@/components/NavLink'
import { Icon } from '@/components/icons'
import { obtenerSesion } from '@/lib/session'

export default async function CajaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { usuario } = await obtenerSesion()

  if (!usuario) {
    redirect('/login')
  }
  if (usuario.debeCambiarPassword) {
    redirect('/cambiar-contrasena')
  }
  if (usuario.rol !== 'Administrador' && usuario.rol !== 'Caja') {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-slate-900 text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-500/20">
            <Icon nombre="operacion" className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight">Car Wash</p>
            <p className="text-xs font-medium text-emerald-300">Operación de caja</p>
          </div>
        </div>

        <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <NavLink href="/caja">
            <Icon nombre="operacion" className="h-5 w-5 opacity-80" />
            Operación
          </NavLink>
          <NavLink href="/caja/gastos">
            <Icon nombre="gastos" className="h-5 w-5 opacity-80" />
            Gastos
          </NavLink>
          <NavLink href="/caja/ventas">
            <Icon nombre="ventas" className="h-5 w-5 opacity-80" />
            Ventas del turno
          </NavLink>
          {usuario?.rol === 'Administrador' && (
            <NavLink href="/admin/dashboard">
              <Icon nombre="dashboard" className="h-5 w-5 opacity-80" />
              Ir al panel admin
            </NavLink>
          )}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
              {usuario?.nombre?.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{usuario?.nombre}</p>
              <p className="truncate text-xs text-slate-400">{usuario?.email}</p>
            </div>
          </div>
          <Salir className="w-full justify-center" />
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">{children}</main>
    </div>
  )
}