import ExcelJS from 'exceljs'

const NOMBRE_ARCHIVO = 'reporte-lavado.xlsx'
const FORMATO_MONEDA = '"Bs "#,##0.00'
const COLOR_ENCABEZADO = 'FF1D4ED8'
const COLOR_TITULO = 'FF0F172A'
const COLOR_BANDA = 'FFF1F5F9'
const COLOR_TEXTO_BORDE = 'FF64748B'
const COLOR_BLOQUE_TITULO = 'FF334155'

export type CeldaFila = string | number

export type BloqueTabla = {
  titulo?: string
  encabezados: CeldaFila[]
  filas: CeldaFila[][]
  columnasMoneda?: number[]
  sinTotal?: boolean
}

export type HojaExporte = {
  nombre: string
  prefacio?: CeldaFila[][]
  bloques?: BloqueTabla[]
  encabezados?: CeldaFila[]
  filas?: CeldaFila[][]
  columnasMoneda?: number[]
  congelar?: boolean
  sinTotal?: boolean
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

function estilizarHeader(fila: ExcelJS.Row) {
  fila.eachCell((celda) => {
    celda.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_ENCABEZADO } }
    celda.alignment = { vertical: 'middle', horizontal: 'center' }
    celda.border = { bottom: { style: 'thin', color: { argb: COLOR_TEXTO_BORDE } } }
  })
  fila.height = 22
}

function estilizarFilaDatos(fila: ExcelJS.Row, esImpar: boolean, columnasMoneda?: number[]) {
  fila.eachCell((celda, col) => {
    celda.alignment = { vertical: 'middle' }
    if (esImpar) {
      celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BANDA } }
    }
    if (columnasMoneda?.includes(col - 1) && typeof celda.value === 'number') {
      celda.numFmt = FORMATO_MONEDA
      celda.alignment = { vertical: 'middle', horizontal: 'right' }
    }
  })
}

function agregarFilaTotal(
  ws: ExcelJS.Worksheet,
  encabezados: CeldaFila[],
  filas: CeldaFila[][],
  columnasMoneda?: number[]
) {
  const ultimaColMoneda = (columnasMoneda ?? []).slice(-1)[0]
  if (filas.length === 0 || ultimaColMoneda === undefined) return

  const filaTotal = ws.addRow(
    encabezados.map((_, c) =>
      c === 0
        ? 'TOTAL'
        : columnasMoneda?.some((m) => m === c)
          ? filas.reduce((acc, f) => acc + (typeof f[c] === 'number' ? (f[c] as number) : 0), 0)
          : ''
    )
  )
  filaTotal.eachCell((celda, col) => {
    celda.font = { name: 'Calibri', size: 11, bold: true }
    if (columnasMoneda?.some((m) => m === col - 1) && typeof celda.value === 'number') {
      celda.numFmt = FORMATO_MONEDA
      celda.alignment = { vertical: 'middle', horizontal: 'right' }
    } else {
      celda.alignment = { vertical: 'middle' }
    }
  })
  ws.getRow(filaTotal.number).height = 20
}

export async function exportarExcel(hojas: HojaExporte[]): Promise<ResultadoExporte> {
  try {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'Sistema Car Wash'
    wb.created = new Date()

    hojas.forEach((hoja) => {
      const ws = wb.addWorksheet(nombreHoja(hoja.nombre))
      ws.properties.defaultRowHeight = 18

      // Filas de prefacio (título / período / generado)
      hoja.prefacio?.forEach((fila, i) => {
        const filaExcel = ws.addRow(fila)
        filaExcel.eachCell((celda) => {
          celda.font = {
            name: 'Calibri',
            size: i === 0 ? 14 : 11,
            bold: true,
            color: { argb: i === 0 ? 'FFFFFFFF' : 'FF334155' },
          }
          celda.fill =
            i === 0
              ? { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_TITULO } }
              : { type: 'pattern', pattern: 'solid', fgColor: { argb: COLOR_BANDA } }
          celda.alignment = { vertical: 'middle', horizontal: i === 0 ? 'center' : 'left' }
        })
        if (i === 0) {
          ws.mergeCells(filaExcel.number, 1, filaExcel.number, 3)
          ws.getRow(filaExcel.number).height = 26
        }
      })

      const aoaAncho: CeldaFila[][] = [...(hoja.prefacio ?? [])]

      if (hoja.bloques && hoja.bloques.length > 0) {
        // --- Hoja de MÚLTIPLES bloques apilados (ej. Resumen completo) ---
        hoja.bloques.forEach((bloque) => {
          if (bloque.titulo) {
            const filaTitulo = ws.addRow([bloque.titulo])
            filaTitulo.getCell(1).font = {
              name: 'Calibri',
              size: 12,
              bold: true,
              color: { argb: COLOR_BLOQUE_TITULO },
            }
            filaTitulo.height = 20
          }

          const filaHeader = ws.addRow(bloque.encabezados)
          estilizarHeader(filaHeader)

          bloque.filas.forEach((fila, i) => {
            const filaExcel = ws.addRow(fila)
            estilizarFilaDatos(filaExcel, i % 2 === 1, bloque.columnasMoneda)
          })

          if (!bloque.sinTotal) {
            agregarFilaTotal(ws, bloque.encabezados, bloque.filas, bloque.columnasMoneda)
          }

          ws.addRow([]) // espacio en blanco entre bloques

          aoaAncho.push(bloque.encabezados, ...bloque.filas)
        })
      } else {
        // --- Hoja de tabla ÚNICA (comportamiento anterior) ---
        const encabezados = hoja.encabezados ?? []
        const filas = hoja.filas ?? []
        const filaEncabezado = (hoja.prefacio?.length ?? 0) + 1
        const maxCols = Math.max(0, ...[...aoaAncho, encabezados, ...filas].map((f) => f.length))

        const filaHeader = ws.addRow(encabezados)
        estilizarHeader(filaHeader)

        filas.forEach((fila, i) => {
          const filaExcel = ws.addRow(fila)
          estilizarFilaDatos(filaExcel, i % 2 === 1, hoja.columnasMoneda)
        })

        if (!hoja.sinTotal) {
          agregarFilaTotal(ws, encabezados, filas, hoja.columnasMoneda)
        }

        if (hoja.congelar && filas.length > 0) {
          const celdaTopLeft = `A${filaEncabezado + 1}`
          ws.views = [{ state: 'frozen', ySplit: filaEncabezado, activeCell: celdaTopLeft }]
          ws.autoFilter = {
            from: { row: filaEncabezado, column: 1 },
            to: { row: filaEncabezado + filas.length, column: Math.max(1, maxCols) },
          }
        }

        aoaAncho.push(encabezados, ...filas)
      }

      const anchos = calcularAnchos(aoaAncho)
      anchos.forEach((ancho, i) => {
        ws.getColumn(i + 1).width = Math.min(48, Math.max(10, ancho + 2))
      })
    })

    const buffer = (await wb.xlsx.writeBuffer()) as unknown as Uint8Array
    const u8 = new Uint8Array(buffer)
    descargar(u8)
    return { ok: true }
  } catch {
    return { ok: false, motivo: 'No se pudo generar el archivo Excel.' }
  }
}