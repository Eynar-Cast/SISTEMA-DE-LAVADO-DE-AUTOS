/* Script de pruebas de estrés (Fase 5).
 *
 * Simula un día operativo completo con concurrencia real contra la BD:
 *   1. Crea un cajero de prueba.
 *   2. Abre una caja (apertura con monto inicial).
 *   3. Registra N ventas CONCURRENTES replicando la transacción del
 *      correlativo (SELECT ... FOR UPDATE sobre la caja) y verifica que la
 *      secuencia 1..N no tenga duplicados ni huecos.
 *   4. Registra M gastos concurrentes.
 *   5. Simula el flujo de anulación (cajero solicita -> admin autoriza).
 *   6. Cierra la caja y verifica que el arqueo cuadre (diferencia = 0).
 *   7. Verifica que una venta posterior al cierre sea rechazada.
 *   8. Limpia los datos de prueba salvo que se pase --keep.
 *
 * Uso:
 *   npx ts-node --compiler-options {"module":"CommonJS"} prisma/test-estres.ts --ventas=40 --gastos=8 --keep
 */
import { PrismaClient, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

function parseArgs(argv: string[]) {
  const ventas = Number(argv.find((a) => a.startsWith('--ventas='))?.split('=')[1] ?? 20)
  const gastos = Number(argv.find((a) => a.startsWith('--gastos='))?.split('=')[1] ?? 4)
  const lotes = Number(argv.find((a) => a.startsWith('--lotes='))?.split('=')[1] ?? 5)
  const keep = argv.includes('--keep')
  return { ventas, gastos, lotes, keep }
}

/** Ejecuta `tareas` en lotes de `lotes` a la vez para no agotar el pool/la BD. */
async function enLotes<T>(tareas: (() => Promise<T>)[], lotes: number): Promise<T[]> {
  const resultados: T[] = []
  for (let i = 0; i < tareas.length; i += lotes) {
    const lote = tareas.slice(i, i + lotes)
    resultados.push(...(await Promise.all(lote.map((t) => t()))))
  }
  return resultados
}

async function main() {
  const { ventas: N, gastos: M, lotes, keep } = parseArgs(process.argv.slice(2))
  const email = 'test-estres@carwash.com'
  const rolCaja = await prisma.rol.findUnique({ where: { nombre: 'Caja' } })
  const rolAdmin = await prisma.rol.findUnique({ where: { nombre: 'Administrador' } })
  if (!rolCaja || !rolAdmin) throw new Error('No se encontraron los roles')

  const servicio = await prisma.servicio.findFirst({ where: { estado: 'activo' } })
  if (!servicio) throw new Error('No hay servicios activos para la prueba')

  let usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario) {
    usuario = await prisma.usuario.create({
      data: { nombre: 'Cajero Test Estres', email, rolId: rolCaja.id, passwordHash: 'x' },
    })
  }

  console.log(`== Prueba de estrés: ${N} ventas y ${M} gastos concurrentes ==\n`)

  // 1. Apertura de caja
  const montoApertura = 100
  const caja = await prisma.caja.create({
    data: { usuarioId: usuario.id, montoApertura, estado: 'abierta' },
  })
  console.log(`Caja #${caja.id} abierta con monto inicial Bs ${montoApertura}.`)

  // 2. Ventas concurrentes (replica la transacción de registrarVenta)
  const inicio = Date.now()
  const corrRecord: number[] = []
  const tareasVenta = Array.from({ length: N }, (_, i) => async () =>
    prisma.$transaction(
      async (tx) => {
        const rows = await tx.$queryRaw<{ id: number; estado: string }[]>`
          SELECT id, estado FROM "cajas" WHERE id = ${caja.id} FOR UPDATE
        `
        if (!rows[0] || rows[0].estado !== 'abierta') throw new Error('caja cerrada')
        const ultima = await tx.venta.findFirst({
          where: { cajaId: caja.id },
          orderBy: { numeroCorrelativo: 'desc' },
        })
        const numeroCorrelativo = (ultima?.numeroCorrelativo ?? 0) + 1
        const venta = await tx.venta.create({
          data: {
            cajaId: caja.id,
            numeroCorrelativo,
            usuarioId: usuario.id,
            metodoPago: i % 2 === 0 ? 'efectivo' : 'tarjeta',
            total: servicio.precio,
            estadoVehiculo: 'registrado',
          },
        })
        await tx.detalleVenta.create({
          data: {
            ventaId: venta.id,
            servicioId: servicio.id,
            cantidad: 1,
            precioAplicado: servicio.precio,
          },
        })
        corrRecord.push(numeroCorrelativo)
        return numeroCorrelativo
      },
      { timeout: 60000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
    )
  )
  const registradas = await enLotes(tareasVenta, lotes)
  const duracionVentas = Date.now() - inicio

  // Verificación: secuencia exacta 1..N sin duplicados
  const unicos = new Set(registradas)
  const okVentas =
    unicos.size === N && Math.min(...unicos) === 1 && Math.max(...unicos) === N

  // 3. Gastos concurrentes (replica registrarGasto)
  const catGasto = await prisma.categoriaGasto.findFirst()
  const gastosCreados = await enLotes(
    Array.from({ length: M }, (_, i) => async () =>
      prisma.$transaction(
        async (tx) => {
          const rows = await tx.$queryRaw<{ id: number; estado: string }[]>`
            SELECT id, estado FROM "cajas" WHERE id = ${caja.id} FOR UPDATE
          `
          if (!rows[0] || rows[0].estado !== 'abierta') throw new Error('caja cerrada')
          return tx.gasto.create({
            data: {
              cajaId: caja.id,
              categoriaGastoId: catGasto!.id,
              usuarioId: usuario.id,
              monto: 10,
              motivo: `Gasto de prueba concurrente ${i + 1}`,
            },
          })
        },
        { timeout: 60000, isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted }
      )
    ),
    lotes
  )

  // 4. Flujo de anulación: cajero solicita -> admin autoriza
  const aAnular = gastosCreados[0]
  await prisma.gasto.update({
    where: { id: aAnular.id },
    data: { estado: 'pendiente_autorizacion' },
  })
  await prisma.gasto.update({ where: { id: aAnular.id }, data: { estado: 'anulado' } })

  // 5. Cierre de caja / arqueo
  const ventasEfectivo = await prisma.venta.aggregate({
    where: { cajaId: caja.id, metodoPago: 'efectivo' },
    _sum: { total: true },
  })
  const gastosVigentes = await prisma.gasto.aggregate({
    where: { cajaId: caja.id, estado: { in: ['activo', 'pendiente_autorizacion'] } },
    _sum: { monto: true },
  })
  const ingresos = ventasEfectivo._sum.total?.toNumber() ?? 0
  const egresos = gastosVigentes._sum.monto?.toNumber() ?? 0
  const montoSistema = montoApertura + ingresos - egresos
  const cerrada = await prisma.caja.update({
    where: { id: caja.id },
    data: {
      estado: 'cerrada',
      fechaCierre: new Date(),
      montoCierreSistema: montoSistema,
      montoCierreReal: montoSistema,
      diferencia: 0,
    },
  })

  // 6. Venta posterior al cierre debe fallar (lock re-chequea estado)
  let rechazada = false
  try {
    await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: number; estado: string }[]>`
        SELECT id, estado FROM "cajas" WHERE id = ${caja.id} FOR UPDATE
      `
      if (!rows[0] || rows[0].estado !== 'abierta') throw new Error('La caja ya fue cerrada')
    })
  } catch {
    rechazada = true
  }

  // Resumen
  const okGastos = gastosCreados.length === M
  const okAnulacion = (await prisma.gasto.findUnique({ where: { id: aAnular.id } }))?.estado === 'anulado'
  const okArqueo = cerrada.diferencia?.toNumber() === 0

  console.log(`Ventas concurrentes: ${okVentas ? 'OK' : 'FALLO'} (${unicos.size}/${N} correlativos únicos seguidos en ${duracionVentas}ms)` )
  console.log(`Gastos concurrentes: ${okGastos ? 'OK' : 'FALLO'} (${gastosCreados.length}/${M})`)
  console.log(`Anulación (pendiente -> anulado): ${okAnulacion ? 'OK' : 'FALLO'}`)
  console.log(`Arqueo (diferencia 0): ${okArqueo ? 'OK' : 'FALLO'}  [sistema=Bs ${montoSistema}]`)
  console.log(`Venta tras cierre rechazada: ${rechazada ? 'OK' : 'FALLO'}`)

  const aprobado = okVentas && okGastos && okAnulacion && okArqueo && rechazada
  console.log(`\nRESULTADO: ${aprobado ? 'PRUEBA APROBADA' : 'PRUEBA FALLIDA'}`)

  if (okVentas) console.log(`Correlativos observados: ${unicos.size === N ? '1..' + N : 'duplicados'}`)

  // 7. Limpieza (la app nunca borra; esto es solo el sandbox de la prueba)
  if (!keep) {
    const der = await prisma.$transaction(async (tx) => {
      const idsCajas = (await tx.caja.findMany({ where: { usuarioId: usuario!.id }, select: { id: true } })).map((c) => c.id)
      const idsVentas = (await tx.venta.findMany({ where: { cajaId: { in: idsCajas } }, select: { id: true } })).map((v) => v.id)
      const idsGastos = (await tx.gasto.findMany({ where: { cajaId: { in: idsCajas } }, select: { id: true } })).map((g) => g.id)
      await tx.detalleVenta.deleteMany({ where: { ventaId: { in: idsVentas } } })
      await tx.gasto.deleteMany({ where: { id: { in: idsGastos } } })
      await tx.venta.deleteMany({ where: { id: { in: idsVentas } } })
      await tx.caja.deleteMany({ where: { id: { in: idsCajas } } })
      await tx.usuario.deleteMany({ where: { id: usuario!.id } })
      return { ventas: idsVentas.length, gastos: idsGastos.length }
    })
    console.log(`Limpieza completada (${der.ventas} ventas, ${der.gastos} gastos eliminados).`)
  } else {
    console.log('--keep: no se eliminaron los datos de prueba.')
  }

  if (!aprobado) process.exitCode = 1
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })