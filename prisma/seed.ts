import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.rol.createMany({
    data: [{ nombre: 'Administrador' }, { nombre: 'Caja' }],
    skipDuplicates: true,
  })

  await prisma.categoriaGasto.createMany({
    data: [
      { nombre: 'Materiales' },
      { nombre: 'Almuerzos' },
      { nombre: 'Pasajes' },
      { nombre: 'Mantenimiento' },
      { nombre: 'Servicios Básicos' },
      { nombre: 'Otros' },
    ],
    skipDuplicates: true,
  })

  console.log('Seed completado: roles y categorías de gasto creados.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })