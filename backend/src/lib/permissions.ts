import { Permission, Role } from '@prisma/client'
import { prisma } from './prisma.js'
import { ALL_PERMISSIONS } from './permission-defaults.js'

/**
 * Resolve the effective set of permissions for a UserTenant:
 *   - SUPER_ADMIN → all permissions implicitly
 *   - role defaults from RolePermission (DB)
 *   - + UserPermission overrides (granted=true adds, granted=false removes)
 */
export async function getEffectivePermissions(userTenantId: string): Promise<Permission[]> {
  const userTenant = await prisma.userTenant.findUnique({
    where: { id: userTenantId },
    include: { permissions: true },
  })
  if (!userTenant) return []

  // SUPER_ADMIN and CLINIC_ADMIN get all permissions implicitly.
  // CLINIC_ADMIN is the clinic owner — they must never be locked out, even
  // if the RolePermission table happens to be empty (e.g. seed didn't run).
  if (userTenant.role === 'SUPER_ADMIN' || userTenant.role === 'CLINIC_ADMIN') {
    return ALL_PERMISSIONS
  }

  const defaults = await prisma.rolePermission.findMany({
    where: { role: userTenant.role },
    select: { permission: true },
  })

  const set = new Set<Permission>(defaults.map((d) => d.permission))
  for (const override of userTenant.permissions) {
    if (override.granted) set.add(override.permission)
    else set.delete(override.permission)
  }
  return Array.from(set)
}

/**
 * Resolve perms + permVersion in a single round-trip.
 * Used at login/refresh to mint a fresh JWT.
 */
export async function loadPermissionsForToken(
  userTenantId: string,
): Promise<{ permissions: Permission[]; permVersion: number }> {
  const userTenant = await prisma.userTenant.findUnique({
    where: { id: userTenantId },
    include: { permissions: true },
  })
  if (!userTenant) return { permissions: [], permVersion: 0 }

  if (userTenant.role === 'SUPER_ADMIN' || userTenant.role === 'CLINIC_ADMIN') {
    return { permissions: ALL_PERMISSIONS, permVersion: userTenant.permVersion }
  }

  const defaults = await prisma.rolePermission.findMany({
    where: { role: userTenant.role },
    select: { permission: true },
  })

  const set = new Set<Permission>(defaults.map((d) => d.permission))
  for (const override of userTenant.permissions) {
    if (override.granted) set.add(override.permission)
    else set.delete(override.permission)
  }
  return { permissions: Array.from(set), permVersion: userTenant.permVersion }
}

/**
 * Increment UserTenant.permVersion so existing JWTs become stale.
 * Called after every UserPermission mutation.
 */
export async function bumpPermVersion(userTenantId: string): Promise<number> {
  const updated = await prisma.userTenant.update({
    where: { id: userTenantId },
    data: { permVersion: { increment: 1 } },
    select: { permVersion: true },
  })
  return updated.permVersion
}

/**
 * Read current permVersion (cheap query for middleware verification).
 */
export async function getCurrentPermVersion(userTenantId: string): Promise<number | null> {
  const ut = await prisma.userTenant.findUnique({
    where: { id: userTenantId },
    select: { permVersion: true },
  })
  return ut?.permVersion ?? null
}

export { Permission, Role }
