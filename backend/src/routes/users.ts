import { FastifyInstance, FastifyReply } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword } from '../lib/auth.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'

const teamView = [authenticate, verifyPermVersion, requirePermission(Permission.team_view)]
const teamCreate = [authenticate, verifyPermVersion, requirePermission(Permission.team_create)]
const teamEdit = [authenticate, verifyPermVersion, requirePermission(Permission.team_edit)]
const teamDelete = [authenticate, verifyPermVersion, requirePermission(Permission.team_delete)]

const updateProfileSchema = z.object({
  name: z.string().min(2),
  avatarUrl: z.string().url().nullable().optional(),
})

const updatePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(6),
})

const addUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(['SUPER_ADMIN', 'CLINIC_ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'TECHNICIAN', 'CLIENT']),
  sendInvite: z.boolean().default(false),
})

const updateRoleSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'CLINIC_ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'TECHNICIAN', 'CLIENT']),
})

const updateStatusSchema = z.object({
  active: z.boolean(),
})

const adminUpdateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  password: z.string().min(6).optional(),
})

async function checkClinicAdmin(request: AuthenticatedRequest, reply: FastifyReply) {
  const role = request.user.role
  if (role !== 'CLINIC_ADMIN' && role !== 'SUPER_ADMIN') {
    return reply.status(403).send({ error: 'Acesso negado. Apenas administradores podem acessar esta rota.' })
  }
}

