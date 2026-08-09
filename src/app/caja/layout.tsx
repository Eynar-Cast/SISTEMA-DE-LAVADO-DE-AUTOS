import Link from 'next/link'
import { Salir } from '@/components/Salir'
import { obtenerSesion } from '@/lib/session'

export default async function CajaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { usuario } = await obtenerSesion()

  return (
    <div className="flex min-h-screen bg-gray-100">
      <aside className="flex w-60 flex-col bg-slate-800 text-white">
        <div className="border-b border-slate-700 p-4">
          <p className="text-lg font-bold">Car Wash</p>
          <p className="text-xs text-slate-300">Operación de Caja</p>
        </div>
        <nav className="flex-1 p-3">
          <Link
            href="/caja"
            className="block rounded-md px-3 py-2 text-sm hover:bg-slate-700"
          >
            Operación
          </Link>
          <Link
            href="/caja/gastos"
            className="block rounded-md px-3 py-2 text-sm hover:bg-slate-700"
          >
            Gastos
          </Link>
          <Link
            href="/caja/ventas"
            className="block rounded-md px-3 py-2 text-sm hover:bg-slate-700"
          >
            Ventas del turno
          </Link>
          {usuario?.rol === 'Administrador' && (
            <Link
              href="/admin/dashboard"
              className="mt-2 block rounded-md px-3 py-2 text-sm text-amber-300 hover:bg-slate-700"
            >
              Ir al panel admin
            </Link>
          )}
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