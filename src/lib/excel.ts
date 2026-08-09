import * as XLSX from 'xlsx'

const NOMBRE_ARCHIVO = 'reporte-lavado.xlsx'
const FORMATO_MONEDA = '"Bs "#,##0.00'

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

export async function exportarExcel(hojas: HojaExporte[]): Promise<ResultadoExporte> {
  let u8: Uint8Array | null = null
  try {
    const wb = XLSX.utils.book_new()
    const parches: InfoParche[] = []

    hojas.forEach((hoja) => {
      const filaEncabezado = (hoja.prefacio?.length ?? 0) + 1
      const aoa = [...(hoja.prefacio ?? []), hoja.encabezados, ...hoja.filas]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      const refsEncabezado: string[] = []
      const refsNegrita: string[] = []

      hoja.columnasMoneda?.forEach((col) => {
        hoja.filas.forEach((fila, i) => {
          const valor = fila[col]
          if (typeof valor !== 'number') return
          const ref = `${colLetra(col)}${filaEncabezado + 1 + i}`
          ws[ref] = { t: 'n', v: valor, z: FORMATO_MONEDA }
        })
      })

      ws['!cols'] = calcularAnchos(aoa)

      hoja.encabezados.forEach((celda, col) => {
        if (celda !== '') refsEncabezado.push(`${colLetra(col)}${filaEncabezado}`)
      })

      hoja.prefacio?.[0]?.forEach((_celda, col) => {
        refsNegrita.push(`${colLetra(col)}1`)
      })

      if (hoja.congelar && hoja.filas.length > 0) {
        const ultimaCol = Math.max(
          hoja.encabezados.length,
          ...hoja.filas.map((fila) => fila.length)
        ) - 1
        const ultimaFila = filaEncabezado + hoja.filas.length
        ws['!autofilter'] = {
          ref: `A${filaEncabezado}:${colLetra(Math.max(0, ultimaCol))}${ultimaFila}`,
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, nombreHoja(hoja.nombre))
      parches.push({
        congelar: !!hoja.congelar && hoja.filas.length > 0,
        filaEncabezado,
        refsEncabezado,
        refsNegrita,
      })
    })

    const buffer = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array',
      compression: true,
    }) as ArrayBuffer
    u8 = new Uint8Array(buffer)
    const patcheado = await aplicarParches(u8, parches)
    descargar(patcheado)
    return { ok: true }
  } catch {
    if (u8) {
      descargar(u8)
      return { ok: true }
    }
    return { ok: false, motivo: 'No se pudo generar el archivo Excel.' }
  }
}

type InfoParche = {
  congelar: boolean
  filaEncabezado: number
  refsEncabezado: string[]
  refsNegrita: string[]
}

async function aplicarParches(u8: Uint8Array, parches: InfoParche[]): Promise<Uint8Array> {
  const entradas = parsearZip(u8)
  const salidas: EntradaNueva[] = []
  let indiceHoja = 0
  let indiceEncabezado = -1
  let indiceNegrita = -1

  for (const entrada of entradas) {
    if (entrada.nombre === 'xl/styles.xml') {
      const xml = new TextDecoder().decode(await descomprimirSegun(entrada))
      const coincide = xml.match(/<cellXfs[^>]*count="(\d+)"/)
      if (!coincide) throw new Error('Estilos sin cellXfs')
      indiceEncabezado = parseInt(coincide[1], 10)
      indiceNegrita = indiceEncabezado + 1
      salidas.push(await crearEntradaComprimida(entrada.nombre, parcharEstilos(xml, indiceEncabezado)))
      continue
    }

    if (entrada.nombre.startsWith('xl/worksheets/sheet')) {
      const info = parches[indiceHoja]
      indiceHoja++
      const xml = new TextDecoder().decode(await descomprimirSegun(entrada))
      salidas.push(
        await crearEntradaComprimida(
          entrada.nombre,
          parcharHoja(xml, info, indiceEncabezado, indiceNegrita)
        )
      )
      continue
    }

    salidas.push({
      nombre: entrada.nombre,
      datos: entrada.datos,
      metodo: entrada.metodo,
      crc: entrada.crc,
      tamOriginal: entrada.tamOriginal,
    })
  }

  return construirZip(salidas)
}

function parcharEstilos(xml: string, indiceEncabezado: number): string {
  let nuevo = xml
  nuevo = nuevo.replace(
    '<fonts count="1">',
    '<fonts count="2">'
  )
  nuevo = nuevo.replace(
    '</fonts>',
    '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font></fonts>'
  )
  nuevo = nuevo.replace('<fills count="2">', '<fills count="3">')
  nuevo = nuevo.replace(
    '</fills>',
    '<fill><patternFill patternType="solid"><fgColor rgb="FF0369A1"/></patternFill></fill></fills>'
  )
  nuevo = nuevo.replace(
    `<cellXfs count="${indiceEncabezado}">`,
    `<cellXfs count="${indiceEncabezado + 2}">`
  )
  nuevo = nuevo.replace(
    '</cellXfs>',
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>`
  )
  return nuevo
}

function parcharHoja(xml: string, info: InfoParche, indiceEncabezado: number, indiceNegrita: number): string {
  let nuevo = xml
  if (info.congelar) {
    const fila = info.filaEncabezado
    const activa = `A${fila + 1}`
    const pane = `<pane ySplit="${fila}" topLeftCell="${activa}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="${activa}" sqref="${activa}"/>`
    nuevo = nuevo.replace(
      '<sheetView workbookViewId="0"/>',
      `<sheetView workbookViewId="0">${pane}</sheetView>`
    )
  }
  for (const ref of info.refsEncabezado) {
    nuevo = ponerEstilo(nuevo, ref, indiceEncabezado)
  }
  for (const ref of info.refsNegrita) {
    nuevo = ponerEstilo(nuevo, ref, indiceNegrita)
  }
  return nuevo
}

function ponerEstilo(xml: string, ref: string, indice: number): string {
  return xml.replace(new RegExp(`<c r="${ref}"(?=\\s)`), `<c r="${ref}" s="${indice}"`)
}

function calcularAnchos(aoa: CeldaFila[][]): { wch: number }[] {
  const maxCol = Math.max(0, ...aoa.map((fila) => fila.length))
  const anchos: number[] = new Array(maxCol).fill(0)
  aoa.forEach((fila) =>
    fila.forEach((celda, col) => {
      const largo = anchoDeCelda(celda)
      if (largo > anchos[col]) anchos[col] = largo
    })
  )
  return anchos.map((ancho) => ({ wch: Math.min(60, Math.max(8, ancho + 2)) }))
}

function anchoDeCelda(celda: CeldaFila): number {
  if (typeof celda === 'number') return Math.round(Math.abs(celda)).toString().length + 8
  return Array.from(String(celda)).length
}

function colLetra(indice: number): string {
  let salida = ''
  let n = indice + 1
  while (n > 0) {
    const d = (n - 1) % 26
    salida = String.fromCharCode(65 + d) + salida
    n = Math.floor((n - 1) / 26)
  }
  return salida
}

function nombreHoja(nombre: string): string {
  const limpio = nombre.replace(/[\\\/\?\*\x5B\x5D\:]/g, '').trim()
  return limpio.slice(0, 31) || 'Hoja'
}

function descargar(u8: Uint8Array) {
  const blob = new Blob([u8 as BlobPart], {
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

type EntradaZip = {
  nombre: string
  metodo: number
  crc: number
  tamComprimido: number
  tamOriginal: number
  datos: Uint8Array
}

type EntradaNueva = {
  nombre: string
  datos: Uint8Array
  metodo: number
  crc: number
  tamOriginal: number
}

function parsearZip(u8: Uint8Array): EntradaZip[] {
  const fin = buscarFinZip(u8)
  if (fin < 0) throw new Error('Zip sin final')
  const cantidad = leerU16(u8, fin + 10)
  let pos = leerU32(u8, fin + 16)
  const entradas: EntradaZip[] = []
  for (let i = 0; i < cantidad; i++) {
    if (leerU32(u8, pos) !== 0x02014b50) throw new Error('Directorio central corrupto')
    const metodo = leerU16(u8, pos + 10)
    const crc = leerU32(u8, pos + 16)
    const tamComprimido = leerU32(u8, pos + 20)
    const tamOriginal = leerU32(u8, pos + 24)
    const largoNombre = leerU16(u8, pos + 28)
    const largoExtra = leerU16(u8, pos + 30)
    const largoComentario = leerU16(u8, pos + 32)
    const offsetLocal = leerU32(u8, pos + 42)
    const nombre = new TextDecoder().decode(u8.subarray(pos + 46, pos + 46 + largoNombre))
    if (leerU32(u8, offsetLocal) !== 0x04034b50) throw new Error('Cabecera local corrupta')
    const largoNombreLocal = leerU16(u8, offsetLocal + 26)
    const largoExtraLocal = leerU16(u8, offsetLocal + 28)
    const inicioDatos = offsetLocal + 30 + largoNombreLocal + largoExtraLocal
    const datos = u8.slice(inicioDatos, inicioDatos + tamComprimido)
    entradas.push({ nombre, metodo, crc, tamComprimido, tamOriginal, datos })
    pos += 46 + largoNombre + largoExtra + largoComentario
  }
  return entradas
}

function buscarFinZip(u8: Uint8Array): number {
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 22 - 65535); i--) {
    if (leerU32(u8, i) === 0x06054b50) return i
  }
  return -1
}

function construirZip(entradas: EntradaNueva[]): Uint8Array {
  const partes: Uint8Array[] = []
  const registrosCentrales: number[] = []
  let offset = 0
  for (const entrada of entradas) {
    const nombre = new TextEncoder().encode(entrada.nombre)
    const local = new Uint8Array(30 + nombre.length)
    const dv = new DataView(local.buffer)
    dv.setUint32(0, 0x04034b50, true)
    dv.setUint16(4, 20, true)
    dv.setUint16(6, 0, true)
    dv.setUint16(8, entrada.metodo, true)
    dv.setUint16(10, 0, true)
    dv.setUint16(12, 0x21, true)
    dv.setUint32(14, entrada.crc, true)
    dv.setUint32(18, entrada.datos.length, true)
    dv.setUint32(22, entrada.tamOriginal, true)
    dv.setUint16(26, nombre.length, true)
    dv.setUint16(28, 0, true)
    local.set(nombre, 30)
    partes.push(local, entrada.datos)

    const central = new Uint8Array(46 + nombre.length)
    const dv2 = new DataView(central.buffer)
    dv2.setUint32(0, 0x02014b50, true)
    dv2.setUint16(4, 20, true)
    dv2.setUint16(6, 20, true)
    dv2.setUint16(8, 0, true)
    dv2.setUint16(10, entrada.metodo, true)
    dv2.setUint16(12, 0, true)
    dv2.setUint16(14, 0x21, true)
    dv2.setUint32(16, entrada.crc, true)
    dv2.setUint32(20, entrada.datos.length, true)
    dv2.setUint32(24, entrada.tamOriginal, true)
    dv2.setUint16(28, nombre.length, true)
    dv2.setUint16(30, 0, true)
    dv2.setUint16(32, 0, true)
    dv2.setUint16(34, 0, true)
    dv2.setUint16(36, 0, true)
    dv2.setUint32(38, 0, true)
    dv2.setUint32(42, offset, true)
    central.set(nombre, 46)
    for (const byte of central) registrosCentrales.push(byte)
    offset += local.length + entrada.datos.length
  }

  const centrales = Uint8Array.from(registrosCentrales)
  const eocd = new Uint8Array(22)
  const dv3 = new DataView(eocd.buffer)
  dv3.setUint32(0, 0x06054b50, true)
  dv3.setUint16(4, 0, true)
  dv3.setUint16(6, 0, true)
  dv3.setUint16(8, entradas.length, true)
  dv3.setUint16(10, entradas.length, true)
  dv3.setUint32(12, centrales.length, true)
  dv3.setUint32(16, offset, true)
  dv3.setUint16(20, 0, true)

  const total = offset + centrales.length + eocd.length
  const salida = new Uint8Array(total)
  let p = 0
  for (const parte of partes) {
    salida.set(parte, p)
    p += parte.length
  }
  salida.set(centrales, p)
  p += centrales.length
  salida.set(eocd, p)
  return salida
}

async function descomprimirSegun(entrada: EntradaZip): Promise<Uint8Array> {
  if (entrada.metodo === 0) return entrada.datos
  return descomprimirDeflate(entrada.datos)
}

async function crearEntradaComprimida(nombre: string, texto: string): Promise<EntradaNueva> {
  const sinComprimir = new TextEncoder().encode(texto)
  const comprimido = await comprimirDeflate(sinComprimir)
  return {
    nombre,
    datos: comprimido,
    metodo: 8,
    crc: crc32(sinComprimir),
    tamOriginal: sinComprimir.length,
  }
}

type FlujoTransformador = {
  writable: WritableStream
  readable: ReadableStream<Uint8Array>
}

async function descomprimirDeflate(datos: Uint8Array): Promise<Uint8Array> {
  const Descompresion = (window as unknown as {
    DecompressionStream: new (formato: string) => FlujoTransformador
  }).DecompressionStream
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(new Descompresion('deflate-raw'))
  return new Uint8Array(await new Response(flujo).arrayBuffer())
}

async function comprimirDeflate(datos: Uint8Array): Promise<Uint8Array> {
  const Compresion = (window as unknown as {
    CompressionStream: new (formato: string) => FlujoTransformador
  }).CompressionStream
  const flujo = new Blob([datos as BlobPart]).stream().pipeThrough(new Compresion('deflate-raw'))
  return new Uint8Array(await new Response(flujo).arrayBuffer())
}

function leerU16(u8: Uint8Array, pos: number): number {
  return u8[pos] | (u8[pos + 1] << 8)
}

function leerU32(u8: Uint8Array, pos: number): number {
  return (u8[pos] | (u8[pos + 1] << 8) | (u8[pos + 2] << 16) | (u8[pos + 3] << 24)) >>> 0
}

let tablaCrc: Uint32Array | null = null

function crc32(datos: Uint8Array): number {
  if (!tablaCrc) {
    tablaCrc = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      tablaCrc[i] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < datos.length; i++) crc = tablaCrc[(crc ^ datos[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
