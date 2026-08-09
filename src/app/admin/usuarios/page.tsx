import { listarUsuarios, listarRoles, type OrdenUsuarios } from '@/lib/queries'
import { fechaDesdeISO } from '@/lib/reportes'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'
import { UsuariosManager } from './usuarios-manager'

const ORDENES_VALIDAS: OrdenUsuarios[] = ['creado_desc', 'creado_asc', 'nombre_asc', 'rol_asc']

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; orden?: string }>
}) {
  const params = await searchParams
  const desde = fechaDesdeISO(params.desde) ?? undefined
  const hasta = fechaDesdeISO(params.hasta) ?? undefined
  const orden: OrdenUsuarios = ORDENES_VALIDAS.includes(params.orden as OrdenUsuarios)
    ? (params.orden as OrdenUsuarios)
    : 'creado_asc'

  const [usuarios, roles] = await Promise.all([
    listarUsuarios({ fechaDesde: desde, fechaHasta: hasta, orden }),
    listarRoles(),
  ])

  return (
    <div>
      <h1 className={tituloPaginaCls}>Usuarios</h1>
      <p className={subtituloCls}>Gestiona los usuarios del sistema y sus roles de acceso</p>
      <UsuariosManager usuarios={usuarios} roles={roles} />
    </div>
  )
}