export async function usersRoutes(fastify: FastifyInstance) {
  // Update user profile (self) — no permission required, just auth
  fastify.put('/users/profile', {
    onRequest: [authenticate, verifyPermVersion]
  }, async (request, reply) => {
    try {
      const data = updateProfileSchema.parse(request.body)
      const userId = (request as AuthenticatedRequest).user.userId

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          name: data.name,
          avatarUrl: data.avatarUrl,
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          active: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return user
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Update user password (self)
  fastify.put('/users/password', {
    onRequest: [authenticate, verifyPermVersion]
  }, async (request, reply) => {
    try {
      const data = updatePasswordSchema.parse(request.body)
      const userId = (request as AuthenticatedRequest).user.userId

      // Get current user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })

      if (!user) {
        return reply.status(404).send({ error: 'Usuário não encontrado' })
      }

      // Verify current password
      const isValid = await verifyPassword(data.currentPassword, user.password)
      if (!isValid) {
        return reply.status(400).send({ error: 'Senha atual incorreta' })
      }

      // Hash new password
      const hashedPassword = await hashPassword(data.newPassword)

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          password: hashedPassword,
        },
      })

      return { message: 'Senha atualizada com sucesso' }
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // List users in tenant
  fastify.get('/users', {
    onRequest: teamView
  }, async (request, reply) => {
    try {
      const authError = await checkClinicAdmin(request as AuthenticatedRequest, reply)
      if (authError) return authError

      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const users = await prisma.userTenant.findMany({
        where: { tenantId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              active: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return users.map((ut) => ({
        id: ut.user.id,
        email: ut.user.email,
        name: ut.user.name,
        avatarUrl: ut.user.avatarUrl,
        active: ut.user.active,
        role: ut.role,
        createdAt: ut.user.createdAt,
        userTenantId: ut.id,
      }))
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Add user to tenant
  fastify.post('/users', {
    onRequest: teamCreate
  }, async (request, reply) => {
    try {
      const authError = await checkClinicAdmin(request as AuthenticatedRequest, reply)
      if (authError) return authError

      const data = addUserSchema.parse(request.body)
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      // Check if user already exists
      let user = await prisma.user.findUnique({
        where: { email: data.email },
      })

      if (user) {
        // Check if user is already in tenant
        const existingUserTenant = await prisma.userTenant.findUnique({
          where: {
            userId_tenantId: {
              userId: user.id,
              tenantId,
            },
          },
        })

        if (existingUserTenant) {
          return reply.status(400).send({ error: 'Usuário já existe neste tenant' })
        }

        // Add existing user to tenant
        await prisma.userTenant.create({
          data: {
            userId: user.id,
            tenantId,
            role: data.role,
          },
        })

        return reply.status(201).send({
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
          active: user.active,
          role: data.role,
          createdAt: user.createdAt,
        })
      }

      // Create new user
      let hashedPassword: string | null = null
      if (!data.sendInvite && data.password) {
        hashedPassword = await hashPassword(data.password)
      } else if (data.sendInvite) {
        // Generate temporary password for invite
        hashedPassword = await hashPassword(Math.random().toString(36).slice(-8))
      }

      user = await prisma.user.create({
        data: {
          email: data.email,
          password: hashedPassword!,
          name: data.name,
        },
      })

      // Add user to tenant
      await prisma.userTenant.create({
        data: {
          userId: user.id,
          tenantId,
          role: data.role,
        },
      })

      return reply.status(201).send({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        active: user.active,
        role: data.role,
        createdAt: user.createdAt,
      })
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Admin: update a team member's email / name / password
  fastify.put('/users/:id', {
    onRequest: teamEdit
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = adminUpdateUserSchema.parse(request.body)
      const { tenantId, userId: currentUserId } = (request as AuthenticatedRequest).user

      // Ensure the target user belongs to this tenant
      const userTenant = await prisma.userTenant.findFirst({
        where: { userId: id, tenantId },
      })
      if (!userTenant) {
        return reply.status(404).send({ error: 'Usuário não encontrado neste tenant' })
      }

      // Prevent admin from changing own credentials through this endpoint —
      // they should use /users/profile and /users/password (which require
      // the current password).
      if (id === currentUserId) {
        return reply.status(403).send({
          error: 'Use /users/profile e /users/password para editar sua própria conta',
          code: 'SELF_EDIT_FORBIDDEN',
        })
      }

      // If changing email, make sure it's not already used by another user
      if (data.email) {
        const existing = await prisma.user.findUnique({ where: { email: data.email } })
        if (existing && existing.id !== id) {
          return reply.status(400).send({ error: 'Email já cadastrado por outro usuário' })
        }
      }

      const updateData: { email?: string; name?: string; password?: string } = {}
      if (data.email !== undefined) updateData.email = data.email
      if (data.name !== undefined) updateData.name = data.name
      if (data.password !== undefined) updateData.password = await hashPassword(data.password)

      const updated = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          active: true,
          createdAt: true,
        },
      })

      // If the password changed, revoke all refresh tokens for this user so
      // they're forced to log in again.
      if (data.password) {
        await prisma.refreshToken.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }

      return updated
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Update user role
  fastify.put('/users/:id/role', {
    onRequest: teamEdit
  }, async (request, reply) => {
    try {
      const authError = await checkClinicAdmin(request as AuthenticatedRequest, reply)
      if (authError) return authError

      const { id } = request.params as { id: string }
      const data = updateRoleSchema.parse(request.body)
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const userTenant = await prisma.userTenant.findFirst({
        where: {
          userId: id,
          tenantId,
        },
      })

      if (!userTenant) {
        return reply.status(404).send({ error: 'Usuário não encontrado neste tenant' })
      }

      const updated = await prisma.userTenant.update({
        where: { id: userTenant.id },
        data: { role: data.role },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              active: true,
              createdAt: true,
            },
          },
        },
      })

      return {
        id: updated.user.id,
        email: updated.user.email,
        name: updated.user.name,
        avatarUrl: updated.user.avatarUrl,
        active: updated.user.active,
        role: updated.role,
        createdAt: updated.user.createdAt,
      }
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Update user status
  fastify.put('/users/:id/status', {
    onRequest: teamEdit
  }, async (request, reply) => {
    try {
      const authError = await checkClinicAdmin(request as AuthenticatedRequest, reply)
      if (authError) return authError

      const { id } = request.params as { id: string }
      const data = updateStatusSchema.parse(request.body)
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const userTenant = await prisma.userTenant.findFirst({
        where: {
          userId: id,
          tenantId,
        },
      })

      if (!userTenant) {
        return reply.status(404).send({ error: 'Usuário não encontrado neste tenant' })
      }

      const updated = await prisma.user.update({
        where: { id },
        data: { active: data.active },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          active: true,
          createdAt: true,
        },
      })

      return updated
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Remove user from tenant
  fastify.delete('/users/:id', {
    onRequest: teamDelete
  }, async (request, reply) => {
    try {
      const authError = await checkClinicAdmin(request as AuthenticatedRequest, reply)
      if (authError) return authError

      const { id } = request.params as { id: string }
      const tenantId = (request as AuthenticatedRequest).user.tenantId
      const currentUserId = (request as AuthenticatedRequest).user.userId

      // Prevent self-removal
      if (id === currentUserId) {
        return reply.status(400).send({ error: 'Você não pode remover a si mesmo do tenant' })
      }

      const userTenant = await prisma.userTenant.findFirst({
        where: {
          userId: id,
          tenantId,
        },
      })

      if (!userTenant) {
        return reply.status(404).send({ error: 'Usuário não encontrado neste tenant' })
      }

      await prisma.userTenant.delete({
        where: { id: userTenant.id },
      })

      return reply.status(204).send()
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}
