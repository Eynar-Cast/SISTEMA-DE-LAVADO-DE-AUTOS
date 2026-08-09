import { listarUsuarios, listarRoles } from '@/lib/queries'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'
import { UsuariosManager } from './usuarios-manager'

export default async function UsuariosPage() {
  const [usuarios, roles] = await Promise.all([listarUsuarios(), listarRoles()])

  return (
    <div>
      <h1 className={tituloPaginaCls}>Usuarios</h1>
      <p className={subtituloCls}>Gestiona los usuarios del sistema y sus roles de acceso</p>
      <UsuariosManager usuarios={usuarios} roles={roles} />
    </div>
  )
}