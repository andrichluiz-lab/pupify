import { FastifyInstance } from 'fastify'
import { Permission, Role } from '@prisma/client'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import {
  bumpPermVersion,
  getEffectivePermissions,
  loadPermissionsForToken,
} from '../lib/permissions.js'
import { ALL_PERMISSIONS, ROLE_DEFAULTS } from '../lib/permission-defaults.js'
import type { AuthenticatedRequest } from '../types/fastify.js'

const permissionEnum = z.nativeEnum(Permission)
const roleEnum = z.nativeEnum(Role)

const updateBodySchema = z.object({
  overrides: z.array(
    z.object({
      permission: permissionEnum,
      granted: z.boolean(),
    }),
  ),
})

export async function permissionsRoutes(fastify: FastifyInstance) {
  // Defaults for a given role (uses ROLE_DEFAULTS source-of-truth in TS)
  fastify.get('/permissions/role/:role', {
    onRequest: [authenticate, verifyPermVersion, requirePermission(Permission.team_view)],
  }, async (request, reply) => {
    const { role } = request.params as { role: string }
    const parsed = roleEnum.safeParse(role)
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid role' })
    }
    if (parsed.data === 'SUPER_ADMIN') {
      return { role: parsed.data, defaults: ALL_PERMISSIONS }
    }
    return { role: parsed.data, defaults: ROLE_DEFAULTS[parsed.data] }
  })

  // Effective permissions + raw overrides for a UserTenant
  fastify.get('/permissions/user/:userTenantId', {
    onRequest: [authenticate, verifyPermVersion, requirePermission(Permission.team_view)],
  }, async (request, reply) => {
    const { userTenantId } = request.params as { userTenantId: string }
    const user = (request as AuthenticatedRequest).user

    const target = await prisma.userTenant.findUnique({
      where: { id: userTenantId },
      include: { user: { select: { id: true, name: true, email: true } } },
    })
    if (!target || target.tenantId !== user.tenantId) {
      return reply.status(404).send({ error: 'Membro não encontrado neste tenant' })
    }

    const effective = await getEffectivePermissions(userTenantId)
    const overrides = await prisma.userPermission.findMany({
      where: { userTenantId },
      select: { permission: true, granted: true, updatedAt: true, updatedBy: true },
    })

    return {
      userTenant: {
        id: target.id,
        userId: target.userId,
        role: target.role,
        permVersion: target.permVersion,
        user: target.user,
      },
      effective,
      overrides,
      defaults: target.role === 'SUPER_ADMIN' ? ALL_PERMISSIONS : ROLE_DEFAULTS[target.role],
    }
  })

  // Update overrides (anti-self-edit)
  fastify.put('/permissions/user/:userTenantId', {
    onRequest: [authenticate, verifyPermVersion, requirePermission(Permission.team_permissions)],
  }, async (request, reply) => {
    const { userTenantId } = request.params as { userTenantId: string }
    const user = (request as AuthenticatedRequest).user

    const target = await prisma.userTenant.findUnique({ where: { id: userTenantId } })
    if (!target || target.tenantId !== user.tenantId) {
      return reply.status(404).send({ error: 'Membro não encontrado neste tenant' })
    }
    if (target.id === user.userTenantId) {
      return reply.status(403).send({
        error: 'Você não pode editar suas próprias permissões',
        code: 'SELF_EDIT_FORBIDDEN',
      })
    }

    let body
    try {
      body = updateBodySchema.parse(request.body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }

    // Determine which permissions are part of the role's defaults — sending an
    // override that matches the default is wasteful, so we delete instead.
    const defaults = target.role === 'SUPER_ADMIN'
      ? new Set<Permission>(ALL_PERMISSIONS)
      : new Set<Permission>(ROLE_DEFAULTS[target.role])

    await prisma.$transaction(async (tx) => {
      for (const { permission, granted } of body.overrides) {
        const isDefault = defaults.has(permission)
        const matchesDefault = isDefault === granted
        if (matchesDefault) {
          // No override needed — delete any existing one
          await tx.userPermission.deleteMany({
            where: { userTenantId, permission },
          })
        } else {
          await tx.userPermission.upsert({
            where: { userTenantId_permission: { userTenantId, permission } },
            update: { granted, updatedBy: user.userId },
            create: { userTenantId, permission, granted, updatedBy: user.userId },
          })
        }
      }
    })

    const newVersion = await bumpPermVersion(userTenantId)
    const effective = await getEffectivePermissions(userTenantId)
    return { permVersion: newVersion, effective }
  })

  // Effective permissions of the logged-in user
  fastify.get('/permissions/me', {
    onRequest: [authenticate, verifyPermVersion],
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    if (Array.isArray(user.permissions)) {
      return { permissions: user.permissions, permVersion: user.permVersion }
    }
    // Legacy token — load from DB
    const { permissions, permVersion } = await loadPermissionsForToken(user.userTenantId)
    return { permissions, permVersion }
  })

  // Admin-only: re-seed the RolePermission table from ROLE_DEFAULTS
  fastify.post('/permissions/seed', {
    onRequest: [authenticate, verifyPermVersion, requirePermission(Permission.settings_clinic)],
  }, async (_request, reply) => {
    let written = 0
    for (const role of ['CLINIC_ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'TECHNICIAN'] as Role[]) {
      const perms = ROLE_DEFAULTS[role]
      for (const permission of perms) {
        await prisma.rolePermission.upsert({
          where: { role_permission: { role, permission } },
          update: {},
          create: { role, permission },
        })
        written++
      }
    }
    return reply.send({ ok: true, written })
  })
}

export default permissionsRoutes
