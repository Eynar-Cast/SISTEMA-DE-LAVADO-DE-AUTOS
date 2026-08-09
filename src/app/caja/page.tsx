import { obtenerSesion } from '@/lib/session'
import { listarServicios, obtenerCajaActiva } from '@/lib/queries'
import { OperacionCaja } from './operacion-caja'

export default async function CajaPage() {
  const { usuario } = await obtenerSesion()
  if (!usuario) return null

  const [servicios, caja] = await Promise.all([
    listarServicios({ soloActivos: true }),
    obtenerCajaActiva(usuario.id),
  ])

  const cajaMapeada = caja
    ? {
        id: caja.id,
        montoApertura: caja.montoApertura.toNumber(),
        estado: caja.estado,
        fechaApertura: caja.fechaApertura,
        ventas: caja.ventas.map((v) => ({
          id: v.id,
          numeroCorrelativo: v.numeroCorrelativo,
          metodoPago: v.metodoPago,
          total: v.total.toNumber(),
          estadoVehiculo: v.estadoVehiculo,
          fecha: v.fecha,
          detalleVentas: v.detalleVentas.map((d) => ({
            servicioNombre: d.servicio.nombre,
            cantidad: d.cantidad,
          })),
        })),
        gastos: caja.gastos.map((g) => ({
          id: g.id,
          categoria: g.categoriaGasto.nombre,
          monto: g.monto.toNumber(),
          motivo: g.motivo,
          estado: g.estado,
          fecha: g.fecha,
        })),
      }
    : null

  return (
    <OperacionCaja
      usuario={{ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }}
      servicios={servicios}
      caja={cajaMapeada}
    />
  )
}