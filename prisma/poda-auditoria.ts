/* Script de mantenimiento: poda de registros de auditoría antiguos.
 *
 * La tabla auditoria es append-only y no se puede borrar desde la UI. Para
 * controlar su crecimiento en producción, este script elimina los registros
 * anteriores a una antigüedad dada (por defecto 180 días).
 *
 * Uso:
 *   npx ts-node --compiler-options {"module":"CommonJS"} prisma/poda-auditoria.ts [dias]
 *
 * Ejemplo:
 *   npx ts-node --compiler-options {"module":"CommonJS"} prisma/poda-auditoria.ts 90
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const dias = Number(process.argv[2] ?? 180)
  if (!Number.isFinite(dias) || dias <= 0) {
    console.error('Antigüedad inválida. Uso: poda-auditoria.ts [dias]')
    process.exit(1)
  }

  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)

  const resultado = await prisma.auditoria.deleteMany({
    where: { timestamp: { lt: corte } },
  })

  console.log(
    `Poda completada: ${resultado.count} registros de auditoría anteriores a ${dias} días fueron eliminados.`
  )
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })