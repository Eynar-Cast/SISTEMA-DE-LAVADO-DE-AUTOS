'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { abrirCaja, cerrarCaja } from '@/lib/actions/cajas'
import { registrarVenta, cambiarEstadoVenta } from '@/lib/actions/ventas'
import type { ServicioItem } from '@/lib/queries'
import { formatearMoneda, TEXTO_METODO_PAGO, TEXTO_ESTADO_GASTO } from '@/lib/format'

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

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>
      )}
      {mensaje && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{mensaje}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Caja abierta #{caja.id}
            </h2>
            <p className="text-sm text-slate-500">
              Monto inicial: {formatearMoneda(caja.montoApertura)} · turno de{' '}
              {usuario.nombre}
            </p>
          </div>
          <CerrarCajaForm setError={setError} setMensaje={setMensaje} />
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">
            Ventas del turno ({caja.ventas.length})
          </h3>
          {caja.ventas.length === 0 ? (
            <p className="text-sm text-slate-500">Sin ventas registradas en este turno.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {caja.ventas.map((v) => (
                <li key={v.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      #{v.numeroCorrelativo} · {formatearMoneda(v.total)} ·{' '}
                      {TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago}
                    </p>
                    <p className="text-xs text-slate-500">
                      {v.detalleVentas
                        .map((d) => `${d.servicioNombre} x${d.cantidad}`)
                        .join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        v.estadoVehiculo === 'finalizado'
                          ? 'bg-green-100 text-green-700'
                          : v.estadoVehiculo === 'pagado'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
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
                        className="rounded-lg bg-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-300"
                      >
                        Avanzar
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-lg font-semibold text-slate-900">
            Gastos del turno ({caja.gastos.length})
          </h3>
          {caja.gastos.length === 0 ? (
            <p className="text-sm text-slate-500">Sin gastos en este turno.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {caja.gastos.map((g) => (
                <li key={g.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-900">
                      {g.categoria} · {formatearMoneda(g.monto)}
                    </p>
                    <p className="text-xs text-slate-500">{g.motivo}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      g.estado === 'activo'
                        ? 'bg-green-100 text-green-700'
                        : g.estado === 'anulado'
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {TEXTO_ESTADO_GASTO[g.estado] ?? g.estado}
                  </span>
                </li>
              ))}
            </ul>
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
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
      <h2 className="mb-1 text-xl font-bold text-slate-900">Apertura de caja</h2>
      <p className="mb-4 text-sm text-slate-500">
        Operador: {usuario.nombre}. Registre el monto inicial en efectivo.
      </p>
      {error && (
        <div className="mb-4 rounded bg-red-200 p-3 text-sm text-red-700">{error}</div>
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
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
        />
        <button
          type="submit"
          disabled={pendiente}
          className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
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
}: {
  setError: (m: string) => void
  setMensaje: (m: string) => void
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
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
        >
          Cerrar caja
        </button>
      ) : (
        <form onSubmit={cerrar} className="flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            required
            placeholder="Monto real en caja (Bs)"
            className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
            autoFocus
          />
          <button
            type="submit"
            disabled={pendiente}
            className="rounded-lg bg-rose-600 px-3 py-2 text-sm text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
          >
            Confirmar cierre
          </button>
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cancelar
          </button>
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
      onResultado(
        `Venta registrada · correlativo #${res.numeroCorrelativo}`
      )
    })
  }

  return (
    <form onSubmit={registrar} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-lg font-semibold text-slate-900">Nueva venta</h3>
      {resultado && (
        <div className="mb-3 rounded bg-green-200 p-2 text-sm text-green-800">{resultado}</div>
      )}
      <div className="space-y-2">
        {servicios.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div>
              <p className="font-medium text-slate-900">{s.nombre}</p>
              <p className="text-sm text-slate-500">{formatearMoneda(s.precio)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCantidades((prev) => ({
                    ...prev,
                    [s.id]: Math.max(0, (prev[s.id] || 0) - 1),
                  }))
                }
                className="h-8 w-8 rounded-lg bg-slate-200 text-lg font-bold text-slate-700 transition hover:bg-slate-300"
              >
                −
              </button>
              <span className="w-8 text-center font-semibold">{cantidades[s.id] || 0}</span>
              <button
                type="button"
                onClick={() =>
                  setCantidades((prev) => ({
                    ...prev,
                    [s.id]: (prev[s.id] || 0) + 1,
                  }))
                }
                className="h-8 w-8 rounded-lg bg-slate-200 text-lg font-bold text-slate-700 transition hover:bg-slate-300"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {servicios.length === 0 && (
        <p className="text-sm text-slate-500">
          No hay servicios activos. Contacte al administrador.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="block text-sm text-slate-600">Método de pago</label>
          <select
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          >
            <option value="efectivo">Efectivo</option>
            <option value="QR">QR</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-600">Total</p>
          <p className="text-2xl font-bold text-slate-900">{formatearMoneda(total)}</p>
        </div>
        <button
          type="submit"
          disabled={pendiente || !tieneItems || !total}
          className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
        >
          {pendiente ? 'Registrando...' : 'Registrar venta'}
        </button>
      </div>
    </form>
  )
}