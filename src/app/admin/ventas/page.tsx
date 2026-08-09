import { listarVentas } from '@/lib/queries'
import { formatearMoneda } from '@/lib/format'

export default async function AdminVentasPage() {
  const ventas = await listarVentas()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Ventas</h1>
      <div className="rounded-lg bg-white p-5 shadow">
        {ventas.length === 0 ? (
          <p className="text-sm text-gray-500">No hay ventas registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-2">Correlativo</th>
                  <th className="py-2">Fecha</th>
                  <th className="py-2">Servicios</th>
                  <th className="py-2">Método de pago</th>
                  <th className="py-2">Estado vehículo</th>
                  <th className="py-2">Vendedor</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ventas.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2 font-medium">#{v.numeroCorrelativo}</td>
                    <td className="py-2 whitespace-nowrap">{v.fecha.toLocaleString()}</td>
                    <td className="py-2">
                      {v.detalleVentas
                        .map((d) => `${d.servicio.nombre} x${d.cantidad}`)
                        .join(', ')}
                    </td>
                    <td className="py-2">{v.metodoPago}</td>
                    <td className="py-2">{v.estadoVehiculo}</td>
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