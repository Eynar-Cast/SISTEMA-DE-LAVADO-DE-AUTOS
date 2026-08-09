import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    // Rutas /admin/* -> solo Administrador
    if (path.startsWith('/admin')) {
      if (token?.rol !== 'Administrador') {
        return NextResponse.redirect(new URL('/caja', req.url))
      }
    }

    // Rutas /caja/* -> Administrador y Caja
    if (path.startsWith('/caja')) {
      if (token?.rol !== 'Administrador' && token?.rol !== 'Caja') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // debe estar logueado
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/caja/:path*'],
}