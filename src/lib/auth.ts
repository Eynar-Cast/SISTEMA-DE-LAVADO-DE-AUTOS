import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/services/auditoria'

const LIMITE_INTENTOS_POR_EMAIL = 5
const VENTANA_MINUTOS = 15

async function excesoDeIntentos(email: string): Promise<boolean> {
  if (!email) return false
  const desde = new Date(Date.now() - VENTANA_MINUTOS * 60_000)
  const filas = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM "auditoria"
    WHERE accion = 'login_fallido'
      AND timestamp >= ${desde}
      AND valores_nuevos->>'email' = ${email}
  `
  return (filas[0]?.n ?? 0) >= LIMITE_INTENTOS_POR_EMAIL
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.trim().toLowerCase()
        const password = credentials.password
        const ip =
          req.headers?.['x-forwarded-for']?.toString().split(',')[0] ??
          'desconocida'

        const bloqueado = await excesoDeIntentos(email)

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { rol: true },
        })

        if (bloqueado) {
          if (usuario) {
            await registrarAuditoria({
              usuarioId: usuario.id,
              accion: 'login_bloqueado',
              tablaAfectada: 'usuarios',
              valoresAnteriores: null,
              valoresNuevos: { email },
              ip,
            })
          }
          return null
        }

        if (!usuario) {
          // No auditamos aquí (no hay usuario_id válido), pero podrías
          // loguear a un archivo/servicio externo si quieres rastrear intentos.
          return null
        }

        if (usuario.estado !== 'activo') {
          return null
        }

        const passwordValida = await bcrypt.compare(password, usuario.passwordHash)

        if (!passwordValida) {
          await registrarAuditoria({
            usuarioId: usuario.id,
            accion: 'login_fallido',
            tablaAfectada: 'usuarios',
            valoresAnteriores: null,
            valoresNuevos: { email },
            ip,
          })
          return null
        }

        await registrarAuditoria({
          usuarioId: usuario.id,
          accion: 'login_exitoso',
          tablaAfectada: 'usuarios',
          valoresAnteriores: null,
          valoresNuevos: { email },
          ip,
        })

        return {
          id: usuario.id.toString(),
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol.nombre,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.rol = user.rol
        token.id = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.rol = token.rol
        session.user.id = token.id
      }
      return session
    },
  },
}