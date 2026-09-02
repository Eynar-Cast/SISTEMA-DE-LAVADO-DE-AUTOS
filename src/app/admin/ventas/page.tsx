import { listarVentas, type OrdenVentas } from '@/lib/queries'
import { fechaDesdeISO } from '@/lib/reportes'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'
import { VentasAdmin } from './ventas-admin'

const ORDENES_VALIDAS: OrdenVentas[] = ['fecha_desc', 'fecha_asc', 'correlativo_desc', 'total_desc']

export default async function AdminVentasPage({
  searchParams,
}: {
  searchParams: Promise<{
    desde?: string
    hasta?: string
    orden?: string
    cliente?: string
    placa?: string
  }>
}) {
  const params = await searchParams
  const desde = fechaDesdeISO(params.desde) ?? undefined
  const hasta = fechaDesdeISO(params.hasta) ?? undefined
  const orden: OrdenVentas = ORDENES_VALIDAS.includes(params.orden as OrdenVentas)
    ? (params.orden as OrdenVentas)
    : 'fecha_desc'
  const cliente = params.cliente ?? undefined
  const placa = params.placa ?? undefined

  const ventas = await listarVentas({
    fechaDesde: desde,
    fechaHasta: hasta,
    orden,
    cliente,
    placa,
  })

  return (
    <div>
      <h1 className={tituloPaginaCls}>Ventas</h1>
      <p className={subtituloCls}>Historial de todas las ventas registradas en el sistema</p>
      <VentasAdmin ventas={ventas} />
    </div>
  )
}