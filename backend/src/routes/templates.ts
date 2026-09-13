import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.templates_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.templates_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.templates_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.templates_delete)]

const templateSchema = z.object({
  type: z.enum(['receita', 'exame', 'termo', 'atestado', 'declaracao', 'prontuario_modelo']),
  name: z.string(),
  description: z.string().optional(),
  content: z.string(),
  variables: z.array(z.string()).optional(),
  isActive: z.boolean().default(true),
})

export async function templatesRoutes(fastify: FastifyInstance) {
  // List all templates for tenant
  fastify.get('/templates', {
    onRequest: view
  }, async (request, _reply) => {
    const { user } = request as AuthenticatedRequest
    
    const templates = await prisma.documentTemplate.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    
    return templates
  })

  // Get templates by type
  fastify.get('/templates/type/:type', {
    onRequest: view
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest
    const { type } = request.params as { type: string }
    
    const parsedType = templateSchema.shape.type.safeParse(type)
    if (!parsedType.success) {
      return reply.status(400).send({ error: 'Tipo de template inválido' })
    }
    
    const templates = await prisma.documentTemplate.findMany({
      where: {
        tenantId: user.tenantId,
        type: parsedType.data,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
    
    return templates
  })

  // Get single template
  fastify.get('/templates/:id', {
    onRequest: view
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest
    const { id } = request.params as { id: string }
    
    const template = await prisma.documentTemplate.findUnique({
      where: {
        id,
        tenantId: user.tenantId,
      },
    })
    
    if (!template) {
      return reply.status(404).send({ error: 'Template não encontrado' })
    }
    
    return template
  })

  // Create template
  fastify.post('/templates', {
    onRequest: create
  }, async (request, reply) => {
    const data = templateSchema.parse((request as AuthenticatedRequest).body)
    const { user } = request as AuthenticatedRequest
    
    const template = await prisma.documentTemplate.create({
      data: {
        ...data,
        tenantId: user.tenantId,
      },
    })
    
    return reply.status(201).send(template)
  })

  // Update template
  fastify.put('/templates/:id', {
    onRequest: edit
  }, async (request, _reply) => {
    const { id } = request.params as { id: string }
    const data = templateSchema.partial().parse((request as AuthenticatedRequest).body)
    const { user } = request as AuthenticatedRequest
    
    const template = await prisma.documentTemplate.update({
      where: {
        id,
        tenantId: user.tenantId,
      },
      data,
    })
    
    return template
  })

  // Delete template
  fastify.delete('/templates/:id', {
    onRequest: del
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { user } = request as AuthenticatedRequest
    
    await prisma.documentTemplate.delete({
      where: {
        id,
        tenantId: user.tenantId,
      },
    })
    
    return reply.status(204).send()
  })
}
