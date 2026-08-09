import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/AppSidebar'
import { obtenerSesion } from '@/lib/session'

const enlacesBase = [
  { href: '/caja', nombre: 'Operación', icono: 'operacion' },
  { href: '/caja/gastos', nombre: 'Gastos', icono: 'gastos' },
  { href: '/caja/ventas', nombre: 'Ventas del turno', icono: 'ventas' },
]

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

  const enlaces = [...enlacesBase]
  if (usuario.rol === 'Administrador') {
    enlaces.push({
      href: '/admin/dashboard',
      nombre: 'Ir al panel admin',
      icono: 'dashboard',
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950 lg:flex-row">
      <AppSidebar
        titulo="Operación de caja"
        accento={{
          iconoBg: 'from-emerald-400 to-teal-500 shadow-emerald-500/20',
          texto: 'text-emerald-300',
          avatarBg: 'bg-emerald-500/20 text-emerald-300',
        }}
        icono="operacion"
        enlaces={enlaces}
        usuario={{ nombre: usuario.nombre, email: usuario.email }}
      />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}