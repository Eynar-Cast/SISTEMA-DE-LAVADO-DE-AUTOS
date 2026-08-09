import { obtenerResumenDashboard } from '@/lib/reportes'
import { listarCajas } from '@/lib/queries'
import { formatearMoneda } from '@/lib/format'

export default async function DashboardPage() {
  const resumen = await obtenerResumenDashboard()
  const cajas = await listarCajas({ incluirCerradas: false })

  const fichas = [
    {
      titulo: 'Vehículos hoy',
      valor: String(resumen.vehiculosHoy),
      bg: 'bg-blue-600',
    },
    {
      titulo: 'Ingresos del día',
      valor: formatearMoneda(resumen.ingresosHoy),
      bg: 'bg-green-600',
    },
    {
      titulo: 'Gastos del día',
      valor: formatearMoneda(resumen.gastosHoy),
      bg: 'bg-orange-600',
    },
    {
      titulo: 'Utilidad del día',
      valor: formatearMoneda(resumen.utilidadHoy),
      bg: resumen.utilidadHoy >= 0 ? 'bg-emerald-700' : 'bg-red-700',
    },
  ]

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fichas.map((f) => (
          <div key={f.titulo} className="rounded-lg bg-white p-5 shadow">
            <p className="text-sm text-gray-500">{f.titulo}</p>
            <p className={`mt-1 inline-block rounded px-2 py-1 text-xl font-bold text-white ${f.bg}`}>
              {f.valor}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Top servicios más vendidos hoy
          </h2>
          {resumen.topServicios.length === 0 ? (
            <p className="text-sm text-gray-500">Sin ventas registradas hoy.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {resumen.topServicios.map((s, i) => (
                <li key={s.nombre} className="flex justify-between py-2 text-sm">
                  <span>
                    <span className="mr-2 font-bold text-gray-400">{i + 1}.</span>
                    {s.nombre}
                  </span>
                  <span>
                    {s.cantidad} unidad(es) · {formatearMoneda(s.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg bg-white p-5 shadow">
          <h2 className="mb-3 text-lg font-semibold text-gray-800">
            Cajas abiertas ({resumen.cajasAbiertas})
          </h2>
          {cajas.length === 0 ? (
            <p className="text-sm text-gray-500">No hay cajas abiertas en este momento.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {cajas.map((c) => (
                <li key={c.id} className="flex justify-between py-2 text-sm">
                  <span>{c.usuario.nombre}</span>
                  <span>
                    {formatearMoneda(c.montoApertura)} · {c.fechaApertura.toLocaleDateString()}{' '}
                    {c.fechaApertura.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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