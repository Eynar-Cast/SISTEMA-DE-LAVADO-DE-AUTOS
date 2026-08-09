import { listarVentas } from '@/lib/queries'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'
import { VentasAdmin } from './ventas-admin'

export default async function AdminVentasPage() {
  const ventas = await listarVentas()

  return (
    <div>
      <h1 className={tituloPaginaCls}>Ventas</h1>
      <p className={subtituloCls}>Historial de todas las ventas registradas en el sistema</p>
      <VentasAdmin ventas={ventas} />
    </div>
  )
}