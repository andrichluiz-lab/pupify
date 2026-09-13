import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.inventory_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.inventory_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.inventory_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.inventory_delete)]

const inventoryItemSchema = z.object({
  sku: z.string(),
  name: z.string(),
  category: z.enum(['medicamento', 'vacina', 'insumo', 'racao', 'acessorio']),
  unit: z.string(),
  stock: z.number(),
  minStock: z.number(),
  unitCost: z.number(),
  salePrice: z.number(),
  supplier: z.string().nullable().optional(),
  batch: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  requiresPrescription: z.boolean().optional(),
})

export async function inventoryRoutes(fastify: FastifyInstance) {
  // List all inventory items
  fastify.get('/inventory', {
    onRequest: view
  }, async (request, _reply) => {
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    
    const items = await prisma.inventoryItem.findMany({
      where: { tenantId },
      orderBy: {
        name: 'asc',
      },
    })
    return items
  })

  // Get single inventory item
  fastify.get('/inventory/:id', {
    onRequest: view
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    
    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    })
    
    if (!item) {
      return reply.status(404).send({ error: 'Inventory item not found' })
    }
    
    return item
  })

  // Create inventory item
  fastify.post('/inventory', {
    onRequest: create
  }, async (request, reply) => {
    const data = inventoryItemSchema.parse(request.body)
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    const item = await prisma.inventoryItem.create({
      data: {
        ...data,
        tenantId,
      },
    })
    return reply.status(201).send(item)
  })

  // Update inventory item
  fastify.put('/inventory/:id', {
    onRequest: edit
  }, async (request, _reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    const data = inventoryItemSchema.partial().parse(request.body)
    
    const item = await prisma.inventoryItem.update({
      where: { id, tenantId },
      data,
    })
    
    return item
  })

  // Delete inventory item
  fastify.delete('/inventory/:id', {
    onRequest: del
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    await prisma.inventoryItem.delete({
      where: { id, tenantId },
    })
    return reply.status(204).send()
  })
}
