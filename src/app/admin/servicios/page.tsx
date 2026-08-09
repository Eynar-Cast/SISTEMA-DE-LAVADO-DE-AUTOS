import { listarServicios } from '@/lib/queries'
import { ServiciosManager } from './servicios-manager'

export default async function ServiciosPage() {
  const servicios = await listarServicios()

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Servicios</h1>
      <ServiciosManager servicios={servicios} />
    </div>
  )
}