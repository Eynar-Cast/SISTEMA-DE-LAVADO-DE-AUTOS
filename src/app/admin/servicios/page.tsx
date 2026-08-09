import { listarServicios } from '@/lib/queries'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'
import { ServiciosManager } from './servicios-manager'

export default async function ServiciosPage() {
  const servicios = await listarServicios()

  return (
    <div>
      <h1 className={tituloPaginaCls}>Servicios</h1>
      <p className={subtituloCls}>Administra los servicios que se ofrecen en el lavado</p>
      <ServiciosManager servicios={servicios} />
    </div>
  )
}