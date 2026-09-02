 'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { jsPDF } from 'jspdf'
import type { VentaConDetalles, OrdenVentas } from '@/lib/queries'
import {
  formatearMoneda,
  formatearFecha,
  TEXTO_METODO_PAGO,
  TEXTO_ESTADO_VEHICULO,
} from '@/lib/format'
import { Icon } from '@/components/icons'
import {
  inputCls,
  cardCls,
  thCls,
  tdCls,
  tablaCls,
  badgeOkCls,
  btnPrimarioCls,
  btnSecundarioCls,
  btnExitoCls,
} from '@/components/ui'

function badgeMetodo(metodo: string) {
  const base = badgeOkCls
  if (metodo === 'QR')
    return `${base} bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300`
  if (metodo === 'tarjeta')
    return `${base} bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300`
  if (metodo === 'otro')
    return `${base} bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300`
  return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300`
}

function badgeEstado(estado: string) {
  const base = badgeOkCls
  if (estado === 'finalizado')
    return `${base} bg-green-100 text-green-700 dark:bg-emerald-500/15 dark:text-emerald-300`
  if (estado === 'pagado')
    return `${base} bg-blue-100 text-blue-700 dark:bg-sky-500/15 dark:text-sky-300`
  return `${base} bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300`
}

 export function VentasAdmin({ ventas }: { ventas: VentaConDetalles[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [busqueda, setBusqueda] = useState('')
  const [desde, setDesde] = useState(() => searchParams.get('desde') ?? '')
  const [hasta, setHasta] = useState(() => searchParams.get('hasta') ?? '')
  const [cliente, setCliente] = useState(() => searchParams.get('cliente') ?? '')
  const [placa, setPlaca] = useState(() => searchParams.get('placa') ?? '')
  const [orden, setOrden] = useState<OrdenVentas>(() => {
    const v = searchParams.get('orden')
    return v === 'fecha_asc' || v === 'correlativo_desc' || v === 'total_desc'
      ? v
      : 'fecha_desc'
  })

  function aplicar(e: React.FormEvent) {
    e.preventDefault()
    const p = new URLSearchParams()
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    if (cliente) p.set('cliente', cliente)
    if (placa) p.set('placa', placa)
    p.set('orden', orden)
    router.push(`/admin/ventas?${p.toString()}`)
  }

  function limpiar() {
    setDesde('')
    setHasta('')
    setCliente('')
    setPlaca('')
    setOrden('fecha_desc')
    router.push('/admin/ventas')
  }

  const filtradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase()
    if (!term) return ventas
    return ventas.filter((v) => {
      const servicios = v.detalleVentas
        .map((d) => d.servicio.nombre)
        .join(' ')
        .toLowerCase()
      const metodo = (TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago).toLowerCase()
      const estado = (TEXTO_ESTADO_VEHICULO[v.estadoVehiculo] ?? v.estadoVehiculo).toLowerCase()
      const infoCliente = `${v.cliente ?? ''} ${v.placa ?? ''}`.toLowerCase()
      return (
        `#${v.numeroCorrelativo}`.includes(term) ||
        String(v.numeroCorrelativo).includes(term) ||
        v.usuario.nombre.toLowerCase().includes(term) ||
        servicios.includes(term) ||
        metodo.includes(term) ||
        estado.includes(term) ||
        infoCliente.includes(term) ||
        formatearFecha(v.fecha).toLowerCase().includes(term)
      )
    })
  }, [ventas, busqueda])

  const totalFiltrado = filtradas.reduce((acc, v) => acc + v.total, 0)

  function exportarPDF() {
    const doc = new jsPDF()
    const datos = filtradas
    const totalExport = totalFiltrado
    const filtroCliente = searchParams.get('cliente')?.trim() ?? ''
    const filtroPlaca = searchParams.get('placa')?.trim() ?? ''
    const etiquetaFiltro =
      filtroCliente || filtroPlaca
        ? `Filtro: ${[filtroCliente ? `Cliente "${filtroCliente}"` : null, filtroPlaca ? `Placa "${filtroPlaca}"` : null].filter(Boolean).join(' · ')}`
        : null

    doc.setFontSize(16)
    doc.text('Reporte de Ventas', 14, 22)
    doc.setFontSize(10)
    doc.text(`Generado: ${new Date().toLocaleString('es-BO')}`, 14, 30)
    if (etiquetaFiltro) doc.text(etiquetaFiltro, 14, 36)
    doc.text(
      `Total: ${datos.length} venta${datos.length !== 1 ? 's' : ''} · ${formatearMoneda(totalExport)}`,
      14,
      etiquetaFiltro ? 42 : 36,
    )

    const inicioY = etiquetaFiltro ? 50 : 44
    // Anchos suman 190mm = ancho útil A4 (210 - margen 10+10). Antes sumaban 208 y se desbordaba a la derecha.
    const columnas = [
      { cabecera: '#', ancho: 10 },
      { cabecera: 'Fecha', ancho: 22 },
      { cabecera: 'Cliente', ancho: 26 },
      { cabecera: 'Placa', ancho: 18 },
      { cabecera: 'Servicios', ancho: 52 },
      { cabecera: 'Método', ancho: 18 },
      { cabecera: 'Vendedor', ancho: 22 },
      { cabecera: 'Total', ancho: 22 },
    ]
    const anchoTotal = columnas.reduce((a, c) => a + c.ancho, 0)

    function ajustarTexto(texto: string, anchoMax: number): string {
      const t = texto ?? ''
      if (doc.getTextWidth(t) <= anchoMax - 2) return t
      let recortado = t
      while (recortado.length > 0 && doc.getTextWidth(recortado + '…') > anchoMax - 2) {
        recortado = recortado.slice(0, -1)
      }
      return recortado + '…'
    }

    function pintarCabecera(y: number) {
      doc.setFontSize(8)
      doc.setFillColor(31, 78, 216)
      doc.setTextColor(255, 255, 255)
      let x = 10
      columnas.forEach((col) => {
        doc.rect(x, y, col.ancho, 7, 'F')
        doc.text(col.cabecera, x + 1, y + 5)
        x += col.ancho
      })
      doc.setTextColor(0, 0, 0)
    }

    pintarCabecera(inicioY)

    let yActual = inicioY + 7
    const altoFila = 6
    datos.forEach((v) => {
      if (yActual + altoFila > 278) {
        doc.addPage()
        pintarCabecera(inicioY)
        yActual = inicioY + 7
      }
      let xPos = 10
      const servicios = v.detalleVentas.map((d) => `${d.servicio.nombre} x${d.cantidad}`).join(', ')
      const fila = [
        `#${v.numeroCorrelativo}`,
        formatearFecha(v.fecha),
        v.cliente ?? '-',
        v.placa ?? '-',
        servicios,
        TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago,
        v.usuario.nombre,
        formatearMoneda(v.total),
      ]
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      fila.forEach((val, idx) => {
        const anchoCol = columnas[idx].ancho
        const textoAjustado = ajustarTexto(val, anchoCol)
        const alignRight = idx === columnas.length - 1
        if (alignRight) {
          doc.text(textoAjustado, xPos + anchoCol - 1, yActual + 4, { align: 'right' })
        } else {
          doc.text(textoAjustado, xPos + 1, yActual + 4)
        }
        xPos += anchoCol
      })
      yActual += altoFila
    })

    if (yActual + 8 > 285) {
      doc.addPage()
      pintarCabecera(inicioY)
      yActual = inicioY + 7
    }
    doc.setFillColor(241, 245, 249)
    doc.rect(10, yActual, anchoTotal, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(`TOTAL ACUMULADO  (${datos.length} venta${datos.length !== 1 ? 's' : ''})`, 12, yActual + 5.5)
    doc.text(formatearMoneda(totalExport), 10 + anchoTotal - 2, yActual + 5.5, { align: 'right' })
    if (filtroCliente) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(100, 116, 139)
      doc.text(`Suma total de gastos del cliente "${filtroCliente}" en el período filtrado`, 12, yActual + 11)
      doc.setTextColor(0, 0, 0)
    }

    const nombreArchivo = filtroCliente
      ? `reporte-ventas-${filtroCliente.replace(/\s+/g, '_')}.pdf`
      : filtroPlaca
        ? `reporte-ventas-${filtroPlaca}.pdf`
        : 'reporte-ventas.pdf'
    doc.save(nombreArchivo)
  }

  return (
    <div className={cardCls}>
      <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Historial de ventas
          </h2>
          <span className={`${badgeOkCls} bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300`}>
            {ventas.length} ventas
          </span>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400 dark:text-slate-500">
            <Icon nombre="ventas" className="h-4 w-4" />
          </span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por correlativo, cliente, placa..."
            className={`${inputCls} pl-9`}
          />
        </div>
      </div>

       <form
         onSubmit={aplicar}
         className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700"
       >
         <div>
           <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
             Desde
           </label>
           <div className="w-full sm:w-44">
             <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={inputCls} />
           </div>
         </div>
         <div>
           <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
             Hasta
           </label>
           <div className="w-full sm:w-44">
             <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={inputCls} />
           </div>
         </div>
         <div>
           <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
             Cliente
           </label>
           <div className="w-full sm:w-44">
             <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre..." className={inputCls} />
           </div>
         </div>
         <div>
           <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
             Placa
           </label>
           <div className="w-full sm:w-36">
             <input type="text" value={placa} onChange={(e) => setPlaca(e.target.value)} placeholder="ABC-123..." className={inputCls} />
           </div>
         </div>
         <div>
           <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
             Ordenar por
           </label>
           <div className="w-full sm:w-56">
             <select value={orden} onChange={(e) => setOrden(e.target.value as OrdenVentas)} className={inputCls}>
               <option value="fecha_desc">Fecha (reciente primero)</option>
               <option value="fecha_asc">Fecha (antigua primero)</option>
               <option value="correlativo_desc">Correlativo (mayor primero)</option>
               <option value="total_desc">Monto (mayor primero)</option>
             </select>
           </div>
         </div>
         <div className="flex gap-2">
           <button type="submit" className={btnPrimarioCls}>
             Consultar
           </button>
           <button type="button" onClick={exportarPDF} className={btnExitoCls}>
             PDF
           </button>
           <button type="button" onClick={limpiar} className={btnSecundarioCls}>
             Limpiar
           </button>
         </div>
       </form>

      {ventas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <Icon nombre="ventas" className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No hay ventas en el período seleccionado.
          </p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <Icon nombre="ventas" className="h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="text-sm text-slate-400 dark:text-slate-500">
            No se encontraron resultados para «{busqueda}».
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className={`${tablaCls} min-w-[960px]`}>
            <thead>
               <tr className="border-b border-slate-200 dark:border-slate-700">
                 <th className={thCls}>Correlativo</th>
                 <th className={thCls}>Fecha</th>
                 <th className={thCls}>Cliente</th>
                 <th className={thCls}>Placa</th>
                 <th className={thCls}>Servicios</th>
                 <th className={thCls}>Método de pago</th>
                 <th className={thCls}>Estado vehículo</th>
                 <th className={thCls}>Vendedor</th>
                 <th className={`${thCls} text-right`}>Total</th>
               </tr>
             </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
               {filtradas.map((v) => (
                 <tr key={v.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-700/40">
                   <td className={tdCls}>
                     <span className="font-semibold text-sky-700 dark:text-sky-300">
                       #{v.numeroCorrelativo}
                     </span>
                   </td>
                   <td className={`${tdCls} whitespace-nowrap`}>{formatearFecha(v.fecha)}</td>
                   <td className={tdCls}>
                     <span className="block truncate">{v.cliente ?? '-'}</span>
                   </td>
                   <td className={tdCls}>
                     <span className="block truncate">{v.placa ?? '-'}</span>
                   </td>
                   <td className={`${tdCls} max-w-[260px]`}>
                     <span className="block truncate">
                       {v.detalleVentas
                         .map((d) => `${d.servicio.nombre} x${d.cantidad}`)
                         .join(', ')}
                     </span>
                   </td>
                   <td className={tdCls}>
                     <span className={badgeMetodo(v.metodoPago)}>
                       {TEXTO_METODO_PAGO[v.metodoPago] ?? v.metodoPago}
                     </span>
                   </td>
                   <td className={tdCls}>
                     <span className={badgeEstado(v.estadoVehiculo)}>
                       {TEXTO_ESTADO_VEHICULO[v.estadoVehiculo] ?? v.estadoVehiculo}
                     </span>
                   </td>
                   <td className={tdCls}>{v.usuario.nombre}</td>
                   <td className={`${tdCls} text-right font-semibold`}>{formatearMoneda(v.total)}</td>
                 </tr>
               ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/40">
                <td colSpan={7} className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {filtradas.length} resultado{filtradas.length !== 1 ? 's' : ''}
                </td>
                <td className={`${tdCls} text-right font-semibold text-slate-500 dark:text-slate-400`}>
                  Total
                </td>
                <td className={`${tdCls} text-right font-bold text-slate-900 dark:text-slate-100`}>
                  {formatearMoneda(totalFiltrado)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}