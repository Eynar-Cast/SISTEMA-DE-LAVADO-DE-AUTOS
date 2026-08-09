'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cambiarEstadoVenta } from '@/lib/actions/ventas'
import { formatearMoneda } from '@/lib/format'

type VentaItem = {
  id: number
  numeroCorrelativo: number
  metodoPago: string
  total: number
  estadoVehiculo: string
  fecha: Date
  detalleVentas: { servicioNombre: string; cantidad: number }[]
}

const TEXTO_ESTADO: Record<string, string> = {
  registrado: 'Registrado',
  pagado: 'Pagado',
  finalizado: 'Finalizado',
}

function badge(estado: string) {
  const base = 'rounded-full px-2 py-0.5 text-xs font-medium'
  if (estado === 'finalizado') return `${base} bg-green-100 text-green-700`
  if (estado === 'pagado') return `${base} bg-blue-100 text-blue-700`
  return `${base} bg-amber-100 text-amber-700`
}

export function VentasTurno({
  ventas,
  cajaAbierta,
}: {
  ventas: VentaItem[]
  cajaAbierta: boolean
}) {
  const router = useRouter()
  const [pendiente, startTransition] = useTransition()
  const [error, setError] = useState('')

  function avanzar(v: VentaItem) {
    setError('')
    const siguiente = v.estadoVehiculo === 'registrado' ? 'pagado' : 'finalizado'
    startTransition(async () => {
      const res = await cambiarEstadoVenta(v.id, siguiente as 'pagado' | 'finalizado')
      if (!res.ok) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-200 p-3 text-sm text-red-700">{error}</div>
      )}
      <div className="rounded-lg bg-white p-5 shadow">
        {ventas.length === 0 ? (
          <p className="text-sm text-gray-500">Sin ventas en este turno.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-2">Correlativo</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Servicios</th>
                  <th className="py-2">Método</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2 text-right">Total</th>
                  <th className="py-2 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ventas.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 font-medium">#{v.numeroCorrelativo}</td>
                    <td className="py-2 whitespace-nowrap">{v.fecha.toLocaleString()}</td>
                    <td className="py-2">
                      {v.detalleVentas
                        .map((d) => `${d.servicioNombre} x${d.cantidad}`)
                        .join(', ')}
                    </td>
                    <td className="py-2">{v.metodoPago}</td>
                    <td className="py-2">
                      <span className={badge(v.estadoVehiculo)}>
                        {TEXTO_ESTADO[v.estadoVehiculo]}
                      </span>
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatearMoneda(v.total)}
                    </td>
                    <td className="py-2 text-right">
                      {cajaAbierta && v.estadoVehiculo !== 'finalizado' && (
                        <button
                          onClick={() => avanzar(v)}
                          disabled={pendiente}
                          className="rounded bg-gray-200 px-2 py-1 text-xs hover:bg-gray-300 disabled:opacity-50"
                        >
                          {v.estadoVehiculo === 'registrado' ? 'Marcar pagado' : 'Finalizar'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}