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

  await prisma.servicio.createMany({
    data: [
      { nombre: 'Lavado simple', precio: 30 },
      { nombre: 'Lavado full', precio: 60 },
      { nombre: 'Lavado premium', precio: 80 },
      { nombre: 'Aspirado', precio: 15 },
    ],
    skipDuplicates: true,
  })

  const rolAdmin = await prisma.rol.findUnique({
    where: { nombre: 'Administrador' },
  })
  const rolCaja = await prisma.rol.findUnique({
    where: { nombre: 'Caja' },
  })

  if (rolAdmin) {
    const passwordHash = await bcrypt.hash('CambiarEsta123!', 10)

    await prisma.usuario.updateMany({
      where: { email: 'admin@carwash.com' },
      data: { debeCambiarPassword: true },
    })

    await prisma.usuario.upsert({
      where: { email: 'admin@carwash.com' },
      update: {},
      create: {
        nombre: 'Administrador Principal',
        email: 'admin@carwash.com',
        passwordHash,
        rolId: rolAdmin.id,
        estado: 'activo',
        debeCambiarPassword: true,
      },
    })
  }

  if (rolCaja) {
    const passwordHash = await bcrypt.hash('Cambiar123!', 10)

    await prisma.usuario.updateMany({
      where: { email: 'caja@carwash.com' },
      data: { debeCambiarPassword: true },
    })

    await prisma.usuario.upsert({
      where: { email: 'caja@carwash.com' },
      update: {},
      create: {
        nombre: 'Operador de Caja',
        email: 'caja@carwash.com',
        passwordHash,
        rolId: rolCaja.id,
        estado: 'activo',
        debeCambiarPassword: true,
      },
    })
  }

  console.log('Seed completado: roles, categorías, servicios y usuarios creados.')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })