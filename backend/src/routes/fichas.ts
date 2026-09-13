import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import { Permission } from '@prisma/client'
import { recalcFichaTotal } from '../lib/ficha-helpers.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.fichas_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.fichas_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.fichas_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.fichas_delete)]

const fichaInclude = {
  patient: { select: { id: true, name: true, species: true, breed: true, tutorId: true } },
  tutor: { select: { id: true, name: true, phone: true, email: true } },
  items: { orderBy: { addedAt: 'asc' as const } },
}

const itemSchema = z.object({
  type: z.string(),
  sourceId: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  unitPrice: z.number().min(0),
  total: z.number().min(0),
})

export async function fichasRoutes(fastify: FastifyInstance) {
  // GET /api/fichas — list with optional filters
  fastify.get('/fichas', { onRequest: view }, async (request) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const { status, patientId } = request.query as { status?: string; patientId?: string }

    return prisma.ficha.findMany({
      where: {
        tenantId,
        ...(status ? { status: status as 'aberto' | 'aguardando_cobranca' | 'fechado' } : {}),
        ...(patientId ? { patientId } : {}),
      },
      include: fichaInclude,
      orderBy: { openedAt: 'desc' },
    })
  })

  // GET /api/fichas/:id — single ficha with items and linked clinical records
  fastify.get('/fichas/:id', { onRequest: view }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tenantId } = (request as AuthenticatedRequest).user

    const ficha = await prisma.ficha.findFirst({
      where: { id, tenantId },
      include: fichaInclude,
    })

    if (!ficha) return reply.status(404).send({ error: 'Ficha não encontrada' })

    // Resolve source entities for items that came from clinical records
    const consultaIds = [...new Set(
      ficha.items.filter(i => i.sourceType === 'consulta' && i.sourceId).map(i => i.sourceId!)
    )]
    const exameIds = [...new Set(
      ficha.items.filter(i => i.sourceType === 'exame_imagem' && i.sourceId).map(i => i.sourceId!)
    )]

    const [consultas, exames] = await Promise.all([
      consultaIds.length > 0
        ? prisma.medicalRecord.findMany({
            where: { id: { in: consultaIds }, tenantId },
            select: { id: true, createdAt: true, veterinarian: { select: { name: true } } },
          })
        : [],
      exameIds.length > 0
        ? prisma.imageExam.findMany({
            where: { id: { in: exameIds }, tenantId },
            select: { id: true, type: true, createdAt: true, veterinarian: { select: { name: true } } },
          })
        : [],
    ])

    return {
      ...ficha,
      sources: {
        consultas: Object.fromEntries(consultas.map(c => [c.id, c])),
        exames: Object.fromEntries(exames.map(e => [e.id, e])),
      },
    }
  })

  // POST /api/fichas — open a new ficha
  fastify.post('/fichas', { onRequest: create }, async (request, reply) => {
    const { tenantId, userId } = (request as AuthenticatedRequest).user

    const bodySchema = z.object({
      patientId: z.string(),
      tutorId: z.string().optional(),
      notes: z.string().optional(),
    })

    const { patientId, tutorId, notes } = bodySchema.parse(request.body)

    let resolvedTutorId = tutorId
    if (!resolvedTutorId) {
      const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { tutorId: true } })
      resolvedTutorId = patient?.tutorId ?? undefined
    }

    const ficha = await prisma.ficha.create({
      data: { tenantId, patientId, tutorId: resolvedTutorId, openedById: userId, notes },
      include: fichaInclude,
    })

    return reply.status(201).send(ficha)
  })

  // PATCH /api/fichas/:id — update notes or status
  fastify.patch('/fichas/:id', { onRequest: edit }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tenantId } = (request as AuthenticatedRequest).user

    const bodySchema = z.object({
      notes: z.string().optional(),
      status: z.enum(['aberto', 'aguardando_cobranca']).optional(),
    })

    const data = bodySchema.parse(request.body)

    const result = await prisma.ficha.updateMany({ where: { id, tenantId }, data })
    if (result.count === 0) return reply.status(404).send({ error: 'Ficha não encontrada' })

    return prisma.ficha.findUnique({ where: { id }, include: fichaInclude })
  })

  // POST /api/fichas/:id/items — add item to ficha
  fastify.post('/fichas/:id/items', { onRequest: edit }, async (request, reply) => {
    const { id: fichaId } = request.params as { id: string }
    const { tenantId, userId } = (request as AuthenticatedRequest).user

    const ficha = await prisma.ficha.findFirst({ where: { id: fichaId, tenantId, status: { not: 'fechado' } } })
    if (!ficha) return reply.status(404).send({ error: 'Ficha não encontrada ou já fechada' })

    const { type, sourceId, name, quantity, unitPrice, total } = itemSchema.parse(request.body)

    const item = await prisma.fichaItem.create({
      data: { fichaId, type, sourceId, name, quantity, unitPrice, total, addedById: userId },
    })

    await recalcFichaTotal(fichaId)

    return reply.status(201).send(item)
  })

  // DELETE /api/fichas/:id/items/:itemId — remove item
  fastify.delete('/fichas/:id/items/:itemId', { onRequest: del }, async (request, reply) => {
    const { id: fichaId, itemId } = request.params as { id: string; itemId: string }
    const { tenantId } = (request as AuthenticatedRequest).user

    const ficha = await prisma.ficha.findFirst({ where: { id: fichaId, tenantId, status: { not: 'fechado' } } })
    if (!ficha) return reply.status(404).send({ error: 'Ficha não encontrada ou já fechada' })

    await prisma.fichaItem.deleteMany({ where: { id: itemId, fichaId } })
    await recalcFichaTotal(fichaId)

    return reply.status(204).send()
  })

  // POST /api/fichas/:id/fechar — checkout: atomically create transaction and close ficha
  fastify.post('/fichas/:id/fechar', { onRequest: edit }, async (request, reply) => {
    const { id: fichaId } = request.params as { id: string }
    const { tenantId, userId } = (request as AuthenticatedRequest).user

    const bodySchema = z.object({
      amount: z.number().positive(),
      method: z.enum(['pix', 'credito', 'debito', 'dinheiro', 'boleto']),
      notes: z.string().optional(),
    })

    const { amount, method, notes } = bodySchema.parse(request.body)

    const ficha = await prisma.ficha.findFirst({
      where: { id: fichaId, tenantId, status: { not: 'fechado' } },
      include: {
        patient: { include: { tutor: true } },
        items: { orderBy: { addedAt: 'asc' } },
      },
    })
    if (!ficha) return reply.status(404).send({ error: 'Ficha não encontrada ou já fechada' })

    const itemsSummary = ficha.items
      .map(i => `${i.quantity > 1 ? `${i.quantity}x ` : ''}${i.name}`)
      .join(', ')
    const description = itemsSummary
      ? `Atendimento - ${ficha.patient.name} (${itemsSummary})`
      : `Atendimento - ${ficha.patient.name}`

    const updated = await prisma.$transaction(async (tx) => {
      const transaction = await tx.financialTransaction.create({
        data: {
          direction: 'entrada',
          category: 'consulta',
          description,
          amount,
          status: 'pago',
          dueDate: new Date(),
          paidAt: new Date(),
          counterparty: ficha.patient.tutor?.name || ficha.patient.name,
          method,
          patientId: ficha.patientId,
          tutorId: ficha.tutorId,
          fichaId,
          tenantId,
        },
      })

      return tx.ficha.update({
        where: { id: fichaId },
        data: {
          status: 'fechado',
          closedAt: new Date(),
          closedById: userId,
          totalAmount: amount,
          paymentMethod: method,
          transactionId: transaction.id,
          notes: notes ?? ficha.notes,
        },
        include: fichaInclude,
      })
    })

    return updated
  })
}
