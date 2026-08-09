import { obtenerResumenDashboard } from '@/lib/reportes'
import { listarCajas } from '@/lib/queries'
import { formatearMoneda } from '@/lib/format'
import { cardCls, tituloPaginaCls } from '@/components/ui'

export default async function DashboardPage() {
  const resumen = await obtenerResumenDashboard()
  const cajas = await listarCajas({ incluirCerradas: false })

  const fichas = [
    {
      titulo: 'Vehículos hoy',
      valor: String(resumen.vehiculosHoy),
      icono: 'bg-sky-500',
      texto: 'text-sky-700',
    },
    {
      titulo: 'Ingresos del día',
      valor: formatearMoneda(resumen.ingresosHoy),
      icono: 'bg-emerald-500',
      texto: 'text-emerald-700',
    },
    {
      titulo: 'Gastos del día',
      valor: formatearMoneda(resumen.gastosHoy),
      icono: 'bg-amber-500',
      texto: 'text-amber-700',
    },
    {
      titulo: 'Utilidad del día',
      valor: formatearMoneda(resumen.utilidadHoy),
      icono: resumen.utilidadHoy >= 0 ? 'bg-teal-500' : 'bg-rose-500',
      texto: resumen.utilidadHoy >= 0 ? 'text-teal-700' : 'text-rose-700',
    },
  ]

  return (
    <div className="max-w-7xl">
      <h1 className={tituloPaginaCls}>Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">
        Resumen del día en tiempo real
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {fichas.map((f) => (
          <div
            key={f.titulo}
            className={`${cardCls} overflow-hidden`}
          >
            <div className="flex items-center gap-4 p-5">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white ${f.icono}`}
              >
                {f.titulo === 'Gastos del día' ? '−' : f.titulo === 'Utilidad del día' ? '±' : '+'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">{f.titulo}</p>
                <p className={`mt-0.5 truncate text-2xl font-bold ${f.texto}`}>{f.valor}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className={`${cardCls} p-5`}>
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Top servicios más vendidos hoy
          </h2>
          {resumen.topServicios.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
              Sin ventas registradas hoy.
            </p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {resumen.topServicios.map((s, i) => (
                <li key={s.nombre} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-400' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="font-medium text-slate-700">{s.nombre}</span>
                  </span>
                  <span className="text-sm text-slate-500">
                    {s.cantidad} unidad(es) ·{' '}
                    <span className="font-semibold text-slate-800">{formatearMoneda(s.total)}</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className={`${cardCls} p-5`}>
          <h2 className="mb-4 text-base font-semibold text-slate-900">
            Cajas abiertas
            <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
              {resumen.cajasAbiertas}
            </span>
          </h2>
          {cajas.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
              No hay cajas abiertas en este momento.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {cajas.map((c) => (
                <li key={c.id} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                      {c.usuario.nombre.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-medium text-slate-700">{c.usuario.nombre}</span>
                  </span>
                  <span className="text-sm text-slate-500">
                    {formatearMoneda(c.montoApertura)} ·{' '}
                    {new Intl.DateTimeFormat('es-BO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    }).format(c.fechaApertura)}
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