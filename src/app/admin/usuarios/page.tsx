import { listarUsuarios, listarRoles } from '@/lib/queries'
import { UsuariosManager } from './usuarios-manager'

export default async function UsuariosPage() {
  const [usuarios, roles] = await Promise.all([listarUsuarios(), listarRoles()])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-slate-900">Usuarios</h1>
      <UsuariosManager usuarios={usuarios} roles={roles} />
    </div>
  )
}