import { listarGastos, type OrdenGastos } from '@/lib/queries'
import { fechaDesdeISO } from '@/lib/reportes'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'
import { GastosAdmin } from './gastos-admin'

const ORDENES_VALIDAS: OrdenGastos[] = ['fecha_desc', 'fecha_asc', 'monto_desc', 'monto_asc']

export default async function AdminGastosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; orden?: string }>
}) {
  const params = await searchParams
  const desde = fechaDesdeISO(params.desde) ?? undefined
  const hasta = fechaDesdeISO(params.hasta) ?? undefined
  const orden: OrdenGastos = ORDENES_VALIDAS.includes(params.orden as OrdenGastos)
    ? (params.orden as OrdenGastos)
    : 'fecha_desc'

  const gastos = await listarGastos({ fechaDesde: desde, fechaHasta: hasta, orden })

  return (
    <div>
      <h1 className={tituloPaginaCls}>Gastos</h1>
      <p className={subtituloCls}>Administra los gastos y anulaciones registrados por las cajas</p>
      <GastosAdmin gastos={gastos} />
    </div>
  )
}