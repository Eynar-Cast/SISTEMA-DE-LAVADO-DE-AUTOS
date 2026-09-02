import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

// Hash fijo de una contraseña inerte: se compara cuando el email no existe
// para igualar el tiempo de respuesta con el de una cuenta real y evitar la
// enumeración de usuarios por temporización (bcrypt es costoso).
const HASH_CONTRASENA_INEXISTENTE =
  '$2b$10$hZViIWXrYZkffDJmg9g.hOweNJQCIeNBDM408wKf3kbJZigktbd4a'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
  // Fuerza cookies httpOnly + SameSite=Lax + Secure en producción
  // (con el prefijo __Secure-/__Host- correspondiente).
  useSecureCookies: process.env.NODE_ENV === 'production',
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
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.trim().toLowerCase()
        const password = credentials.password

        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { rol: true },
        })

        // Iguala el tiempo de respuesta con el de una cuenta inexistente para
        // no revelar qué emails están registrados.
        if (!usuario) {
          await bcrypt.compare(password, HASH_CONTRASENA_INEXISTENTE)
          return null
        }

        const passwordValida = await bcrypt.compare(
          password,
          usuario.passwordHash
        )

        if (!passwordValida) {
          return null
        }

        // Se valida la contraseña ante del estado: la respuesta no delata por
        // temporización si la cuenta está inactiva.
        if (usuario.estado !== 'activo') {
          return null
        }

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