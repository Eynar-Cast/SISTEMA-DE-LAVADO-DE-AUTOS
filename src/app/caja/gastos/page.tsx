import { obtenerSesion } from '@/lib/session'
import { obtenerCajaActiva, listarCategoriasGasto } from '@/lib/queries'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'
import { GastosCaja } from './gastos-caja'

export default async function GastosCajaPage() {
  const { usuario } = await obtenerSesion()
  if (!usuario) return null

  const [categorias, caja] = await Promise.all([
    listarCategoriasGasto(),
    obtenerCajaActiva(usuario.id),
  ])

  const gastos = caja
    ? caja.gastos.map((g) => ({
        id: g.id,
        categoria: g.categoriaGasto.nombre,
        monto: g.monto.toNumber(),
        motivo: g.motivo,
        estado: g.estado,
        fecha: g.fecha,
        estadoCaja: caja.estado,
      }))
    : []

  return (
    <div>
      <h1 className={tituloPaginaCls}>Gastos del turno</h1>
      <p className={subtituloCls}>Registra los gastos de la caja durante el turno.</p>
      <GastosCaja
        categorias={categorias}
        gastos={gastos}
        cajaAbierta={!!caja && caja.estado === 'abierta'}
      />
    </div>
  )
}