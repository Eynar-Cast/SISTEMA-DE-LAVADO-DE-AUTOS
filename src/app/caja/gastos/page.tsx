import { obtenerSesion } from '@/lib/session'
import { obtenerCajaActiva, listarCategoriasGasto } from '@/lib/queries'
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
      <h1 className="mb-6 text-2xl font-bold text-gray-800">Gastos del turno</h1>
      <GastosCaja
        categorias={categorias}
        gastos={gastos}
        cajaAbierta={!!caja && caja.estado === 'abierta'}
      />
    </div>
  )
}