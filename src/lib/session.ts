import { getServerSession } from 'next-auth'
import { headers } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type SesionUsuario = {
  id: number
  nombre: string
  email: string
  rol: string
  debeCambiarPassword: boolean
}

export async function obtenerSesion(): Promise<{
  session: import('next-auth').Session | null
  usuario: SesionUsuario | null
}> {
  const session = await getServerSession(authOptions)
  if (!session?.user || !session.user.id) return { session: null, usuario: null }

  // Revalida el estado real del usuario en la BD en cada request: los JWT
  // duran 8h, pero si el admin desactiva a un usuario o le cambia el rol,
  // el cambio debe tener efecto inmediato sin esperar a que expire la sesión.
  const usuarioActual = await prisma.usuario.findUnique({
    where: { id: Number(session.user.id) },
    select: {
      id: true,
      nombre: true,
      email: true,
      estado: true,
      debeCambiarPassword: true,
      rol: { select: { nombre: true } },
    },
  })

  if (!usuarioActual || usuarioActual.estado !== 'activo') {
    return { session: null, usuario: null }
  }

  const usuario: SesionUsuario = {
    id: usuarioActual.id,
    nombre: usuarioActual.nombre,
    email: usuarioActual.email,
    rol: usuarioActual.rol.nombre,
    debeCambiarPassword: usuarioActual.debeCambiarPassword,
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