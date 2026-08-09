'use client'

import { useSyncExternalStore } from 'react'

function suscribirTema(cb: () => void) {
  window.addEventListener('tema-cambio', cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener('tema-cambio', cb)
    window.removeEventListener('storage', cb)
  }
}

function obtenerOscuro() {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('dark')
  )
}

function obtenerOscuroServidor() {
  return false
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const oscuro = useSyncExternalStore(
    suscribirTema,
    obtenerOscuro,
    obtenerOscuroServidor
  )

  function alternar() {
    const nuevo = !oscuro
    document.documentElement.classList.toggle('dark', nuevo)
    localStorage.setItem('tema', nuevo ? 'dark' : 'light')
    window.dispatchEvent(new Event('tema-cambio'))
  }

  return (
    <button
      type="button"
      onClick={alternar}
      title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      aria-label={oscuro ? 'Modo claro' : 'Modo oscuro'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${className}`}
    >
      {oscuro ? (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
          />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
          />
        </svg>
      )}
    </button>
  )
}