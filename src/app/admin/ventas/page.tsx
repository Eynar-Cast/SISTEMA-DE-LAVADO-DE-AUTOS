import { listarVentas } from '@/lib/queries'
import { formatearMoneda, TEXTO_METODO_PAGO, TEXTO_ESTADO_VEHICULO } from '@/lib/format'

export default async function AdminVentasPage() {
  const ventas = await listarVentas()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Ventas</h1>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {ventas.length === 0 ? (
          <p className="text-sm text-slate-500">No hay ventas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2">Correlativo</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Servicios</th>
                  <th className="py-2">Método de pago</th>
                  <th className="py-2">Estado vehículo</th>
                  <th className="py-2">Vendedor</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ventas.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 font-medium">#{v.numeroCorrelativo}</td>
                    <td className="py-2 whitespace-nowrap">{v.fecha.toLocaleString()}</td>
                    <td className="py-2">
                      {v.detalleVentas
                        .map((d) => `${d.servicio.nombre} x${d.cantidad}`)
                        .join(', ')}
                    </td>
                    <td className="py-2">{TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago}</td>
                    <td className="py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          v.estadoVehiculo === 'finalizado'
                            ? 'bg-green-100 text-green-700'
                            : v.estadoVehiculo === 'pagado'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {TEXTO_ESTADO_VEHICULO[v.estadoVehiculo] ?? v.estadoVehiculo}
                      </span>
                    </td>
                    <td className="py-2">{v.usuario.nombre}</td>
                    <td className="py-2 text-right font-medium">
                      {formatearMoneda(v.total)}
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