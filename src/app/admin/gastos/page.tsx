import { listarGastos } from '@/lib/queries'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'
import { GastosAdmin } from './gastos-admin'

export default async function AdminGastosPage() {
  const gastos = await listarGastos()

  return (
    <div>
      <h1 className={tituloPaginaCls}>Gastos</h1>
      <p className={subtituloCls}>Administra los gastos y anulaciones registrados por las cajas</p>
      <GastosAdmin gastos={gastos} />
    </div>
  )
}