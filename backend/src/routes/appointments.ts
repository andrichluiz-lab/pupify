import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import type { Prisma } from '@prisma/client'
import { createAppointmentNotification } from './notifications.js'
import { sendTemplateEmail } from '../lib/email-service.js'
import { classifyAppointmentUrgency } from '../lib/ai/appointment-urgency-classifier.js'
import { generateDailyReport } from '../lib/ai/daily-report-generator.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.agenda_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.agenda_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.agenda_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.agenda_delete)]

const appointmentSchema = z.object({
  patientId: z.string(),
  tutorId: z.string(),
  veterinarianId: z.string(),
  type: z.enum(['consulta', 'retorno', 'vacina', 'cirurgia', 'exame', 'banho_tosa', 'emergencia']),
  status: z.enum(['agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'falta']),
  startsAt: z.string(),
  endsAt: z.string(),
  notes: z.string().optional(),
  room: z.string().optional(),
})

export async function appointmentsRoutes(fastify: FastifyInstance) {
  // List all appointments
  fastify.get('/appointments', {
    onRequest: view
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: user.tenantId
      },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        tutor: true,
        veterinarian: true,
      },
      orderBy: {
        startsAt: 'asc',
      },
    })
    return appointments
  })

  // Get appointments for a patient
  fastify.get('/patients/:patientId/appointments', {
    onRequest: view
  }, async (request, reply) => {
    const { patientId } = request.params as { patientId: string }
    const user = (request as AuthenticatedRequest).user

    // Verify patient belongs to tenant
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    })

    if (!patient || patient.tenantId !== user.tenantId) {
      return reply.status(404).send({ error: 'Patient not found' })
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId,
        tenantId: user.tenantId
      },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        tutor: true,
        veterinarian: true,
      },
      orderBy: {
        startsAt: 'desc',
      },
    })
    return appointments.map(a => ({
      ...a,
      veterinarianName: a.veterinarian.name,
    }))
  })

  // Get today's appointments
  fastify.get('/appointments/today', {
    onRequest: view
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const appointments = await prisma.appointment.findMany({
      where: {
        tenantId: user.tenantId,
        startsAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        tutor: true,
        veterinarian: true,
      },
      orderBy: {
        startsAt: 'asc',
      },
    })
    return appointments.map(a => ({
      ...a,
      veterinarianName: a.veterinarian.name,
    }))
  })

  // Get single appointment
  fastify.get('/appointments/:id', {
    onRequest: view
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as AuthenticatedRequest).user

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        tutor: true,
        veterinarian: true,
      },
    })

    if (!appointment) {
      return reply.status(404).send({ error: 'Appointment not found' })
    }

    if (appointment.tenantId !== user.tenantId) {
      return reply.status(403).send({ error: 'Access denied' })
    }

    return {
      ...appointment,
      veterinarianName: appointment.veterinarian.name,
    }
  })

  // Create appointment
  fastify.post('/appointments', {
    onRequest: create
  }, async (request, reply) => {
    try {
      const data = appointmentSchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      const appointment = await prisma.appointment.create({
        data: {
          ...data,
          startsAt: new Date(data.startsAt),
          endsAt: new Date(data.endsAt),
          tenantId: user.tenantId,
        },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          tutor: true,
          veterinarian: true,
        },
      })
      const startsAt = new Date(data.startsAt)
      const dateStr = startsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      const timeStr = startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

      createAppointmentNotification({
        veterinarianId: data.veterinarianId,
        tenantId: user.tenantId,
        title: 'Novo atendimento atribuído',
        message: `${appointment.patient.name} — ${dateStr} às ${timeStr}`,
        link: '/agenda',
      })

      // Send appointment confirmation email if tutor has email
      if (appointment.tutor.email) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: user.tenantId },
        })

        sendTemplateEmail(
          user.tenantId,
          'appointment_confirmation',
          appointment.tutor.email,
          {
            patientName: appointment.patient.name,
            tutorName: appointment.tutor.name,
            appointmentDate: dateStr,
            appointmentTime: timeStr,
            appointmentType: data.type,
            clinicName: tenant?.name || 'Clínica Veterinária',
          }
        ).catch((err) => {
          console.error('Failed to send appointment confirmation email:', err)
        })
      }

      return reply.status(201).send({
        ...appointment,
        veterinarianName: appointment.veterinarian.name,
      })
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }
  })

  // Update appointment
  fastify.put('/appointments/:id', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = appointmentSchema.partial().parse(request.body)
      const user = (request as AuthenticatedRequest).user

      // Verify tenant access
      const existingAppointment = await prisma.appointment.findUnique({
        where: { id }
      })

      if (!existingAppointment || existingAppointment.tenantId !== user.tenantId) {
        return reply.status(404).send({ error: 'Appointment not found' })
      }

      const appointment = await prisma.appointment.update({
        where: { id },
        data: {
          ...data,
          startsAt: data.startsAt ? new Date(data.startsAt) : undefined,
          endsAt: data.endsAt ? new Date(data.endsAt) : undefined,
        },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          tutor: true,
          veterinarian: true,
        },
      })

      // Notify if vet was reassigned
      const newVetId = data.veterinarianId
      if (newVetId && newVetId !== existingAppointment.veterinarianId) {
        const startsAt = appointment.startsAt
        const dateStr = startsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const timeStr = startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

        createAppointmentNotification({
          veterinarianId: newVetId,
          tenantId: user.tenantId,
          title: 'Atendimento atribuído a você',
          message: `${appointment.patient.name} — ${dateStr} às ${timeStr}`,
          link: '/agenda',
        })
      }

      return {
        ...appointment,
        veterinarianName: appointment.veterinarian.name,
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }
  })

  // Delete appointment
  fastify.delete('/appointments/:id', {
    onRequest: del
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as AuthenticatedRequest).user

    // Verify tenant access
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id }
    })

    if (!existingAppointment || existingAppointment.tenantId !== user.tenantId) {
      return reply.status(404).send({ error: 'Appointment not found' })
    }

    await prisma.appointment.delete({
      where: { id },
    })
    return reply.status(204).send()
  })

  // Kanban: List appointments with filters
  fastify.get('/appointments/kanban', {
    onRequest: view
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const { date, veterinarianId, type, status } = request.query as {
      date?: string
      veterinarianId?: string
      type?: string
      status?: string
    }

    // Build where clause
    const where: Prisma.AppointmentWhereInput = {
      tenantId: user.tenantId,
    }

    // Filter by date (default: today)
    if (date) {
      // Parse date string as local time to avoid UTC conversion issues
      const [year, month, day] = date.split('-').map(Number)
      const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0)
      const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999)
      where.startsAt = {
        gte: startOfDay,
        lte: endOfDay,
      }
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      where.startsAt = {
        gte: today,
        lt: tomorrow,
      }
    }

    if (veterinarianId) {
      where.veterinarianId = veterinarianId
    }

    if (type) {
      where.type = type as import('@prisma/client').AppointmentType
    }

    if (status) {
      const statusArray = Array.isArray(status) ? status : [status]
      where.status = { in: statusArray as import('@prisma/client').AppointmentStatus[] }
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        tutor: true,
        veterinarian: true,
      },
      orderBy: {
        startsAt: 'asc',
      },
    })

    return appointments.map(a => ({
      ...a,
      veterinarianName: a.veterinarian.name,
    }))
  })

  // Update appointment status (covers cancellation via status change)
  fastify.put('/appointments/:id/status', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const statusSchema = z.object({
        status: z.enum(['agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'falta']),
      })
      const { status } = statusSchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      // Verify tenant access
      const existingAppointment = await prisma.appointment.findUnique({
        where: { id }
      })

      if (!existingAppointment || existingAppointment.tenantId !== user.tenantId) {
        return reply.status(404).send({ error: 'Appointment not found' })
      }

      const appointment = await prisma.appointment.update({
        where: { id },
        data: { status },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          tutor: true,
          veterinarian: true,
        },
      })

      return {
        ...appointment,
        veterinarianName: appointment.veterinarian.name,
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }
  })

  // Finalize appointment and create transaction
  fastify.post('/appointments/:id/finalize', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const finalizeSchema = z.object({
        method: z.enum(['pix', 'credito', 'debito', 'dinheiro', 'boleto']).optional(),
        amount: z.number().optional(),
      })
      const { method, amount } = finalizeSchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      // Verify tenant access
      const existingAppointment = await prisma.appointment.findUnique({
        where: { id },
        include: {
          patient: true,
          tutor: true,
        },
      })

      if (!existingAppointment || existingAppointment.tenantId !== user.tenantId) {
        return reply.status(404).send({ error: 'Appointment not found' })
      }

      // Update appointment status to concluido
      const appointment = await prisma.appointment.update({
        where: { id },
        data: { status: 'concluido' },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          tutor: true,
          veterinarian: true,
        },
      })

      // Create financial transaction if amount provided
      const appointmentTypeToCategory: Record<string, import('@prisma/client').TxCategory> = {
        consulta: 'consulta',
        retorno: 'consulta',
        vacina: 'produto',
        cirurgia: 'cirurgia',
        exame: 'exame',
        banho_tosa: 'outros',
        emergencia: 'consulta',
      }

      let transaction = null
      if (amount && amount > 0) {
        transaction = await prisma.financialTransaction.create({
          data: {
            direction: 'entrada',
            category: appointmentTypeToCategory[existingAppointment.type] || 'outros' as import('@prisma/client').TxCategory,
            description: `${existingAppointment.type} - ${existingAppointment.patient.name}`,
            amount,
            status: 'pago',
            dueDate: new Date(),
            paidAt: new Date(),
            counterparty: existingAppointment.tutor.name,
            method,
            patientId: existingAppointment.patientId,
            tutorId: existingAppointment.tutorId,
            tenantId: user.tenantId,
          },
        })
      }

      return {
        appointment: {
          ...appointment,
          veterinarianName: appointment.veterinarian.name,
        },
        transaction,
      }
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }
  })

  // POST /api/appointments/daily-report
  fastify.post('/appointments/daily-report', {
    onRequest: view,
  }, async (request, reply) => {
    const { date } = request.body as { date?: string }
    const user = (request as AuthenticatedRequest).user

    const reportDate = date ?? new Date().toISOString().split('T')[0]

    try {
      const result = await generateDailyReport(user.tenantId, reportDate)
      return reply.send(result)
    } catch (error: unknown) {
      console.error('Daily report error:', error)
      return reply.status(500).send({ error: 'Failed to generate daily report' })
    }
  })

  // POST /api/appointments/classify-urgency
  fastify.post('/appointments/classify-urgency', {
    onRequest: create,
  }, async (request, reply) => {
    const { notes, type, patientSpecies } = request.body as {
      notes: string
      type: string
      patientSpecies?: string
    }

    if (!notes || !type) {
      return reply.status(400).send({ error: 'notes and type are required' })
    }

    try {
      const result = await classifyAppointmentUrgency(notes, type, patientSpecies)
      return reply.send(result)
    } catch (error: unknown) {
      console.error('Urgency classification error:', error)
      return reply.status(500).send({ error: 'Failed to classify urgency' })
    }
  })
}
 