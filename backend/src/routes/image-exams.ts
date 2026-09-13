import { FastifyPluginAsync } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import type { Prisma } from '@prisma/client'
import { recalcFichaTotal } from '../lib/ficha-helpers.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.image_exams_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.image_exams_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.image_exams_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.image_exams_delete)]
const ai = [authenticate, verifyPermVersion, requirePermission(Permission.image_exams_ai)]

const imageExamSchema = z.object({
  patientId: z.string(),
  veterinarianId: z.string().optional(),
  type: z.enum(['radiografia', 'ultrassom', 'tomografia', 'ressonancia', 'laboratorio', 'outro']),
  fileId: z.string().optional(),
  fileIds: z.array(z.string()).optional(),
  extractedText: z.string().optional(),
  aiAnalysis: z.any().optional(),
  aiReport: z.string().optional(),
  veterinarianNotes: z.string().optional(),
  pdvItems: z.any().optional(),
})

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  // List all image exams (filtered by tenant)
  fastify.get('/', {
    onRequest: view
  }, async (request, reply) => {
    try {
      const { user } = request as AuthenticatedRequest
      const { status, type, patientId } = request.query as {
        status?: string
        type?: string
        patientId?: string
      }

      const where: Prisma.ImageExamWhereInput = { tenantId: user.tenantId }
      
      if (status) where.status = status as any
      if (type) where.type = type as any
      if (patientId) where.patientId = patientId

      const exams = await prisma.imageExam.findMany({
        where,
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          veterinarian: true,
          file: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return exams
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro ao listar exames de imagens' })
    }
  })

  // Get image exam by ID
  fastify.get('/:id', {
    onRequest: view
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { user } = request as AuthenticatedRequest

      const exam = await prisma.imageExam.findUnique({
        where: { id },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          veterinarian: true,
          file: true,
        },
      })

      if (!exam) {
        return reply.status(404).send({ error: 'Exame não encontrado' })
      }

      if (exam.tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      return exam
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro ao buscar exame' })
    }
  })

  // Create new image exam
  fastify.post('/', {
    onRequest: create
  }, async (request, reply) => {
    try {
      const { user } = request as AuthenticatedRequest
      const data = imageExamSchema.parse((request as AuthenticatedRequest).body)

      const exam = await prisma.imageExam.create({
        data: {
          patientId: data.patientId,
          veterinarianId: data.veterinarianId,
          type: data.type,
          fileId: data.fileId,
          fileIds: data.fileIds ?? [],
          extractedText: data.extractedText,
          aiAnalysis: data.aiAnalysis,
          aiReport: data.aiReport,
          veterinarianNotes: data.veterinarianNotes,
          pdvItems: data.pdvItems,
          tenantId: user.tenantId,
        } as any,
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          veterinarian: true,
          file: true,
        },
      })

      return reply.status(201).send(exam)
    } catch (error: unknown) {
      fastify.log.error(error)
      const message = error instanceof Error ? error.message : 'Erro ao criar exame'
      return reply.status(400).send({ error: message })
    }
  })

  // Update image exam
  fastify.put('/:id', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { user } = request as AuthenticatedRequest
      const data = imageExamSchema.partial().parse((request as AuthenticatedRequest).body)

      const existing = await prisma.imageExam.findUnique({
        where: { id },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Exame não encontrado' })
      }

      if (existing.tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      const exam = await prisma.imageExam.update({
        where: { id },
        data,
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          veterinarian: true,
          file: true,
        },
      })

      return exam
    } catch (error: unknown) {
      fastify.log.error(error)
      const message = error instanceof Error ? error.message : 'Erro ao atualizar exame'
      return reply.status(400).send({ error: message })
    }
  })

  // Delete image exam
  fastify.delete('/:id', {
    onRequest: del
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { user } = request as AuthenticatedRequest

      const existing = await prisma.imageExam.findUnique({
        where: { id },
      })

      if (!existing) {
        return reply.status(404).send({ error: 'Exame não encontrado' })
      }

      if (existing.tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      await prisma.imageExam.delete({
        where: { id },
      })

      return reply.status(204).send()
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro ao deletar exame' })
    }
  })

  // Analyze image exam with AI
  fastify.post('/:id/analyze', {
    onRequest: ai,
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { user } = request as AuthenticatedRequest

      const exam = await prisma.imageExam.findUnique({
        where: { id },
        include: {
          file: true,
          patient: {
            include: {
              tutor: true,
            },
          },
        },
      })

      if (!exam) {
        return reply.status(404).send({ error: 'Exame não encontrado' })
      }

      if (exam.tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      // Collect file IDs: prefer fileIds array, fallback to single fileId
      const storedFileIds = (exam.fileIds as string[] | null) || []
      const allFileIds = storedFileIds.length > 0
        ? storedFileIds
        : exam.fileId ? [exam.fileId] : []

      if (allFileIds.length === 0) {
        return reply.status(400).send({ error: 'Nenhum arquivo associado ao exame' })
      }

      const fileRecords = await prisma.file.findMany({
        where: { id: { in: allFileIds } },
      })

      if (fileRecords.length === 0) {
        return reply.status(400).send({ error: 'Arquivos não encontrados' })
      }

      // Update status to analyzing
      await prisma.imageExam.update({
        where: { id },
        data: { status: 'analisando' },
      })

      // Import AI analyzer dynamically to avoid circular dependencies
      const { analyzeImageExam } = await import('../lib/ai/image-exam-analyzer.js')

      const analysis = await analyzeImageExam({
        files: fileRecords.map((f) => ({
          fileKey: f.key,
          fileBucket: f.bucket,
          fileMimeType: f.mimeType,
        })),
        patientName: exam.patient.name,
        patientSpecies: exam.patient.species,
        examType: exam.type,
      })

      // Update exam with AI results
      const updated = await prisma.imageExam.update({
        where: { id },
        data: {
          extractedText: analysis.extractedText,
          aiAnalysis: analysis.aiAnalysis,
          aiReport: analysis.aiReport,
          status: 'pendente',
        },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          veterinarian: true,
          file: true,
        },
      })

      return updated
    } catch (error: unknown) {
      fastify.log.error(error)
      
      // Revert status on error
      try {
        await prisma.imageExam.update({
          where: { id: (request.params as { id: string }).id },
          data: { status: 'pendente' },
        })
      } catch {}

      const message = error instanceof Error ? error.message : 'Erro ao analisar exame'
      return reply.status(500).send({ error: message })
    }
  })

  // Finalize image exam and create financial transaction
  fastify.post('/:id/finalize', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const { user } = request as AuthenticatedRequest
      const { paymentAmount, paymentMethod, fichaId } = (request as AuthenticatedRequest).body as {
        paymentAmount?: number
        paymentMethod?: string
        fichaId?: string
      }

      const exam = await prisma.imageExam.findUnique({
        where: { id },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
        },
      })

      if (!exam) {
        return reply.status(404).send({ error: 'Exame não encontrado' })
      }

      if (exam.tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      // Update exam status to concluded
      const updated = await prisma.imageExam.update({
        where: { id },
        data: { status: 'concluido' },
        include: {
          patient: {
            include: {
              tutor: true,
            },
          },
          veterinarian: true,
          file: true,
        },
      })

      if (fichaId && exam.pdvItems) {
        // Route items to ficha for billing by reception
        const pdvItems = exam.pdvItems as Array<{ id: string; name: string; type: string; price: number; quantity: number }>
        for (const item of pdvItems) {
          await prisma.fichaItem.create({
            data: {
              fichaId,
              type: item.type === 'service' ? 'servico' : 'produto',
              sourceId: exam.id,
              sourceType: 'exame_imagem',
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.price,
              total: item.price * item.quantity,
              addedById: user.userId,
            },
          })
        }
        await recalcFichaTotal(fichaId)
        await prisma.ficha.update({
          where: { id: fichaId },
          data: { status: 'aguardando_cobranca' },
        })
      } else if (paymentAmount && paymentMethod && exam.pdvItems) {
        // Legacy: direct payment at finalization
        const pdvItems = exam.pdvItems as Array<{ price: number; quantity: number }>
        const total = pdvItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
        await prisma.financialTransaction.create({
          data: {
            direction: 'entrada',
            category: 'exame',
            description: `Exame de imagem - ${exam.patient.name}`,
            amount: paymentAmount || total,
            status: 'pago',
            dueDate: new Date(),
            paidAt: new Date(),
            counterparty: exam.patient.tutor?.name || 'Não informado',
            method: paymentMethod as any,
            patientId: exam.patientId,
            tutorId: exam.patient.tutorId,
            tenantId: user.tenantId,
          },
        })
      }

      return updated
    } catch (error: unknown) {
      fastify.log.error(error)
      const message = error instanceof Error ? error.message : 'Erro ao finalizar exame'
      return reply.status(500).send({ error: message })
    }
  })
}

export default routes
