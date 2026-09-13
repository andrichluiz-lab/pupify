import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import type { AuthenticatedRequest } from '../types/fastify.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import { generateSurgeryReport } from '../lib/ai/surgery-report-generator.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.surgeries_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.surgeries_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.surgeries_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.surgeries_delete)]

const checklistItemSchema = z.object({
  label: z.string(),
  done: z.boolean().default(false),
  order: z.number().default(0),
})

const surgerySchema = z.object({
  patientId: z.string(),
  veterinarianId: z.string(),
  procedure: z.string(),
  surgeon: z.string(),
  anesthetist: z.string().optional(),
  assistant: z.string().optional(),
  scheduledFor: z.string(),
  estimatedDurationMin: z.number(),
  room: z.string(),
  risk: z.enum(['baixo', 'medio', 'alto']),
  status: z.enum(['agendada', 'pre_op', 'em_andamento', 'recuperacao', 'concluida', 'cancelada']),
  notes: z.string().optional(),
  surgeryNotes: z.string().optional(),
  anesthesiaNotes: z.string().optional(),
  checklistItems: z.array(checklistItemSchema).optional(),
  pdvItems: z.any().optional(),
})

export async function surgeriesRoutes(fastify: FastifyInstance) {
  // List all surgeries
  fastify.get('/surgeries', {
    onRequest: view
  }, async (request) => {
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    const { patientId } = request.query as { patientId?: string }
    const surgeries = await prisma.surgery.findMany({
      where: { tenantId, ...(patientId ? { patientId } : {}) },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        checklistItems: {
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        scheduledFor: 'asc',
      },
    })
    return surgeries
  })

  // Get single surgery
  fastify.get('/surgeries/:id', {
    onRequest: view
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId
    const surgery = await prisma.surgery.findFirst({
      where: { id, tenantId },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        checklistItems: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    if (!surgery) {
      return reply.status(404).send({ error: 'Surgery not found' })
    }

    return surgery
  })

  // Create surgery
  fastify.post('/surgeries', {
    onRequest: create
  }, async (request, reply) => {
    const data = surgerySchema.parse((request as AuthenticatedRequest).body)
    const { checklistItems, ...surgeryData } = data
    const tenantId = (request as AuthenticatedRequest).user.tenantId

    // Get patient to obtain tutorId
    const patient = await prisma.patient.findUnique({
      where: { id: surgeryData.patientId },
      select: { tutorId: true },
    })

    if (!patient) {
      return reply.status(404).send({ error: 'Patient not found' })
    }

    // Calculate appointment time range
    const startsAt = new Date(surgeryData.scheduledFor)
    const endsAt = new Date(startsAt.getTime() + surgeryData.estimatedDurationMin * 60000)

    // Create surgery and appointment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const surgery = await tx.surgery.create({
        data: {
          ...surgeryData,
          tenantId,
          checklistItems: checklistItems ? {
            create: checklistItems,
          } : undefined,
        },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          veterinarian: true,
          checklistItems: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      })

      // Create corresponding appointment in the calendar
      await tx.appointment.create({
        data: {
          patientId: surgery.patientId,
          tutorId: patient.tutorId,
          veterinarianId: surgery.veterinarianId,
          type: 'cirurgia',
          status: 'agendado',
          startsAt,
          endsAt,
          room: surgery.room,
          notes: surgery.notes ? `Cirurgia: ${surgery.procedure}\n\n${surgery.notes}` : `Cirurgia: ${surgery.procedure}`,
          tenantId,
        },
      })

      return surgery
    })

    return reply.status(201).send(result)
  })

  // Update surgery
  fastify.put('/surgeries/:id', {
    onRequest: edit
  }, async (request, _reply) => {
    const { id } = request.params as { id: string }
    const data = surgerySchema.partial().parse((request as AuthenticatedRequest).body)
    const { checklistItems, pdvItems, ...surgeryData } = data

    const surgery = await prisma.surgery.update({
      where: { id },
      data: {
        ...surgeryData,
        checklistItems: checklistItems ? {
          deleteMany: {},
          create: checklistItems,
        } : undefined,
        pdvItems: pdvItems as Prisma.InputJsonValue,
      },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        checklistItems: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    })

    return surgery
  })

  // Delete surgery
  fastify.delete('/surgeries/:id', {
    onRequest: del
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId

    await prisma.surgery.deleteMany({
      where: { id, tenantId },
    })

    return reply.status(204).send()
  })

  // POST /api/surgeries/:id/generate-report
  fastify.post('/surgeries/:id/generate-report', {
    onRequest: edit,
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId

    try {
      const report = await generateSurgeryReport(id, tenantId)

      // Save report back to surgeryNotes field
      const updated = await prisma.surgery.update({
        where: { id },
        data: { surgeryNotes: report },
        include: {
          patient: { include: { tutor: true } },
          veterinarian: true,
          checklistItems: { orderBy: { order: 'asc' } },
        },
      })

      return reply.send({ report, surgery: updated })
    } catch (error: unknown) {
      console.error('Surgery report generation error:', error)
      return reply.status(500).send({ error: 'Failed to generate surgery report' })
    }
  })
}
