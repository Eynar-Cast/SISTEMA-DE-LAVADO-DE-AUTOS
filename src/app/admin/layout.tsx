import Link from 'next/link'
import { Salir } from '@/components/Salir'
import { obtenerSesion } from '@/lib/session'

const enlaces = [
  { href: '/admin/dashboard', nombre: 'Dashboard' },
  { href: '/admin/servicios', nombre: 'Servicios' },
  { href: '/admin/ventas', nombre: 'Ventas' },
  { href: '/admin/gastos', nombre: 'Gastos' },
  { href: '/admin/usuarios', nombre: 'Usuarios' },
  { href: '/admin/reportes', nombre: 'Reportes' },
  { href: '/admin/auditoria', nombre: 'Auditoría' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { usuario } = await obtenerSesion()

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="flex w-64 flex-col bg-slate-800 text-white">
        <div className="border-b border-slate-700 p-4">
          <p className="text-lg font-bold">Car Wash</p>
          <p className="text-xs text-slate-300">Administración</p>
        </div>
        <nav className="flex-1 p-3">
          {enlaces.map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className="block rounded-md px-3 py-2 text-sm hover:bg-slate-700"
            >
              {enlace.nombre}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-700 p-4 text-sm">
          <p className="truncate text-slate-200">{usuario?.nombre}</p>
          <p className="text-xs text-slate-400">{usuario?.email}</p>
          <Salir className="mt-2 w-full" />
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  )
}