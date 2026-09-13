import { FastifyInstance, FastifyReply } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.settings_view)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.settings_edit)]
const clinic = [authenticate, verifyPermVersion, requirePermission(Permission.settings_clinic)]

const updateTenantSchema = z.object({
  name: z.string().min(2).optional(),
  cnpj: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  address: z.string().nullable().optional(),
  operatingHours: z.string().nullable().optional(),
})

const updateOnboardingSchema = z.object({
  step: z.number().int().min(0).max(5).optional(),
  completed: z.boolean().optional(),
})

async function checkClinicAdmin(request: AuthenticatedRequest, reply: FastifyReply) {
  const role = request.user.role
  if (role !== 'CLINIC_ADMIN' && role !== 'SUPER_ADMIN') {
    return reply.status(403).send({ error: 'Acesso negado. Apenas administradores podem acessar esta rota.' })
  }
}

export async function tenantRoutes(fastify: FastifyInstance) {
  // Get current tenant
  fastify.get('/tenant', {
    onRequest: view
  }, async (request, reply) => {
    try {
      const authError = await checkClinicAdmin(request as AuthenticatedRequest, reply)
      if (authError) return authError

      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          cnpj: true,
          phone: true,
          email: true,
          address: true,
          operatingHours: true,
          active: true,
          onboardingCompleted: true,
          onboardingStep: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      if (!tenant) {
        return reply.status(404).send({ error: 'Clínica não encontrada' })
      }

      return tenant
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Update tenant
  fastify.put('/tenant', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const authError = await checkClinicAdmin(request as AuthenticatedRequest, reply)
      if (authError) return authError

      const data = updateTenantSchema.parse(request.body)
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...(data.name && { name: data.name }),
          ...(data.cnpj !== undefined && { cnpj: data.cnpj }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(data.email !== undefined && { email: data.email }),
          ...(data.address !== undefined && { address: data.address }),
          ...(data.operatingHours !== undefined && { operatingHours: data.operatingHours }),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          cnpj: true,
          phone: true,
          email: true,
          address: true,
          active: true,
          onboardingCompleted: true,
          onboardingStep: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      return tenant
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Update onboarding progress
  fastify.put('/tenant/onboarding', {
    onRequest: clinic
  }, async (request, reply) => {
    try {
      const authError = await checkClinicAdmin(request as AuthenticatedRequest, reply)
      if (authError) return authError

      const data = updateOnboardingSchema.parse(request.body)
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          ...(data.step !== undefined && { onboardingStep: data.step }),
          ...(data.completed !== undefined && { onboardingCompleted: data.completed }),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          onboardingCompleted: true,
          onboardingStep: true,
        },
      })

      return tenant
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}
