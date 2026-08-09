import { redirect } from 'next/navigation'
import { obtenerSesion } from '@/lib/session'

export default async function Home() {
  const { usuario } = await obtenerSesion()

  if (!usuario) {
    redirect('/login')
  }

  if (usuario.rol === 'Administrador') {
    redirect('/admin/dashboard')
  }

  redirect('/caja')
}