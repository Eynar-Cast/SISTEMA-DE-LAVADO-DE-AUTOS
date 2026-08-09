import { listarGastos } from '@/lib/queries'
import { GastosAdmin } from './gastos-admin'

export default async function AdminGastosPage() {
  const gastos = await listarGastos()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Gastos</h1>
      <GastosAdmin gastos={gastos} />
    </div>
  )
}