import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.financial_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.financial_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.financial_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.financial_delete)]
const reports = [authenticate, verifyPermVersion, requirePermission(Permission.financial_reports)]

const transactionSchema = z.object({
  direction: z.enum(['entrada', 'saida']),
  category: z.enum(['consulta', 'cirurgia', 'exame', 'produto', 'salario', 'aluguel', 'fornecedor', 'utilidades', 'marketing', 'outros']),
  description: z.string().min(1),
  amount: z.number().positive(),
  status: z.enum(['pago', 'pendente', 'atrasado']),
  dueDate: z.string(),
  paidAt: z.string().optional(),
  counterparty: z.string(),
  method: z.enum(['pix', 'credito', 'debito', 'dinheiro', 'boleto']).optional(),
  patientId: z.string().optional(),
  tutorId: z.string().optional(),
})

export async function financialRoutes(fastify: FastifyInstance) {
  // List all transactions (filtered by tenant)
  fastify.get('/financial/transactions', {
    onRequest: view
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const transactions = await prisma.financialTransaction.findMany({
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
        ficha: {
          select: {
            id: true,
            items: {
              select: { id: true, name: true, quantity: true, unitPrice: true, total: true, type: true },
              orderBy: { addedAt: 'asc' },
            },
          },
        },
      },
      orderBy: {
        dueDate: 'desc',
      },
    })
    return transactions
  })

  // Get single transaction
  fastify.get('/financial/transactions/:id', {
    onRequest: view
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as AuthenticatedRequest).user
    
    const transaction = await prisma.financialTransaction.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        tutor: true,
      },
    })
    
    if (!transaction) {
      return reply.status(404).send({ error: 'Transaction not found' })
    }
    
    // Verify tenant access
    if (transaction.tenantId !== user.tenantId) {
      return reply.status(403).send({ error: 'Access denied' })
    }
    
    return transaction
  })

  // Create transaction
  fastify.post('/financial/transactions', {
    onRequest: create
  }, async (request, reply) => {
    try {
      const data = transactionSchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      // Validate date format
      const dueDate = new Date(data.dueDate)
      if (isNaN(dueDate.getTime())) {
        return reply.status(400).send({ error: 'Invalid dueDate format' })
      }

      // Validate patient/tutor belong to the tenant; auto-derive tutorId from patient if needed
      if (data.patientId) {
        const patient = await prisma.patient.findUnique({
          where: { id: data.patientId },
          select: { tenantId: true, tutorId: true }
        })
        if (!patient || patient.tenantId !== user.tenantId) {
          return reply.status(400).send({ error: 'Patient not found or does not belong to your tenant' })
        }
        // Auto-derive tutorId from patient when not explicitly provided
        if (!data.tutorId) {
          data.tutorId = patient.tutorId ?? undefined
        }
      }
      if (data.tutorId) {
        const tutor = await prisma.tutor.findUnique({
          where: { id: data.tutorId },
          select: { id: true }
        })
        if (!tutor) {
          return reply.status(400).send({ error: 'Tutor not found' })
        }
      }

      // Use transaction for atomicity
      const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.financialTransaction.create({
          data: {
            ...data,
            dueDate,
            paidAt: data.paidAt ? new Date(data.paidAt) : null,
            tenantId: user.tenantId
          },
          include: {
            patient: {
              include: {
                tutor: true,
              },
            },
            tutor: true,
          },
        })

        // Automatically create appointment for the transaction
        if (data.patientId && data.tutorId) {
          // Get an available veterinarian from the tenant
          const veterinarian = await tx.veterinarian.findFirst({
            where: { tenantId: user.tenantId }
          })

          if (!veterinarian) {
            throw new Error('No veterinarian found in this tenant. Cannot create appointment.')
          }

          const appointmentDate = new Date(data.dueDate)
          const endsAt = new Date(appointmentDate)

          // Configure duration based on category
          const durationHours = data.category === 'cirurgia' ? 2 : data.category === 'exame' ? 1.5 : 1
          endsAt.setHours(endsAt.getHours() + durationHours)

          // Map transaction status to appointment status
          const appointmentStatus = data.status === 'pago' ? 'confirmado' : 'agendado'

          await tx.appointment.create({
            data: {
              patientId: data.patientId,
              tutorId: data.tutorId,
              veterinarianId: veterinarian.id,
              tenantId: user.tenantId,
              type: data.category === 'consulta' ? 'consulta' : data.category === 'cirurgia' ? 'cirurgia' : 'exame',
              status: appointmentStatus,
              startsAt: appointmentDate,
              endsAt: endsAt,
              notes: `Transação: ${data.description} - ${data.direction === 'entrada' ? 'Receita' : 'Despesa'} de R$ ${data.amount}`,
            },
          })
        }

        return transaction
      })

      return reply.status(201).send(result)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      if (error instanceof Error && error.message === 'No veterinarian found in this tenant. Cannot create appointment.') {
        return reply.status(400).send({ error: error.message })
      }
      throw error
    }
  })

  // Update transaction
  fastify.put('/financial/transactions/:id', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = transactionSchema.partial().parse(request.body)
      const user = (request as AuthenticatedRequest).user

      const transaction = await prisma.financialTransaction.update({
        where: { id },
        data: {
          ...data,
          dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
          paidAt: data.paidAt ? new Date(data.paidAt) : null,
        },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          tutor: true,
        },
      })

      // Verify tenant access
      if (transaction.tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Access denied' })
      }

      return transaction
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        return reply.status(404).send({ error: 'Transaction not found' })
      }
      throw error
    }
  })

  // Delete transaction
  fastify.delete('/financial/transactions/:id', {
    onRequest: del
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as AuthenticatedRequest).user
    
    try {
      // First verify ownership
      const transaction = await prisma.financialTransaction.findUnique({
        where: { id }
      })
      
      if (!transaction) {
        return reply.status(404).send({ error: 'Transaction not found' })
      }
      
      if (transaction.tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Access denied' })
      }
      
      await prisma.financialTransaction.delete({
        where: { id },
      })
      return reply.status(204).send()
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
        return reply.status(404).send({ error: 'Transaction not found' })
      }
      throw error
    }
  })

  // Get cashflow data for chart (last 6 months)
  fastify.get('/financial/cashflow', {
    onRequest: reports
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const now = new Date()
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    sixMonthsAgo.setDate(1)

    const transactions = await prisma.financialTransaction.findMany({
      where: {
        tenantId: user.tenantId,
        paidAt: {
          gte: sixMonthsAgo,
        },
        status: 'pago',
      },
      select: {
        direction: true,
        amount: true,
        paidAt: true,
      },
    })

    // Group by month
    const cashflowByMonth = new Map<string, { entrada: number; saida: number }>()
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

    for (const tx of transactions) {
      if (!tx.paidAt) continue
      const date = new Date(tx.paidAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const current = cashflowByMonth.get(monthKey) || { entrada: 0, saida: 0 }
      if (tx.direction === 'entrada') {
        current.entrada += tx.amount
      } else {
        current.saida += tx.amount
      }
      cashflowByMonth.set(monthKey, current)
    }

    // Generate last 6 months data
    const result = []
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now)
      date.setMonth(date.getMonth() - i)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = monthNames[date.getMonth()]
      const data = cashflowByMonth.get(monthKey) || { entrada: 0, saida: 0 }
      result.push({
        month: monthLabel,
        entrada: data.entrada,
        saida: data.saida,
      })
    }

    return result
  })
}
