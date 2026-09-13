import { PrismaClient, Role } from '@prisma/client'
import { seedDefaultTemplates } from './seed/templates.js'
import { ROLE_DEFAULTS } from '../src/lib/permission-defaults.js'

const prisma = new PrismaClient()

async function seedRolePermissions() {
  console.log('🔐 Seeding RolePermission table...')
  const roles: Role[] = ['CLINIC_ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'TECHNICIAN']
  for (const role of roles) {
    const permissions = ROLE_DEFAULTS[role]
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role, permission } },
        update: {},
        create: { role, permission },
      })
    }
    const count = await prisma.rolePermission.count({ where: { role } })
    console.log(`  ${role}: ${count} permissions`)
  }
}

async function main() {
  console.log('🌱 Starting seed...')

  // Permissions are role-global and must always exist, regardless of tenant state.
  await seedRolePermissions()

  // Get the first tenant to seed templates for
  const tenant = await prisma.tenant.findFirst({
    where: { active: true },
  })

  if (!tenant) {
    console.log('⚠️  No active tenant found. Skipping template seed.')
    return
  }

  console.log(`📋 Seeding templates for tenant: ${tenant.name}`)

  // Seed default templates
  await seedDefaultTemplates(tenant.id)

  console.log('✅ Seed completed successfully')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
