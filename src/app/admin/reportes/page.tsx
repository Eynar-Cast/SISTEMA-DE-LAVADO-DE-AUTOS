import {
  obtenerReporteRango,
  obtenerResumenMensual,
  obtenerDetalleReporte,
  fechaDesdeISO,
} from '@/lib/reportes'
import { ReportesPanel } from './reportes-panel'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const params = await searchParams
  const hoy = new Date()

  const desde = fechaDesdeISO(params.desde) ?? new Date(hoy.getTime() - 30 * 86400000)
  const hasta = fechaDesdeISO(params.hasta) ?? hoy

  const [reporte, detalle, mensual] = await Promise.all([
    obtenerReporteRango(desde, hasta),
    obtenerDetalleReporte(desde, hasta),
    obtenerResumenMensual(),
  ])

  return (
    <div>
      <h1 className={tituloPaginaCls}>Reportes</h1>
      <p className={subtituloCls}>Resumen de ventas, gastos y utilidad del período</p>
      <ReportesPanel reporte={reporte} detalle={detalle} mensual={mensual} />
    </div>
  )
}