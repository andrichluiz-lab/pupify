import jwt from 'jsonwebtoken'
import { FastifyRequest, FastifyReply } from 'fastify'
import type { Permission } from '@prisma/client'
import type { JwtPayload, AuthenticatedRequest } from '../types/fastify.js'
import { getCurrentPermVersion } from './permissions.js'

const JWT_SECRET = process.env.JWT_SECRET!

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    // Try to get token from cookie first (for backward compatibility)
    let token = request.cookies.auth_token

    // Fallback to Authorization header
    if (!token) {
      const authHeader = request.headers.authorization
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return reply.status(401).send({ error: 'Missing or invalid authorization token' })
    }

    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload

    ;(request as AuthenticatedRequest).user = payload
  } catch {
    return reply.status(401).send({ error: 'Invalid or expired token' })
  }
}

/**
 * Verify that the JWT's permVersion still matches the DB.
 * If a CLINIC_ADMIN changed permissions for this user, the DB version is
 * higher and we force the client to refresh its token.
 *
 * Use AFTER `authenticate`. Skips silently when token has no permVersion
 * (legacy tokens issued before this feature).
 */
export async function verifyPermVersion(request: FastifyRequest, reply: FastifyReply) {
  const user = (request as AuthenticatedRequest).user
  if (!user?.userTenantId || typeof user.permVersion !== 'number') {
    // Legacy token — let it through; next refresh will mint a new one.
    return
  }

  const current = await getCurrentPermVersion(user.userTenantId)
  if (current === null) {
    return reply.status(401).send({ error: 'User-tenant not found', code: 'USER_TENANT_GONE' })
  }
  if (current !== user.permVersion) {
    return reply.status(401).send({
      error: 'Permission set changed, please refresh your session',
      code: 'PERM_VERSION_STALE',
    })
  }
}

/**
 * Require that the JWT's permissions array contains a given permission.
 * SUPER_ADMIN's tokens already include all permissions, so no special-case here.
 *
 * Pair this AFTER `authenticate` (and ideally `verifyPermVersion`):
 *   onRequest: [authenticate, verifyPermVersion, requirePermission('patients_view')]
 */
export function requirePermission(permission: Permission) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = (request as AuthenticatedRequest).user
    if (!user) {
      return reply.status(401).send({ error: 'Unauthenticated' })
    }
    // SUPER_ADMIN and CLINIC_ADMIN have all permissions implicitly — no JWT array check needed.
    if (user.role === 'SUPER_ADMIN' || user.role === 'CLINIC_ADMIN') return
    const perms = user.permissions
    if (!Array.isArray(perms) || !perms.includes(permission)) {
      return reply.status(403).send({
        error: 'Permissão insuficiente',
        code: 'FORBIDDEN',
        required: permission,
      })
    }
  }
}

/**
 * Convenience: require any one of the listed permissions.
 */
export function requireAnyPermission(...permissions: Permission[]) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const user = (request as AuthenticatedRequest).user
    if (!user) {
      return reply.status(401).send({ error: 'Unauthenticated' })
    }
    if (user.role === 'SUPER_ADMIN' || user.role === 'CLINIC_ADMIN') return
    const perms = user.permissions
    if (!Array.isArray(perms) || !permissions.some((p) => perms.includes(p))) {
      return reply.status(403).send({
        error: 'Permissão insuficiente',
        code: 'FORBIDDEN',
        required: permissions,
      })
    }
  }
}
