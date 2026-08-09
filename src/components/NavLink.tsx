'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function NavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const activo = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
        activo
          ? 'bg-white/10 text-white shadow-inner'
          : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
      aria-current={activo ? 'page' : undefined}
    >
      {children}
    </Link>
  )
}