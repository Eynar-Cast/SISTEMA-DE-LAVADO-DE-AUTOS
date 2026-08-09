import { obtenerUltimaAuditoria } from '@/lib/queries'

function colorAccion(accion: string): string {
  if (accion.includes('login')) return 'bg-emerald-100 text-emerald-800'
  if (accion.includes('venta')) return 'bg-sky-100 text-sky-800'
  if (accion.includes('gasto')) return 'bg-amber-100 text-amber-800'
  if (accion === 'anular_gasto' || accion.includes('anular')) return 'bg-rose-100 text-rose-700'
  if (accion.includes('caja') || accion.includes('apertura') || accion.includes('cierre'))
    return 'bg-slate-200 text-slate-700'
  if (accion.includes('usuario') || accion.includes('servicio'))
    return 'bg-violet-100 text-violet-800'
  return 'bg-slate-100 text-slate-600'
}

function JSONChip({ label, valor }: { label: string; valor: unknown }) {
  if (!valor) return <span className="text-slate-400">—</span>
  return (
    <code
      className="block max-w-[240px] font-mono text-xs leading-relaxed text-slate-600"
      title={`${label}: ${JSON.stringify(valor, null, 2)}`}
    >
      {JSON.stringify(valor)}
    </code>
  )
}

export default async function AuditoriaPage() {
  const registros = await obtenerUltimaAuditoria(100)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Auditoría</h1>
          <p className="text-sm text-slate-500">
            Registro de solo lectura. No se puede editar ni borrar.
          </p>
        </div>
        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
          {registros.length} registros recientes
        </span>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {registros.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Aún no hay eventos auditados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3">Fecha y hora</th>
                  <th className="px-3 py-3">Usuario</th>
                  <th className="px-3 py-3">Acción</th>
                  <th className="px-3 py-3">Entidad</th>
                  <th className="px-3 py-3">Datos anteriores</th>
                  <th className="px-3 py-3">Datos nuevos</th>
                  <th className="px-3 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.map((r) => (
                  <tr key={r.id} className="align-top transition hover:bg-slate-50">
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                      {r.timestamp.toLocaleString('es-VE')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 font-medium text-slate-900">
                      {r.usuarioNombre}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorAccion(r.accion)}`}
                      >
                        {r.accion}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-600">{r.tablaAfectada}</td>
                    <td className="px-3 py-3">
                      <JSONChip label="Antes" valor={r.valoresAnteriores} />
                    </td>
                    <td className="px-3 py-3">
                      <JSONChip label="Después" valor={r.valoresNuevos} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-slate-500">{r.ip ?? '—'}</td>
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