import { redirect } from 'next/navigation'
import { AppSidebar } from '@/components/AppSidebar'
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

  if (!usuario) {
    redirect('/login')
  }
  if (usuario.debeCambiarPassword) {
    redirect('/cambiar-contrasena')
  }
  if (usuario.rol !== 'Administrador') {
    redirect('/caja')
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950 lg:flex-row">
      <AppSidebar
        titulo="Panel de administración"
        accento={{
          iconoBg: 'from-sky-400 to-cyan-500 shadow-sky-500/20',
          texto: 'text-sky-300',
          avatarBg: 'bg-sky-500/20 text-sky-300',
        }}
        icono="servicio"
        enlaces={enlaces}
        usuario={{ nombre: usuario.nombre, email: usuario.email }}
      />
      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  )
}