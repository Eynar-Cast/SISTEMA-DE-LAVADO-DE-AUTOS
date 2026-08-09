import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/services/auditoria'

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

        const usuario = await prisma.usuario.findUnique({
          where: { email: credentials.email },
          include: { rol: true },
        })

        const ip =
          req.headers?.['x-forwarded-for']?.toString().split(',')[0] ??
          'desconocida'

        if (!usuario) {
          // No auditamos aquí (no hay usuario_id válido), pero podrías
          // loguear a un archivo/servicio externo si quieres rastrear intentos.
          return null
        }

        if (usuario.estado !== 'activo') {
          return null
        }

        const passwordValida = await bcrypt.compare(
          credentials.password,
          usuario.passwordHash
        )

        if (!passwordValida) {
          await registrarAuditoria({
            usuarioId: usuario.id,
            accion: 'login_fallido',
            tablaAfectada: 'usuarios',
            valoresAnteriores: null,
            valoresNuevos: { email: usuario.email },
            ip,
          })
          return null
        }

        await registrarAuditoria({
          usuarioId: usuario.id,
          accion: 'login_exitoso',
          tablaAfectada: 'usuarios',
          valoresAnteriores: null,
          valoresNuevos: { email: usuario.email },
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
        token.rol = (user as any).rol
        token.id = (user as any).id
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).rol = token.rol
        ;(session.user as any).id = token.id
      }
      return session
    },
  },
}