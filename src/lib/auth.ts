import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { registrarAuditoria } from '@/lib/services/auditoria'

const LIMITE_INTENTOS_POR_EMAIL = 5
const LIMITE_INTENTOS_POR_IP = 15
const VENTANA_MINUTOS = 15

// Hash fijo de una contraseña inerte: se compara cuando el email no existe
// para igualar el tiempo de respuesta con el de una cuenta real y evitar la
// enumeración de usuarios por temporización (bcrypt es costoso).
const HASH_CONTRASENA_INEXISTENTE =
  '$2b$10$hZViIWXrYZkffDJmg9g.hOweNJQCIeNBDM408wKf3kbJZigktbd4a'

function inicioVentana(): Date {
  return new Date(Date.now() - VENTANA_MINUTOS * 60_000)
}

async function excesoDeIntentos(email: string): Promise<boolean> {
  if (!email) return false
  const desde = inicioVentana()
  // Solo se cuentan los fallos posteriores al último login exitoso del email:
  // al acreditarse correctamente, el contador se reinicia. La ventana de
  // 15 minutos hace que el conteo expire de forma natural.
  const filas = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM "auditoria"
    WHERE accion = 'login_fallido'
      AND timestamp >= ${desde}
      AND valores_nuevos->>'email' = ${email}
      AND timestamp >= COALESCE((
        SELECT MAX(a2.timestamp)
        FROM "auditoria" a2
        WHERE a2.accion = 'login_exitoso'
          AND a2.valores_nuevos->>'email' = ${email}
      ), ${desde})
  `
  return (filas[0]?.n ?? 0) >= LIMITE_INTENTOS_POR_EMAIL
}

async function excesoDeIntentosPorIp(ip: string): Promise<boolean> {
  if (!ip || ip === 'desconocida') return false
  const desde = inicioVentana()
  // Límite por IP: evita la fuerza bruta distribuida (muchos emails desde una
  // misma IP) y la rotación de contraseñas sobre cuentas del mismo origen.
  const filas = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n
    FROM "auditoria"
    WHERE accion IN ('login_fallido', 'login_bloqueado')
      AND timestamp >= ${desde}
      AND ip = ${ip}
      AND timestamp >= COALESCE((
        SELECT MAX(a2.timestamp)
        FROM "auditoria" a2
        WHERE a2.accion = 'login_exitoso'
          AND a2.ip = ${ip}
      ), ${desde})
  `
  return (filas[0]?.n ?? 0) >= LIMITE_INTENTOS_POR_IP
}

export const authOptions: NextAuthOptions = {
  trustHost: true,
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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = credentials.email.trim().toLowerCase()
        const password = credentials.password
        const ip =
          (req.headers?.['x-forwarded-for']?.toString().split(',')[0] ?? '')
            .trim() || 'desconocida'

        const bloqueado =
          (await excesoDeIntentos(email)) || (await excesoDeIntentosPorIp(ip))

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

        // Se valida la contraseña ante del estado: la respuesta no delata por
        // temporización si la cuenta está inactiva.
        if (usuario.estado !== 'activo') {
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