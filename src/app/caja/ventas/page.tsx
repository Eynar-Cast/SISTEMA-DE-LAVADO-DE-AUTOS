import { obtenerSesion } from '@/lib/session'
import { obtenerCajaActiva } from '@/lib/queries'
import { tituloPaginaCls, subtituloCls } from '@/components/ui'
import { VentasTurno } from './ventas-turno'

export default async function VentasTurnoPage() {
  const { usuario } = await obtenerSesion()
  if (!usuario) return null

  const caja = await obtenerCajaActiva(usuario.id)

  const ventas = caja
    ? caja.ventas.map((v) => ({
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
      }))
    : []

  return (
    <div>
      <h1 className={tituloPaginaCls}>Ventas del turno</h1>
      <p className={subtituloCls}>
        {caja
          ? `Caja #${caja.id} · Mostrando solo las ventas de este turno`
          : 'No hay una caja abierta en este turno.'}
      </p>
      <VentasTurno ventas={ventas} cajaAbierta={!!caja && caja.estado === 'abierta'} />
    </div>
  )
}