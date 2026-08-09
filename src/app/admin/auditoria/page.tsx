import { obtenerUltimaAuditoria } from '@/lib/queries'

export default async function AuditoriaPage() {
  const registros = await obtenerUltimaAuditoria(100)

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-gray-800">Auditoría</h1>
      <p className="mb-6 text-sm text-gray-500">
        Registro de solo lectura. No se puede editar ni borrar.
      </p>

      <div className="rounded-lg bg-white p-5 shadow">
        {registros.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay eventos auditados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="py-2">Timestamp</th>
                  <th className="py-2">Usuario</th>
                  <th className="py-2">Acción</th>
                  <th className="py-2">Tabla</th>
                  <th className="py-2">Antes</th>
                  <th className="py-2">Después</th>
                  <th className="py-2">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registros.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="py-2 whitespace-nowrap">{r.timestamp.toLocaleString()}</td>
                    <td className="py-2">{r.usuarioNombre}</td>
                    <td className="py-2 font-medium">{r.accion}</td>
                    <td className="py-2">{r.tablaAfectada}</td>
                    <td className="py-2 max-w-[200px] truncate">
                      {r.valoresAnteriores ? JSON.stringify(r.valoresAnteriores) : '—'}
                    </td>
                    <td className="py-2 max-w-[200px] truncate">
                      {r.valoresNuevos ? JSON.stringify(r.valoresNuevos) : '—'}
                    </td>
                    <td className="py-2">{r.ip ?? '—'}</td>
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