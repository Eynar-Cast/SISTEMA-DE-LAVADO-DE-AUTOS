import { obtenerReporteRango, obtenerResumenMensual, fechaDesdeISO } from '@/lib/reportes'
import { ReportesPanel } from './reportes-panel'

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const params = await searchParams
  const hoy = new Date()

  const desde = fechaDesdeISO(params.desde) ?? new Date(hoy.getTime() - 30 * 86400000)
  const hasta = fechaDesdeISO(params.hasta) ?? hoy

  const [reporte, mensual] = await Promise.all([
    obtenerReporteRango(desde, hasta),
    obtenerResumenMensual(),
  ])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Reportes</h1>
      <ReportesPanel reporte={reporte} mensual={mensual} />
    </div>
  )
}