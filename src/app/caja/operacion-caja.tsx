'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { abrirCaja, cerrarCaja } from '@/lib/actions/cajas'
import { registrarVenta, cambiarEstadoVenta } from '@/lib/actions/ventas'
import type { ServicioItem } from '@/lib/queries'
import { formatearMoneda, TEXTO_METODO_PAGO, TEXTO_ESTADO_GASTO } from '@/lib/format'
import { Icon } from '@/components/icons'
import {
  inputCls,
  cardCls,
  cardHeaderCls,
  btnPrimarioCls,
  btnSecundarioCls,
  btnPeligroCls,
  btnExitoCls,
  btnMiniCls,
  badgeOkCls,
} from '@/components/ui'

type UsuarioProps = { id: number; nombre: string; rol: string }

type CajaMapeada = {
  id: number
  montoApertura: number
  estado: string
  fechaApertura: Date
  ventas: {
    id: number
    numeroCorrelativo: number
    metodoPago: string
    total: number
    estadoVehiculo: string
    fecha: Date
    detalleVentas: { servicioNombre: string; cantidad: number }[]
  }[]
  gastos: {
    id: number
    categoria: string
    monto: number
    motivo: string
    estado: string
    fecha: Date
  }[]
}

const TEXTO_ESTADO_VEHICULO: Record<string, string> = {
  registrado: 'Registrado',
  pagado: 'Pagado',
  finalizado: 'Finalizado',
}

const inputCompactoCls =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-sky-400'

