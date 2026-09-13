import { FastifyRequest, FastifyReply } from 'fastify'
import type { Permission } from '@prisma/client'

export interface JwtPayload {
  userId: string
  email: string
  tenantId: string
  userTenantId: string
  role: string
  name?: string
  permissions: Permission[]
  permVersion: number
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JwtPayload
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}
