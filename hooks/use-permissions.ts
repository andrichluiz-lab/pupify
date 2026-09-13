'use client'

import { useAuth } from '@/lib/auth-context'
import type { Permission } from '@/lib/permissions'

/**
 * Frontend permission gate. Reads from AuthContext which is hydrated by
 * GET /api/auth/me on mount/login/refresh.
 *
 * Backend remains the source of truth — these checks only control UI
 * visibility. A user without `patients_create` who somehow triggers a POST
 * still gets 403 from the API.
 */
export function usePermissions() {
  const { permissions, role } = useAuth()

  const has = (perm: Permission) => permissions.includes(perm)
  const hasAny = (...perms: Permission[]) => perms.some((p) => permissions.includes(p))
  const hasAll = (...perms: Permission[]) => perms.every((p) => permissions.includes(p))

  return {
    permissions,
    role,
    has,
    hasAny,
    hasAll,
    isAdmin: role === 'SUPER_ADMIN' || role === 'CLINIC_ADMIN',
  }
}
