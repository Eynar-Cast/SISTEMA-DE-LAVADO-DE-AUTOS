import { obtenerResumenDashboard } from '@/lib/reportes'
import { listarCajas } from '@/lib/queries'
import { formatearMoneda } from '@/lib/format'
import { Icon } from '@/components/icons'
import { cardCls, cardHeaderCls, tituloPaginaCls, subtituloCls } from '@/components/ui'

export default async function DashboardPage() {
  const resumen = await obtenerResumenDashboard()
  const cajas = await listarCajas({ incluirCerradas: false })

  const fichas = [
    {
      titulo: 'Vehículos hoy',
      valor: String(resumen.vehiculosHoy),
      icono: 'bg-sky-500 dark:bg-sky-600',
      texto: 'text-sky-700 dark:text-sky-300',
      icon: 'servicio',
    },
    {
      titulo: 'Ingresos del día',
      valor: formatearMoneda(resumen.ingresosHoy),
      icono: 'bg-emerald-500 dark:bg-emerald-600',
      texto: 'text-emerald-700 dark:text-emerald-300',
      icon: 'ventas',
    },
    {
      titulo: 'Gastos del día',
      valor: formatearMoneda(resumen.gastosHoy),
      icono: 'bg-amber-500 dark:bg-amber-600',
      texto: 'text-amber-700 dark:text-amber-300',
      icon: 'gastos',
    },
    {
      titulo: 'Utilidad del día',
      valor: formatearMoneda(resumen.utilidadHoy),
      icono: resumen.utilidadHoy >= 0 ? 'bg-teal-500 dark:bg-teal-600' : 'bg-rose-500 dark:bg-rose-600',
      texto:
        resumen.utilidadHoy >= 0
          ? 'text-teal-700 dark:text-teal-300'
          : 'text-rose-700 dark:text-rose-300',
      icon: 'caja',
    },
  ]

  return (
    <div className="max-w-7xl">
      <h1 className={tituloPaginaCls}>Dashboard</h1>
      <p className={subtituloCls}>Resumen del día en tiempo real</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {fichas.map((f) => (
          <div key={f.titulo} className={`${cardCls} overflow-hidden transition hover:shadow-md`}>
            <div className="flex items-center gap-4 p-5">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${f.icono}`}
              >
                <Icon nombre={f.icon} className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{f.titulo}</p>
                <p className={`mt-0.5 truncate text-2xl font-bold ${f.texto}`}>{f.valor}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className={`${cardCls} p-5`}>
          <h2 className={cardHeaderCls}>Top servicios más vendidos hoy</h2>
          {resumen.topServicios.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
              <Icon nombre="servicio" className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">Sin ventas registradas hoy.</p>
            </div>
          ) : (
            <ol className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {resumen.topServicios.map((s, i) => (
                <li key={s.nombre} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                        i === 0
                          ? 'bg-amber-400'
                          : i === 1
                            ? 'bg-slate-400'
                            : i === 2
                              ? 'bg-orange-400'
                              : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {s.nombre}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
                    {s.cantidad} unidad(es) ·{' '}
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {formatearMoneda(s.total)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className={`${cardCls} p-5`}>
          <h2 className={cardHeaderCls}>
            Cajas abiertas
            <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              {resumen.cajasAbiertas}
            </span>
          </h2>
          {cajas.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-8 text-center dark:border-slate-700">
              <Icon nombre="caja" className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-400 dark:text-slate-500">
                No hay cajas abiertas en este momento.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {cajas.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {c.usuario.nombre.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {c.usuario.nombre}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-slate-500 dark:text-slate-400">
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