import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname

    if (path.startsWith('/admin')) {
      if (token?.rol !== 'Administrador') {
        return NextResponse.redirect(new URL('/caja', req.url))
      }
    }

    if (path.startsWith('/caja')) {
      if (token?.rol !== 'Administrador' && token?.rol !== 'Caja') {
        return NextResponse.redirect(new URL('/login', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: ['/admin/:path*', '/caja/:path*'],
}