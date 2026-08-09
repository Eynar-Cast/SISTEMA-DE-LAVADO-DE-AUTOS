'use client'

import { signOut } from 'next-auth/react'

export function Salir({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-600 ${className}`}
    >
      Cerrar sesión
    </button>
  )
}