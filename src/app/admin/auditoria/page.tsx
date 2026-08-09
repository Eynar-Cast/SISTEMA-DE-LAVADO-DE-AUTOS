import { obtenerUltimaAuditoria, obtenerAccionesAuditoria } from '@/lib/queries'
import { AuditoriaPanel } from './auditoria-panel'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'

function fechaLocal(iso: string | undefined): Date | undefined {
  if (!iso) return undefined
  const [y, m, d] = iso.split('-').map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return undefined
  return new Date(y, m - 1, d)
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; accion?: string; desde?: string; hasta?: string; orden?: string }>
}) {
  const params = await searchParams

  const desde = fechaLocal(params.desde)
  const hastaBase = fechaLocal(params.hasta)
  if (hastaBase) hastaBase.setHours(23, 59, 59, 999)

  const [registros, acciones] = await Promise.all([
    obtenerUltimaAuditoria({
      busqueda: params.q?.trim() || undefined,
      accion: params.accion || undefined,
      desde,
      hasta: hastaBase,
      orden: params.orden === 'asc' ? 'asc' : 'desc',
    }),
    obtenerAccionesAuditoria(),
  ])

  return (
    <div>
      <h1 className={tituloPaginaCls}>Auditoría</h1>
      <p className={subtituloCls}>Registro de solo lectura. No se puede editar ni borrar.</p>
      <AuditoriaPanel registros={registros} acciones={acciones} />
    </div>
  )
}