import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import { generateDischargeReport } from '../lib/ai/discharge-report-generator.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.hospitalizations_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.hospitalizations_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.hospitalizations_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.hospitalizations_delete)]

const hospitalizationSchema = z.object({
  patientId: z.string(),
  veterinarianId: z.string(),
  admittedAt: z.string(),
  dischargedAt: z.string().optional(),
  reason: z.string(),
  kennel: z.string(),
  status: z.enum(['estavel', 'observacao', 'critico', 'recuperacao']),
  painLevel: z.number().min(0).max(5).optional(),
  dietNotes: z.string().optional(),
  dailyRate: z.number().positive().optional(),
})

export async function hospitalizationsRoutes(fastify: FastifyInstance) {
  // List all hospitalizations
  fastify.get('/hospitalizations', { onRequest: view }, async (_request, _reply) => {
    const hospitalizations = await prisma.hospitalization.findMany({
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
      },
      orderBy: {
        admittedAt: 'desc',
      },
    })
    return hospitalizations
  })

  // List hospitalization details (with vitals and orders)
  fastify.get('/hospitalizations/details', { onRequest: view }, async (_request, _reply) => {
    const hospitalizations = await prisma.hospitalization.findMany({
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        vitals: {
          orderBy: {
            updatedAt: 'desc',
          },
          take: 1,
        },
        orders: {
          orderBy: {
            time: 'asc',
          },
        },
      },
      orderBy: {
        admittedAt: 'desc',
      },
    })
    
    return hospitalizations.map((h: {
      id: string;
      patientId: string;
      veterinarianId: string;
      tenantId: string;
      admittedAt: Date;
      reason: string;
      kennel: string;
      status: string;
      painLevel: number | null;
      dietNotes: string | null;
      createdAt: Date;
      updatedAt: Date;
      vitals: Array<{
        id: string;
        hospitalizationId: string;
        temperature: number | null;
        heartRate: number | null;
        respiratoryRate: number | null;
        bloodPressure: string | null;
        oxygenSaturation: number | null;
        updatedAt: Date;
      }>;
      orders: Array<{
        id: string;
        hospitalizationId: string;
        time: string;
        drug: string;
        dose: string;
        route: string;
        done: boolean;
        createdAt: Date;
        updatedAt: Date;
      }>;
      patient: {
        id: string;
        name: string;
        species: string;
        breed: string;
        sex: string;
        birthDate: Date;
        weightKg: number;
        tutor: {
          id: string;
          name: string;
          email: string | null;
          phone: string;
        };
      };
      veterinarian: {
        id: string;
        name: string;
        crmv: string;
      };
    }) => ({
      ...h,
      vitals: h.vitals[0] || null,
    }))
  })

  // Get single hospitalization
  fastify.get('/hospitalizations/:id', { onRequest: view }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const hospitalization = await prisma.hospitalization.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        vitals: {
          orderBy: {
            updatedAt: 'desc',
          },
          take: 1,
        },
        orders: {
          orderBy: {
            time: 'asc',
          },
        },
      },
    })
    
    if (!hospitalization) {
      return reply.status(404).send({ error: 'Hospitalization not found' })
    }
    
    return {
      ...hospitalization,
      vitals: hospitalization.vitals[0] || null,
    }
  })

  // Create hospitalization
  fastify.post('/hospitalizations', {
    onRequest: create
  }, async (request, reply) => {
    const data = hospitalizationSchema.parse((request as AuthenticatedRequest).body)
    const tenantId = (request as AuthenticatedRequest).user.tenantId

    // Get patient to obtain tutorId
    const patient = await prisma.patient.findUnique({
      where: { id: data.patientId },
      select: { tutorId: true },
    })

    if (!patient) {
      return reply.status(404).send({ error: 'Patient not found' })
    }

    // Calculate appointment time range (1 hour default for scheduling)
    const startsAt = new Date(data.admittedAt)
    const endsAt = new Date(startsAt.getTime() + 60 * 60000)

    // Create hospitalization and appointment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const hospitalization = await tx.hospitalization.create({
        data: {
          ...data,
          admittedAt: new Date(data.admittedAt),
          tenantId,
        },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          veterinarian: true,
        },
      })

      // Create corresponding appointment in the calendar
      await tx.appointment.create({
        data: {
          patientId: hospitalization.patientId,
          tutorId: patient.tutorId,
          veterinarianId: hospitalization.veterinarianId,
          type: 'emergencia',
          status: 'agendado',
          startsAt,
          endsAt,
          room: hospitalization.kennel,
          notes: `Internação: ${hospitalization.reason}\n\nBox: ${hospitalization.kennel}`,
          tenantId,
        },
      })

      return hospitalization
    })

    return reply.status(201).send(result)
  })

  // Update hospitalization
  fastify.put('/hospitalizations/:id', {
    onRequest: edit
  }, async (request, _reply) => {
    const { id } = request.params as { id: string }
    const data = hospitalizationSchema.partial().parse((request as AuthenticatedRequest).body)

    const hospitalization = await prisma.hospitalization.update({
      where: { id },
      data: {
        ...data,
        admittedAt: data.admittedAt ? new Date(data.admittedAt) : undefined,
      },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        vitals: {
          orderBy: {
            updatedAt: 'desc',
          },
          take: 1,
        },
        orders: {
          orderBy: {
            time: 'asc',
          },
        },
      },
    })

    return {
      ...hospitalization,
      vitals: hospitalization.vitals[0] || null,
    }
  })

  // Delete hospitalization
  fastify.delete('/hospitalizations/:id', {
    onRequest: del
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    await prisma.hospitalization.delete({
      where: { id },
    })
    return reply.status(204).send()
  })

  // Toggle treatment order done status
  fastify.put('/treatment-orders/:id', {
    onRequest: edit
  }, async (request, _reply) => {
    const { id } = request.params as { id: string }
    const { done } = (request as AuthenticatedRequest).body as { done: boolean }

    const order = await prisma.treatmentOrder.update({
      where: { id },
      data: { done },
    })

    return order
  })

  // Create treatment order
  fastify.post('/treatment-orders', {
    onRequest: create
  }, async (request, reply) => {
    const treatmentOrderSchema = z.object({
      hospitalizationId: z.string(),
      time: z.string(),
      drug: z.string(),
      dose: z.string(),
      route: z.string(),
    })

    const data = treatmentOrderSchema.parse((request as AuthenticatedRequest).body)
    const order = await prisma.treatmentOrder.create({
      data,
    })

    return reply.status(201).send(order)
  })

  // Create vital signs
  fastify.post('/vital-signs', {
    onRequest: create
  }, async (request, reply) => {
    const vitalSignsSchema = z.object({
      hospitalizationId: z.string(),
      temperature: z.number().optional(),
      heartRate: z.number().optional(),
      respiratoryRate: z.number().optional(),
      bloodPressure: z.string().optional(),
      oxygenSaturation: z.number().optional(),
    })

    const data = vitalSignsSchema.parse((request as AuthenticatedRequest).body)
    const vitals = await prisma.vitalSigns.create({
      data,
    })

    return reply.status(201).send(vitals)
  })

  // POST /api/hospitalizations/:id/generate-discharge
  fastify.post('/hospitalizations/:id/generate-discharge', {
    onRequest: edit,
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const tenantId = (request as AuthenticatedRequest).user.tenantId

    try {
      const result = await generateDischargeReport(id, tenantId)

      await prisma.hospitalization.update({
        where: { id },
        data: { dischargeReport: result.report },
      })

      return reply.send(result)
    } catch (error: unknown) {
      console.error('Discharge report generation error:', error)
      return reply.status(500).send({ error: 'Failed to generate discharge report' })
    }
  })
}
