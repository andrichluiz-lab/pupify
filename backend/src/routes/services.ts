import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.services_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.services_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.services_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.services_delete)]

const createServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  category: z.string(),
  price: z.number().nonnegative(),
  durationMin: z.number().int().positive().optional(),
})

const updateServiceSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().nonnegative().optional(),
  durationMin: z.number().int().positive().optional(),
  active: z.boolean().optional(),
})

export async function servicesRoutes(fastify: FastifyInstance) {
  // List services
  fastify.get('/services', {
    onRequest: view
  }, async (request, reply) => {
    try {
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const services = await prisma.service.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      })

      return services
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Get service by ID
  fastify.get('/services/:id', {
    onRequest: view
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const service = await prisma.service.findFirst({
        where: { id, tenantId },
      })

      if (!service) {
        return reply.status(404).send({ error: 'Serviço não encontrado' })
      }

      return service
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Create service
  fastify.post('/services', {
    onRequest: create
  }, async (request, reply) => {
    try {
      const data = createServiceSchema.parse(request.body)
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const service = await prisma.service.create({
        data: {
          ...data,
          tenantId,
        },
      })

      return reply.status(201).send(service)
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Update service
  fastify.put('/services/:id', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = updateServiceSchema.parse(request.body)
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const service = await prisma.service.findFirst({
        where: { id, tenantId },
      })

      if (!service) {
        return reply.status(404).send({ error: 'Serviço não encontrado' })
      }

      const updatedService = await prisma.service.update({
        where: { id },
        data,
      })

      return updatedService
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Delete service
  fastify.delete('/services/:id', {
    onRequest: del
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const service = await prisma.service.findFirst({
        where: { id, tenantId },
      })

      if (!service) {
        return reply.status(404).send({ error: 'Serviço não encontrado' })
      }

      await prisma.service.delete({
        where: { id },
      })

      return reply.status(204).send()
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // Bulk create services (for onboarding template)
  fastify.post('/services/bulk', {
    onRequest: create
  }, async (request, reply) => {
    try {
      const servicesSchema = z.array(createServiceSchema)
      const services = servicesSchema.parse(request.body)
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const createdServices = await prisma.service.createMany({
        data: services.map(service => ({ ...service, tenantId })),
      })

      return reply.status(201).send({ count: createdServices.count })
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Erro de validação', details: error.errors })
      }
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })
}
