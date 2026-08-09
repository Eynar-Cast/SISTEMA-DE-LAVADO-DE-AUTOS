import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

  const rolAdmin = await prisma.rol.findUnique({
    where: { nombre: 'Administrador' },
  })

  if (rolAdmin) {
    const passwordHash = await bcrypt.hash('CambiarEsta123!', 10)

    await prisma.usuario.upsert({
      where: { email: 'admin@carwash.com' },
      update: {},
      create: {
        nombre: 'Administrador Principal',
        email: 'admin@carwash.com',
        passwordHash,
        rolId: rolAdmin.id,
        estado: 'activo',
      },
    })
  }

  console.log('Seed completado: roles, categorías de gasto y usuario admin creados.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })