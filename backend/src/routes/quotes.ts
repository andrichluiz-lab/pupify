import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.financial_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.financial_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.financial_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.financial_delete)]

const quoteItemSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
})

const quoteSchema = z.object({
  tutorId: z.string(),
  patientId: z.string().optional(),
  items: z.array(quoteItemSchema),
  total: z.number().min(0),
  notes: z.string().optional(),
  validUntil: z.string().optional(),
})

const quoteInclude = {
  tutor: true,
  patient: {
    select: { id: true, name: true, species: true },
  },
}

export async function quotesRoutes(fastify: FastifyInstance) {
  // List all quotes (optionally filtered by tutorId or patientId)
  fastify.get('/quotes', {
    onRequest: view
  }, async (request) => {
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    const { tutorId, patientId } = request.query as { tutorId?: string; patientId?: string }
    const quotes = await prisma.quote.findMany({
      where: {
        tenantId,
        ...(tutorId ? { tutorId } : {}),
        ...(patientId ? { patientId } : {}),
      },
      include: quoteInclude,
      orderBy: { createdAt: 'desc' },
    })
    return quotes
  })

  // Get single quote
  fastify.get('/quotes/:id', {
    onRequest: view
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    const quote = await prisma.quote.findFirst({
      where: { id, tenantId },
      include: quoteInclude,
    })
    if (!quote) return reply.status(404).send({ error: 'Quote not found' })
    return quote
  })

  // Create quote
  fastify.post('/quotes', {
    onRequest: create
  }, async (request, reply) => {
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    const data = quoteSchema.parse(request.body)
    const quote = await prisma.quote.create({
      data: {
        ...data,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
        tenantId,
      },
      include: quoteInclude,
    })
    return reply.status(201).send(quote)
  })

  // Update quote
  fastify.put('/quotes/:id', {
    onRequest: edit
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    const data = quoteSchema.partial().parse(request.body)
    const quote = await prisma.quote.updateMany({
      where: { id, tenantId },
      data: {
        ...data,
        validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
      },
    })
    if (quote.count === 0) return reply.status(404).send({ error: 'Quote not found' })
    const updated = await prisma.quote.findUnique({ where: { id }, include: quoteInclude })
    return updated
  })

  // Approve quote
  fastify.post('/quotes/:id/approve', {
    onRequest: edit
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    const result = await prisma.quote.updateMany({
      where: { id, tenantId },
      data: { status: 'aprovado' },
    })
    if (result.count === 0) return reply.status(404).send({ error: 'Quote not found' })
    return prisma.quote.findUnique({ where: { id }, include: quoteInclude })
  })

  // Reject quote
  fastify.post('/quotes/:id/reject', {
    onRequest: edit
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    const result = await prisma.quote.updateMany({
      where: { id, tenantId },
      data: { status: 'recusado' },
    })
    if (result.count === 0) return reply.status(404).send({ error: 'Quote not found' })
    return prisma.quote.findUnique({ where: { id }, include: quoteInclude })
  })

  // Delete quote
  fastify.delete('/quotes/:id', {
    onRequest: del
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    await prisma.quote.deleteMany({ where: { id, tenantId } })
    return reply.status(204).send()
  })
}