export function OperacionCaja({
  usuario,
  servicios,
  caja,
}: {
  usuario: UsuarioProps
  servicios: ServicioItem[]
  caja: CajaMapeada | null
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')

  function ejecutar(tarea: () => Promise<{ ok: boolean; error?: string }>) {
    setError('')
    setMensaje('')
    startTransition(async () => {
      const res = await tarea()
      if (!res.ok) {
        setError(res.error ?? 'Ocurrió un error')
        return
      }
      router.refresh()
    })
  }

  if (!caja) {
    return (
      <AbrirCajaForm
        usuario={usuario}
        onResultado={(ok, msg) => {
          if (ok) {
            router.refresh()
          } else {
            setError(msg)
          }
        }}
        error={error}
      />
    )
  }

  const totalVentas = caja.ventas.reduce((acc, v) => acc + v.total, 0)
  const totalGastos = caja.gastos.reduce((acc, g) => acc + g.monto, 0)
  const diferencia = totalVentas - totalGastos

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}
      {mensaje && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {mensaje}
        </div>
      )}

      <div className={`${cardCls} flex flex-wrap items-center justify-between gap-3 p-5`}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
            <Icon nombre="caja" className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Caja abierta #{caja.id}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Monto inicial: {formatearMoneda(caja.montoApertura)} · turno de {usuario.nombre}
            </p>
          </div>
        </div>
        <CerrarCajaForm setError={setError} setMensaje={setMensaje} totalVentas={totalVentas} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={`${cardCls} flex items-center gap-3 p-4`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
            <Icon nombre="ventas" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Ventas del turno
            </p>
            <p className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">
              {formatearMoneda(totalVentas)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {caja.ventas.length} venta{caja.ventas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className={`${cardCls} flex items-center gap-3 p-4`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <Icon nombre="gastos" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Gastos del turno
            </p>
            <p className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">
              {formatearMoneda(totalGastos)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {caja.gastos.length} gasto{caja.gastos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className={`${cardCls} flex items-center gap-3 p-4`}>
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              diferencia >= 0
                ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300'
                : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
            }`}
          >
            <Icon nombre="caja" className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Diferencia
            </p>
            <p className="truncate text-lg font-bold text-slate-900 dark:text-slate-100">
              {formatearMoneda(diferencia)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">ventas − gastos</p>
          </div>
        </div>
      </div>

      <RegistrarVentaForm
        servicios={servicios}
        onResultado={(mensaje) => {
          setMensaje(mensaje)
          router.refresh()
        }}
        setErrorGlobal={setError}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${cardCls} p-5`}>
          <h3 className={cardHeaderCls}>
            Ventas del turno
            <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              {caja.ventas.length}
            </span>
          </h3>
          {caja.ventas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
              <Icon nombre="ventas" className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Sin ventas registradas en este turno.
              </p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {caja.ventas.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        <span className="text-sky-700 dark:text-sky-300">#{v.numeroCorrelativo}</span>
                        {' '}· {formatearMoneda(v.total)} · {TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {v.detalleVentas.map((d) => `${d.servicioNombre} x${d.cantidad}`).join(', ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`${badgeOkCls} whitespace-nowrap ${
                          v.estadoVehiculo === 'finalizado'
                            ? 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                            : v.estadoVehiculo === 'pagado'
                              ? 'bg-blue-100 text-blue-700 dark:bg-sky-500/15 dark:text-sky-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                        }`}
                      >
                        {TEXTO_ESTADO_VEHICULO[v.estadoVehiculo]}
                      </span>
                      {v.estadoVehiculo !== 'finalizado' && (
                        <button
                          onClick={() =>
                            ejecutar(() =>
                              cambiarEstadoVenta(
                                v.id,
                                v.estadoVehiculo === 'registrado' ? 'pagado' : 'finalizado'
                              )
                            )
                          }
                          className={`${btnMiniCls} bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:hover:bg-sky-500/25`}
                        >
                          Avanzar
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-700/40">
                <span className="font-medium text-slate-500 dark:text-slate-400">Total del turno</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatearMoneda(totalVentas)}
                </span>
              </div>
            </>
          )}
        </div>

        <div className={`${cardCls} p-5`}>
          <h3 className={cardHeaderCls}>
            Gastos del turno
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              {caja.gastos.length}
            </span>
          </h3>
          {caja.gastos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
              <Icon nombre="gastos" className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">Sin gastos en este turno.</p>
            </div>
          ) : (
            <>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {caja.gastos.map((g) => (
                  <li key={g.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {g.categoria} · {formatearMoneda(g.monto)}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{g.motivo}</p>
                    </div>
                    <span
                      className={`${badgeOkCls} shrink-0 whitespace-nowrap ${
                        g.estado === 'activo'
                          ? 'bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : g.estado === 'anulado'
                            ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                      }`}
                    >
                      {TEXTO_ESTADO_GASTO[g.estado] ?? g.estado}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm dark:bg-slate-700/40">
                <span className="font-medium text-slate-500 dark:text-slate-400">Total del turno</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatearMoneda(totalGastos)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AbrirCajaForm({
  usuario,
  onResultado,
  error,
}: {
  usuario: UsuarioProps
  onResultado: (ok: boolean, msg: string) => void
  error: string
}) {
  const [pendiente, startTransition] = useTransition()
  const [monto, setMonto] = useState('')

  function enviar(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const res = await abrirCaja(Number(monto))
      onResultado(res.ok, res.ok ? '' : res.error)
    })
  }

  return (
    <div className={`${cardCls} mx-auto max-w-md p-6 shadow-lg sm:p-8`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
          <Icon nombre="caja" className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Apertura de caja</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Operador: {usuario.nombre}</p>
        </div>
      </div>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Registre el monto inicial en efectivo.
      </p>
      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}
      <form onSubmit={enviar} className="space-y-4">
        <input
          type="number"
          step="0.01"
          min="0"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
          placeholder="Monto inicial (Bs)"
          className={inputCls}
          autoFocus
        />
        <button
          type="submit"
          disabled={pendiente}
          className={`${btnExitoCls} w-full py-2.5`}
        >
          {pendiente ? 'Abriendo...' : 'Abrir caja'}
        </button>
      </form>
    </div>
  )
}

function CerrarCajaForm({
  setError,
  setMensaje,
  totalVentas,
}: {
  setError: (m: string) => void
  setMensaje: (m: string) => void
  totalVentas: number
}) {
  const [pendiente, startTransition] = useTransition()
  const [monto, setMonto] = useState('')
  const [abierto, setAbierto] = useState(false)

  function cerrar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMensaje('')
    startTransition(async () => {
      const res = await cerrarCaja(Number(monto))
      if (!res.ok) {
        setError(res.error)
        return
      }
      setMensaje(
        `Caja cerrada. Diferencia (sobrante/faltante): ${formatearMoneda(res.diferencia)}`
      )
      setAbierto(false)
      setMonto('')
    })
  }

  return (
    <div>
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className={btnPeligroCls}
        >
          Cerrar caja
        </button>
      ) : (
        <form onSubmit={cerrar} className="flex flex-wrap items-end justify-end gap-2">
          <div className="w-full sm:w-auto">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Monto real en caja (Bs)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
              placeholder="Monto real"
              className={`${inputCompactoCls} w-full sm:w-40`}
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pendiente}
              className={btnPeligroCls}
            >
              Confirmar cierre
            </button>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className={btnSecundarioCls}
            >
              Cancelar
            </button>
          </div>
          <p className="w-full text-xs text-slate-400 dark:text-slate-500">
            Ventas del turno: {formatearMoneda(totalVentas)}
          </p>
        </form>
      )}
    </div>
  )
}

function RegistrarVentaForm({
  servicios,
  onResultado,
  setErrorGlobal,
}: {
  servicios: ServicioItem[]
  onResultado: (mensaje: string) => void
  setErrorGlobal: (m: string) => void
}) {
  const [pendiente, startTransition] = useTransition()
  const [cantidades, setCantidades] = useState<Record<number, number>>({})
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [resultado, setResultado] = useState<string | null>(null)

  const total = useMemo(() => {
    return servicios.reduce(
      (acc, s) => acc + (cantidades[s.id] || 0) * s.precio,
      0
    )
  }, [cantidades, servicios])

  const tieneItems = Object.values(cantidades).some((c) => c > 0)

  function registrar(e: React.FormEvent) {
    e.preventDefault()
    setResultado(null)
    setErrorGlobal('')
    const items = Object.entries(cantidades)
      .filter(([, c]) => c > 0)
      .map(([servicioId, cantidad]) => ({
        servicioId: Number(servicioId),
        cantidad,
      }))

    startTransition(async () => {
      const res = await registrarVenta({
        servicios: items,
        metodoPago: metodoPago as 'efectivo' | 'QR' | 'tarjeta' | 'otro',
      })
      if (!res.ok) {
        setErrorGlobal(res.error)
        return
      }
      setCantidades({})
      setResultado(`Correlativo #${res.numeroCorrelativo} generado.`)
      onResultado(`Venta registrada · correlativo #${res.numeroCorrelativo}`)
    })
  }

  return (
    <form onSubmit={registrar} className={`${cardCls} p-5`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Nueva venta</h3>
        {servicios.length > 0 && (
          <span className={`${badgeOkCls} bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300`}>
            {servicios.length} servicio{servicios.length !== 1 ? 's' : ''} disponible{servicios.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {resultado && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {resultado}
        </div>
      )}
      {servicios.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
          <Icon nombre="servicio" className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No hay servicios activos. Contacte al administrador.
          </p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {servicios.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 transition hover:border-sky-300 dark:border-slate-700 dark:bg-slate-700/30 dark:hover:border-sky-600"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900 dark:text-slate-100">{s.nombre}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{formatearMoneda(s.precio)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCantidades((prev) => ({
                    ...prev,
                    [s.id]: Math.max(0, (prev[s.id] || 0) - 1),
                  }))
                }
                className="h-10 w-10 rounded-lg bg-slate-200 text-xl font-bold text-slate-700 transition hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:bg-slate-600 dark:text-slate-100 dark:hover:bg-slate-500"
                aria-label={`Quitar ${s.nombre}`}
              >
                −
              </button>
              <span className="w-8 text-center text-base font-bold text-slate-900 dark:text-slate-100">
                {cantidades[s.id] || 0}
              </span>
              <button
                type="button"
                onClick={() =>
                  setCantidades((prev) => ({
                    ...prev,
                    [s.id]: (prev[s.id] || 0) + 1,
                  }))
                }
                className="h-10 w-10 rounded-lg bg-sky-600 text-xl font-bold text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 dark:bg-sky-500 dark:hover:bg-sky-400"
                aria-label={`Agregar ${s.nombre}`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-700/30 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">
            Método de pago
          </label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-400"
          >
            <option value="efectivo">Efectivo</option>
            <option value="QR">QR</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{formatearMoneda(total)}</p>
        </div>
        <button
          type="submit"
          disabled={pendiente || !tieneItems || !total}
          className={`${btnPrimarioCls} w-full px-6 py-2.5 sm:w-auto`}
        >
          {pendiente ? 'Registrando...' : 'Registrar venta'}
        </button>
      </div>
    </form>
  )
}