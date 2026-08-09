export function formatearMoneda(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return 'Bs 0,00'
  const n = typeof valor === 'string' ? Number(valor) : valor
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'BOB',
  }).format(n)
}

export function formatearFecha(fecha: Date | string | null | undefined): string {
  if (!fecha) return ''
  const d = typeof fecha === 'string' ? new Date(fecha) : fecha
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d)
}

export const METODOS_PAGO = ['efectivo', 'QR', 'tarjeta', 'otro'] as const

export const ESTADOS_VEHICULO = ['registrado', 'pagado', 'finalizado'] as const

export const ESTADOS_GASTO = ['activo', 'pendiente_autorizacion', 'anulado'] as const

export const ESTADOS_CAJA = ['abierta', 'cerrada'] as const