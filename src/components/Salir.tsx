'use client'

import { signOut } from 'next-auth/react'

export function Salir({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/login' })}
      className={`rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 ${className}`}
    >
      Cerrar sesión
    </button>
  )
}