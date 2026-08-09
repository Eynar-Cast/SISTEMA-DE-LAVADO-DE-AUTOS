import { Salir } from '@/components/Salir'
import { NavLink } from '@/components/NavLink'
import { Icon } from '@/components/icons'
import { obtenerSesion } from '@/lib/session'

const enlaces = [
  { href: '/admin/dashboard', nombre: 'Dashboard', icono: 'dashboard' },
  { href: '/admin/servicios', nombre: 'Servicios', icono: 'servicio' },
  { href: '/admin/ventas', nombre: 'Ventas', icono: 'ventas' },
  { href: '/admin/gastos', nombre: 'Gastos', icono: 'gastos' },
  { href: '/admin/usuarios', nombre: 'Usuarios', icono: 'usuarios' },
  { href: '/admin/reportes', nombre: 'Reportes', icono: 'reportes' },
  { href: '/admin/auditoria', nombre: 'Auditoría', icono: 'auditoria' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { usuario } = await obtenerSesion()

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-slate-900 text-white">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 shadow-lg shadow-sky-500/20">
            <Icon nombre="servicio" className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight">Car Wash</p>
            <p className="text-xs font-medium text-sky-300">Panel de administración</p>
          </div>
        </div>

        <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {enlaces.map((enlace) => (
            <NavLink key={enlace.href} href={enlace.href}>
              <Icon nombre={enlace.icono} className="h-5 w-5 opacity-80" />
              {enlace.nombre}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sm font-bold text-sky-300">
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