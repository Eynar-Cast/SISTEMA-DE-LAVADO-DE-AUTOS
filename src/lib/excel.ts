import ExcelJS from 'exceljs'

const NOMBRE_ARCHIVO = 'reporte-lavado.xlsx'
const FORMATO_MONEDA = '"Bs "#,##0.00'
const COLOR_ENCABEZADO = 'FF1D4ED8'
const COLOR_TITULO = 'FF0F172A'
const COLOR_BANDA = 'FFF1F5F9'
const COLOR_TEXTO_BORDE = 'FF64748B'

export type CeldaFila = string | number

export type HojaExporte = {
  nombre: string
  prefacio?: CeldaFila[][]
  encabezados: CeldaFila[]
  filas: CeldaFila[][]
  columnasMoneda?: number[]
  congelar?: boolean
}

export type ResultadoExporte = { ok: boolean; motivo?: string }

function anchoDeCelda(celda: CeldaFila): number {
  if (typeof celda === 'number') return Math.round(Math.abs(celda)).toString().length + 8
  return Array.from(String(celda)).length
}

function calcularAnchos(aoa: CeldaFila[][]): number[] {
  const maxCol = Math.max(0, ...aoa.map((fila) => fila.length))
  const anchos: number[] = new Array(maxCol).fill(0)
  aoa.forEach((fila) =>
    fila.forEach((celda, col) => {
      const largo = anchoDeCelda(celda)
      if (largo > anchos[col]) anchos[col] = largo
    })
  )
  return anchos
}

function nombreHoja(nombre: string): string {
  const limpio = nombre.replace(/[\\\/\?\*\x5B\x5D\:]/g, '').trim()
  return limpio.slice(0, 31) || 'Hoja'
}

function descargar(datos: Uint8Array) {
  const blob = new Blob([datos as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = NOMBRE_ARCHIVO
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function exportarExcel(hojas: HojaExporte[]): Promise<ResultadoExporte> {
  try {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Sistema Car Wash'
    wb.created = new Date()

    hojas.forEach((hoja) => {
      const ws = wb.addWorksheet(nombreHoja(hoja.nombre))
      ws.views = [{ state: 'frozen', ySplit: 0, xSplit: 0 }]

      const aoa = [...(hoja.prefacio ?? []), hoja.encabezados, ...hoja.filas]
      const maxCols = Math.max(0, ...aoa.map((f) => f.length))
      const filaEncabezado = (hoja.prefacio?.length ?? 0) + 1

      ws.properties.defaultRowHeight = 18

      // Filas de prefacio (título / período / generado)
      hoja.prefacio?.forEach((fila, i) => {
        const filaExcel = ws.addRow(fila)
        filaExcel.eachCell((celda) => {
          celda.font = {
            name: 'Calibri',
            size: i === 0 ? 14 : 11,
            bold: i === 0 || i > 0,
            color: { argb: i === 0 ? 'FFFFFFFF' : 'FF334155' },
          }
          celda.fill =
            i === 0
              ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITULO } }
              : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BANDA } }
          celda.alignment = {
            vertical: 'middle',
            horizontal: i === 0 ? 'center' : 'left',
          }
        })
        if (i === 0 && maxCols > 0) {
          ws.mergeCells(filaExcel.number, 1, filaExcel.number, maxCols)
          ws.getRow(filaExcel.number).height = 26
        }
      })

      // Fila de encabezados
      const filaHeader = ws.addRow(hoja.encabezados)
      filaHeader.eachCell((celda) => {
        celda.font = {
          name: 'Calibri',
          size: 11,
          bold: true,
          color: { argb: 'FFFFFFFF' },
        }
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ENCABEZADO } }
        celda.alignment = { vertical: 'middle', horizontal: 'center' }
        celda.border = {
          bottom: { style: 'thin', color: { argb: COLOR_TEXTO_BORDE } },
        }
      })
      filaHeader.height = 22

      // Filas de datos
      hoja.filas.forEach((fila, i) => {
        const filaExcel = ws.addRow(fila)
        filaExcel.eachCell((celda, col) => {
          celda.alignment = { vertical: 'middle' }
          if (i % 2 === 1) {
            celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BANDA } }
          }
          if (hoja.columnasMoneda?.includes(col - 1)) {
            if (typeof celda.value === 'number') {
              celda.numFmt = FORMATO_MONEDA
              celda.alignment = { vertical: 'middle', horizontal: 'right' }
            }
          }
        })
      })

      // Fila total cuando hay moneda al final
      const ultimaColMoneda = (hoja.columnasMoneda ?? []).slice(-1)[0]
      if (hoja.filas.length > 0 && ultimaColMoneda !== undefined) {
        const filaTotal = ws.addRow(
          hoja.encabezados.map((_, c) =>
            c === 0
              ? 'TOTAL'
              : hoja.columnasMoneda?.some((m) => m === c)
                ? hoja.filas.reduce(
                    (acc, f) => acc + (typeof f[c] === 'number' ? (f[c] as number) : 0),
                    0
                  )
                : ''
          )
        )
        filaTotal.eachCell((celda, col) => {
          celda.font = { name: 'Calibri', size: 11, bold: true }
          if (hoja.columnasMoneda?.some((m) => m === col - 1)) {
            if (typeof celda.value === 'number') {
              celda.numFmt = FORMATO_MONEDA
              celda.alignment = { vertical: 'middle', horizontal: 'right' }
            }
          } else {
            celda.alignment = { vertical: 'middle' }
          }
        })
        ws.getRow(filaTotal.number).height = 20
      }

      // Anchos de columna
      const anchos = calcularAnchos(aoa)
      anchos.forEach((ancho, i) => {
        ws.getColumn(i + 1).width = Math.min(48, Math.max(10, ancho + 2))
      })

      // Autofiltro y congelamiento sobre la fila de encabezados
      if (hoja.congelar && hoja.filas.length > 0) {
        ws.views = [{ state: 'frozen', ySplit: filaEncabezado, xSplit: 0 }]
        ws.autoFilter = {
          from: { row: filaEncabezado, column: 1 },
          to: { row: filaEncabezado + hoja.filas.length, column: Math.max(1, maxCols) },
        }
      }
    })

    const buffer = (await wb.xlsx.writeBuffer()) as unknown as Uint8Array
    const u8 = new Uint8Array(buffer)
    descargar(u8)
    return { ok: true }
  } catch {
    return { ok: false, motivo: 'No se pudo generar el archivo Excel.' }
  }
}