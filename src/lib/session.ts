import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { authOptions } from '@/lib/auth'

export type SesionUsuario = {
  id: number
  nombre: string
  email: string
  rol: string
}

export async function obtenerSesion(): Promise<{
  session: import('next-auth').Session | null
  usuario: SesionUsuario | null
}> {
  const session = await getServerSession(authOptions)
  if (!session?.user) return { session: null, usuario: null }

  const usuario: SesionUsuario = {
    id: Number(session.user.id),
    nombre: session.user.name ?? '',
    email: session.user.email ?? '',
    rol: session.user.rol,
  }

  return { session, usuario }
}

export async function requerirAutenticado(): Promise<SesionUsuario> {
  const { usuario } = await obtenerSesion()
  if (!usuario) {
    throw new Error('No autorizado: inicie sesión')
  }
  return usuario
}

export async function requerirAdmin(): Promise<SesionUsuario> {
  const { usuario } = await obtenerSesion()
  if (!usuario || usuario.rol !== 'Administrador') {
    throw new Error('No autorizado: se requiere rol Administrador')
  }
  return usuario
}

export async function requerirCaja(): Promise<SesionUsuario> {
  const { usuario } = await obtenerSesion()
  if (!usuario || (usuario.rol !== 'Administrador' && usuario.rol !== 'Caja')) {
    throw new Error('No autorizado: se requiere rol Caja o Administrador')
  }
  return usuario
}

export async function obtenerIp(): Promise<string> {
  try {
    const h = await headers()
    return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'desconocida'
  } catch {
    return 'desconocida'
  }
}