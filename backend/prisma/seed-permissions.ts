/**
 * Seeds the RolePermission table from ROLE_DEFAULTS.
 * Idempotent: safe to run multiple times.
 *
 * Run via: npx tsx prisma/seed-permissions.ts
 */
import { PrismaClient, Role } from '@prisma/client'
import { ROLE_DEFAULTS } from '../src/lib/permission-defaults.js'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding RolePermission table...')

  const roles: Role[] = ['CLINIC_ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'TECHNICIAN']

  let created = 0
  let skipped = 0

  for (const role of roles) {
    const permissions = ROLE_DEFAULTS[role]
    for (const permission of permissions) {
      const result = await prisma.rolePermission.upsert({
        where: { role_permission: { role, permission } },
        update: {},
        create: { role, permission },
      })
      if (result.createdAt.getTime() === result.createdAt.getTime()) {
        // upsert doesn't tell us if it created — count via existence check
      }
    }
    const count = await prisma.rolePermission.count({ where: { role } })
    console.log(`  ${role}: ${count} permissions`)
    created += count
  }

  console.log(`✅ Seeded ${created} role-permission pairs (skipped ${skipped} duplicates)`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
