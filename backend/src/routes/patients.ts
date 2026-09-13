import { FastifyInstance } from 'fastify'
import { Permission, Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'

const view   = [authenticate, verifyPermVersion, requirePermission(Permission.patients_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.patients_create)]
const edit   = [authenticate, verifyPermVersion, requirePermission(Permission.patients_edit)]
const del    = [authenticate, verifyPermVersion, requirePermission(Permission.patients_delete)]

const tView   = [authenticate, verifyPermVersion, requirePermission(Permission.tutors_view)]
const tCreate = [authenticate, verifyPermVersion, requirePermission(Permission.tutors_create)]
const tEdit   = [authenticate, verifyPermVersion, requirePermission(Permission.tutors_edit)]

const tutorContactSchema = z.object({
  type:       z.string(),
  phone:      z.string(),
  isWhatsapp: z.boolean().default(false),
  notes:      z.string().optional(),
})

const tutorSchema = z.object({
  name:                 z.string().min(1),
  email:                z.string().email().optional().nullable(),
  phone:                z.string(),
  cpf:                  z.string().optional().nullable(),
  address:              z.string().optional().nullable(),
  personType:           z.string().optional().nullable(),
  rg:                   z.string().optional().nullable(),
  nationality:          z.string().optional().nullable(),
  sex:                  z.string().optional().nullable(),
  birthDate:            z.string().optional().nullable(),
  howFound:             z.string().optional().nullable(),
  profession:           z.string().optional().nullable(),
  municipalRegistration: z.string().optional().nullable(),
  cep:                  z.string().optional().nullable(),
  addressStreet:        z.string().optional().nullable(),
  addressNumber:        z.string().optional().nullable(),
  addressComplement:    z.string().optional().nullable(),
  addressNeighborhood:  z.string().optional().nullable(),
  addressCity:          z.string().optional().nullable(),
  addressState:         z.string().optional().nullable(),
  addressReference:     z.string().optional().nullable(),
  contacts:             z.array(tutorContactSchema).optional().nullable(),
  notes:                z.string().optional().nullable(),
  tags:                 z.array(z.string()).default([]),
  acceptEmail:          z.boolean().default(true),
  acceptSms:            z.boolean().default(true),
  acceptCampaignSms:    z.boolean().default(true),
  acceptWhatsapp:       z.boolean().default(true),
})

const patientSchema = z.object({
  name:              z.string().min(1),
  species:           z.enum(['Cao', 'Gato', 'Ave', 'Roedor', 'Reptil', 'Outro']),
  breed:             z.string(),
  sex:               z.enum(['M', 'F']),
  birthDate:         z.string(),
  weightKg:          z.number().positive(),
  color:             z.string().optional(),
  microchip:         z.string().optional(),
  neutered:          z.boolean().default(false),
  photoUrl:          z.string().optional(),
  tutorId:           z.string().optional(),
  allergies:         z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
})

const createPatientSchema = z.object({
  patient: patientSchema,
  tutor:   tutorSchema.optional(),
})

export async function patientsRoutes(fastify: FastifyInstance) {

  // ── Patients ────────────────────────────────────────────────────────────────

  fastify.get('/patients', { onRequest: view }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    return prisma.patient.findMany({
      where:   { tenantId: user.tenantId },
      include: { tutor: true },
      orderBy: { createdAt: 'desc' },
    })
  })

  fastify.get('/patients/search', { onRequest: view }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const { q } = request.query as { q?: string }
    if (!q) return []
    return prisma.patient.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [
          { name:  { contains: q, mode: 'insensitive' } },
          { tutor: { name: { contains: q, mode: 'insensitive' } } },
        ],
      },
      include: { tutor: true },
      take: 10,
    })
  })

  fastify.get('/patients/:id', { onRequest: view }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as AuthenticatedRequest).user
    const patient = await prisma.patient.findUnique({
      where:   { id },
      include: { tutor: true },
    })
    if (!patient)                            return reply.status(404).send({ error: 'Patient not found' })
    if (patient.tenantId !== user.tenantId)  return reply.status(403).send({ error: 'Access denied' })
    return patient
  })

  fastify.post('/patients', { onRequest: create }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user
      if (!user.tenantId) return reply.status(400).send({ error: 'Tenant ID is required' })

      const { tutor: tutorData, patient: patientData } = createPatientSchema.parse(request.body)
      let tutorId = patientData.tutorId

      if (tutorData && !tutorId) {
        if (tutorData.email) {
          const existing = await prisma.tutor.findUnique({ where: { email: tutorData.email } })
          if (existing) tutorId = existing.id
        }
        if (!tutorId) {
          const tutor = await prisma.tutor.create({
            data: {
              ...tutorData,
              contacts: tutorData.contacts === null ? Prisma.JsonNull : tutorData.contacts ?? undefined,
            },
          })
          tutorId = tutor.id
        }
      }

      const patient = await prisma.patient.create({
        data: {
          ...patientData,
          birthDate: new Date(patientData.birthDate),
          tutorId:   tutorId!,
          tenantId:  user.tenantId,
        },
        include: { tutor: true },
      })
      return reply.status(201).send(patient)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) return reply.status(400).send({ error: 'Validation error', details: error.errors })
      throw error
    }
  })

  fastify.put('/patients/:id', { onRequest: edit }, async (request, reply) => {
    const { id }   = request.params as { id: string }
    const user     = (request as AuthenticatedRequest).user
    const data     = patientSchema.partial().parse(request.body)
    const existing = await prisma.patient.findUnique({ where: { id } })
    if (!existing || existing.tenantId !== user.tenantId) return reply.status(404).send({ error: 'Patient not found' })
    return prisma.patient.update({
      where: { id },
      data:  { ...data, birthDate: data.birthDate ? new Date(data.birthDate) : undefined },
      include: { tutor: true },
    })
  })

  fastify.delete('/patients/:id', { onRequest: del }, async (request, reply) => {
    const { id }   = request.params as { id: string }
    const user     = (request as AuthenticatedRequest).user
    const existing = await prisma.patient.findUnique({ where: { id } })
    if (!existing || existing.tenantId !== user.tenantId) return reply.status(404).send({ error: 'Patient not found' })
    await prisma.patient.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ── Tutors ──────────────────────────────────────────────────────────────────

  // List tutors enriched with animal count, last appointment and pending balance
  fastify.get('/tutors', { onRequest: tView }, async (request) => {
    const user = (request as AuthenticatedRequest).user

    const tutors = await prisma.tutor.findMany({
      where: {
        OR: [
          { tenantId: user.tenantId },
          { patients: { some: { tenantId: user.tenantId } } },
        ],
      },
      include: {
        patients: {
          where:  { tenantId: user.tenantId },
          select: { id: true, name: true, species: true, breed: true },
        },
        appointments: {
          where:   { tenantId: user.tenantId },
          orderBy: { startsAt: 'desc' },
          take:    1,
          select:  { startsAt: true, type: true },
        },
        transactions: {
          where: {
            tenantId:  user.tenantId,
            direction: 'entrada',
            status:    { in: ['pendente', 'atrasado'] },
          },
          select: { amount: true },
        },
      },
      orderBy: { name: 'asc' },
    })

    return tutors.map(({ transactions, ...tutor }) => ({
      ...tutor,
      patientsCount:     tutor.patients.length,
      lastAppointmentAt: tutor.appointments[0]?.startsAt ?? null,
      pendingBalance:    transactions.reduce((sum, t) => sum + t.amount, 0),
    }))
  })

  // Search tutors filtered by current tenant
  fastify.get('/tutors/search', { onRequest: tView }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const { q } = request.query as { q?: string }
    if (!q) return []

    return prisma.tutor.findMany({
      where: {
        AND: [
          {
            OR: [
              { tenantId: user.tenantId },
              { patients: { some: { tenantId: user.tenantId } } },
            ],
          },
          {
            OR: [
              { name:  { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { cpf:   { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      include: {
        patients: {
          where:  { tenantId: user.tenantId },
          select: { id: true, name: true, species: true },
          take:   5,
        },
      },
      take: 10,
    })
  })

  // Get full tutor detail: animals + recent appointments + transactions
  fastify.get('/tutors/:id', { onRequest: tView }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user   = (request as AuthenticatedRequest).user

    const tutor = await prisma.tutor.findFirst({
      where: {
        id,
        OR: [
          { tenantId: user.tenantId },
          { patients: { some: { tenantId: user.tenantId } } },
        ],
      },
      include: {
        patients: {
          where:   { tenantId: user.tenantId },
          orderBy: { name: 'asc' },
        },
        appointments: {
          where:   { tenantId: user.tenantId },
          orderBy: { startsAt: 'desc' },
          take:    20,
          include: {
            patient:      { select: { id: true, name: true, species: true } },
            veterinarian: { select: { id: true, name: true } },
          },
        },
        transactions: {
          where:   { tenantId: user.tenantId },
          orderBy: { createdAt: 'desc' },
          take:    50,
          include: { patient: { select: { id: true, name: true } } },
        },
      },
    })

    if (!tutor) return reply.status(404).send({ error: 'Tutor not found' })
    return tutor
  })

  // Create tutor
  fastify.post('/tutors', { onRequest: tCreate }, async (request, reply) => {
    try {
      const user = (request as AuthenticatedRequest).user
      const data = tutorSchema.parse(request.body)

      if (data.email) {
        const existing = await prisma.tutor.findUnique({ where: { email: data.email } })
        if (existing) return reply.status(409).send({ error: 'Email já cadastrado', tutorId: existing.id })
      }
      if (data.cpf) {
        const existing = await prisma.tutor.findUnique({ where: { cpf: data.cpf } })
        if (existing) return reply.status(409).send({ error: 'CPF já cadastrado', tutorId: existing.id })
      }

      const tutor = await prisma.tutor.create({
        data: {
          ...data,
          tenantId:  user.tenantId,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
          contacts:  data.contacts === null ? Prisma.JsonNull : data.contacts ?? undefined,
        },
      })
      return reply.status(201).send(tutor)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) return reply.status(400).send({ error: 'Validation error', details: error.errors })
      throw error
    }
  })

  // Update tutor
  fastify.put('/tutors/:id', { onRequest: tEdit }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user   = (request as AuthenticatedRequest).user

    const existing = await prisma.tutor.findFirst({
      where: {
        id,
        OR: [
          { tenantId: user.tenantId },
          { patients: { some: { tenantId: user.tenantId } } },
        ],
      },
    })
    if (!existing) return reply.status(404).send({ error: 'Tutor not found' })

    const data = tutorSchema.partial().parse(request.body)

    try {
      return await prisma.tutor.update({
        where: { id },
        data: {
          ...data,
          birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
          contacts:  data.contacts === null ? Prisma.JsonNull : data.contacts ?? undefined,
        },
      })
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
        const meta = (error as { meta?: { target?: string[] } }).meta
        const field = meta?.target?.[0]
        return reply.status(409).send({ error: `${field === 'email' ? 'Email' : 'CPF'} já cadastrado` })
      }
      throw error
    }
  })

  // Tutor's animals (in this tenant)
  fastify.get('/tutors/:id/patients', { onRequest: tView }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user   = (request as AuthenticatedRequest).user

    const tutor = await prisma.tutor.findFirst({
      where: {
        id,
        OR: [
          { tenantId: user.tenantId },
          { patients: { some: { tenantId: user.tenantId } } },
        ],
      },
    })
    if (!tutor) return reply.status(404).send({ error: 'Tutor not found' })

    return prisma.patient.findMany({
      where:   { tutorId: id, tenantId: user.tenantId },
      orderBy: { name: 'asc' },
    })
  })

  // All appointments for a tutor across their animals
  fastify.get('/tutors/:id/appointments', { onRequest: tView }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user   = (request as AuthenticatedRequest).user

    const tutor = await prisma.tutor.findFirst({
      where: { id, patients: { some: { tenantId: user.tenantId } } },
    })
    if (!tutor) return reply.status(404).send({ error: 'Tutor not found' })

    return prisma.appointment.findMany({
      where:   { tutorId: id, tenantId: user.tenantId },
      orderBy: { startsAt: 'desc' },
      include: {
        patient:      { select: { id: true, name: true, species: true } },
        veterinarian: { select: { id: true, name: true } },
      },
    })
  })

  // Financial transactions linked to tutor or their animals
  fastify.get('/tutors/:id/transactions', { onRequest: tView }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user   = (request as AuthenticatedRequest).user

    const tutor = await prisma.tutor.findFirst({
      where: { id, patients: { some: { tenantId: user.tenantId } } },
    })
    if (!tutor) return reply.status(404).send({ error: 'Tutor not found' })

    return prisma.financialTransaction.findMany({
      where: {
        tenantId: user.tenantId,
        OR: [{ tutorId: id }, { patient: { tutorId: id } }],
      },
      include: { patient: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
  })

  // ── Veterinarians ────────────────────────────────────────────────────────────

  fastify.get('/veterinarians', {
    onRequest: [authenticate, verifyPermVersion],
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    return prisma.veterinarian.findMany({
      where:   { tenantId: user.tenantId },
      orderBy: { name: 'asc' },
    })
  })
}
