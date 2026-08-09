'use client'

import { useState } from 'react'
import { NavLink } from '@/components/NavLink'
import { Salir } from '@/components/Salir'
import { Icon } from '@/components/icons'
import { ThemeToggle } from '@/components/ThemeToggle'

type Enlace = { href: string; nombre: string; icono: string }

type UsuarioSidebar = { nombre: string; email: string }

export function AppSidebar({
  titulo,
  accento,
  icono,
  enlaces,
  usuario,
}: {
  titulo: string
  accento: {
    iconoBg: string
    texto: string
    avatarBg: string
  }
  icono: string
  enlaces: Enlace[]
  usuario: UsuarioSidebar
}) {
  const [abierto, setAbierto] = useState(false)

  const nav = (
    <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4">
      {enlaces.map((enlace) => (
        <NavLink key={enlace.href} href={enlace.href}>
          <Icon nombre={enlace.icono} className="h-5 w-5 opacity-80" />
          {enlace.nombre}
        </NavLink>
      ))}
    </nav>
  )

  const pie = (
    <div className="border-t border-white/10 p-4">
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/5 px-3 py-2.5">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${accento.avatarBg}`}
        >
          {usuario?.nombre?.charAt(0).toUpperCase() ?? '?'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{usuario?.nombre}</p>
          <p className="truncate text-xs text-slate-400">{usuario?.email}</p>
        </div>
      </div>
      <Salir className="w-full justify-center" />
    </div>
  )

  const encabezado = (
    <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg ${accento.iconoBg}`}
        >
          <Icon nombre={icono} className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-base font-bold leading-tight">Car Wash</p>
          <p className={`text-xs font-medium ${accento.texto}`}>{titulo}</p>
        </div>
      </div>
      <ThemeToggle className="hidden h-9 w-9 border-white/20 bg-white/5 text-slate-200 hover:bg-white/10 lg:inline-flex" />
    </div>
  )

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-900 text-white lg:flex dark:bg-slate-950">
        {encabezado}
        {nav}
        {pie}
      </aside>

      <header className="sticky top-0 z-40 flex w-full items-center justify-between gap-3 border-b border-white/10 bg-slate-900 px-4 py-3 text-white lg:hidden dark:bg-slate-950">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir menú"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-200 transition hover:bg-white/10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br shadow ${accento.iconoBg}`}
          >
            <Icon nombre={icono} className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-bold">Car Wash</span>
        </div>
        <ThemeToggle className="h-9 w-9 border-white/20 bg-white/5 text-slate-200 hover:bg-white/10" />
      </header>

      {abierto && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setAbierto(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-slate-900 text-white shadow-2xl dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg ${accento.iconoBg}`}
                >
                  <Icon nombre={icono} className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-base font-bold leading-tight">Car Wash</p>
                  <p className={`text-xs font-medium ${accento.texto}`}>{titulo}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAbierto(false)}
                aria-label="Cerrar menú"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-200 transition hover:bg-white/10"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18 18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            {nav}
            {pie}
          </div>
        </div>
      )}
    </>
  )
}