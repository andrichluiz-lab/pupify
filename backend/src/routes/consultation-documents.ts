import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import type { AuthenticatedRequest } from '../types/fastify.js'
import type { Prisma, TemplateType } from '@prisma/client'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.consultations_view)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.consultations_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.consultations_delete)]

const documentTypeSchema = z.enum([
  'receita',
  'exame',
  'termo',
  'atestado',
  'declaracao',
  'prontuario_modelo',
])

const createSchema = z.object({
  draftId: z.string().optional(),
  medicalRecordId: z.string().optional(),
  templateId: z.string().optional(),
  type: documentTypeSchema,
  title: z.string().min(1),
  content: z.string(),
}).refine((d) => !!d.draftId || !!d.medicalRecordId, {
  message: 'Either draftId or medicalRecordId is required',
})

const updateSchema = z.object({
  templateId: z.string().optional(),
  type: documentTypeSchema.optional(),
  title: z.string().min(1).optional(),
  content: z.string().optional(),
})

async function ensureOwnership(
  tenantId: string,
  data: { draftId?: string; medicalRecordId?: string }
): Promise<boolean> {
  if (data.draftId) {
    const draft = await prisma.consultationDraft.findFirst({
      where: { id: data.draftId, tenantId },
      select: { id: true },
    })
    return !!draft
  }
  if (data.medicalRecordId) {
    const mr = await prisma.medicalRecord.findFirst({
      where: { id: data.medicalRecordId, tenantId },
      select: { id: true },
    })
    return !!mr
  }
  return false
}

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  // List documents
  fastify.get('/', {
    onRequest: view,
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest
    const { draftId, medicalRecordId } = request.query as {
      draftId?: string
      medicalRecordId?: string
    }

    const where: Prisma.ConsultationDocumentWhereInput = {}
    if (draftId) {
      where.draftId = draftId
      where.draft = { tenantId: user.tenantId }
    } else if (medicalRecordId) {
      where.medicalRecordId = medicalRecordId
      where.medicalRecord = { tenantId: user.tenantId }
    } else {
      return reply.status(400).send({
        error: 'draftId ou medicalRecordId obrigatório',
      })
    }

    const documents = await prisma.consultationDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return documents
  })

  // Create document
  fastify.post('/', {
    onRequest: edit,
  }, async (request, reply) => {
    try {
      const data = createSchema.parse((request as AuthenticatedRequest).body)
      const { user } = request as AuthenticatedRequest

      const owns = await ensureOwnership(user.tenantId, data)
      if (!owns) {
        return reply.status(404).send({ error: 'Consulta/draft não encontrado' })
      }

      const document = await prisma.consultationDocument.create({
        data: {
          draftId: data.draftId,
          medicalRecordId: data.medicalRecordId,
          templateId: data.templateId,
          type: data.type as TemplateType,
          title: data.title,
          content: data.content,
        },
      })

      return reply.status(201).send(document)
    } catch (error: unknown) {
      fastify.log.error(error)
      const message = error instanceof Error ? error.message : 'Erro ao criar documento'
      return reply.status(500).send({ error: 'Erro ao criar documento', detail: message })
    }
  })

  // Update document
  fastify.put('/:id', {
    onRequest: edit,
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { user } = request as AuthenticatedRequest

    try {
      const data = updateSchema.parse((request as AuthenticatedRequest).body)

      const existing = await prisma.consultationDocument.findUnique({
        where: { id },
        include: {
          draft: { select: { tenantId: true } },
          medicalRecord: { select: { tenantId: true } },
        },
      })
      if (!existing) {
        return reply.status(404).send({ error: 'Documento não encontrado' })
      }
      const tenantId = existing.draft?.tenantId ?? existing.medicalRecord?.tenantId
      if (tenantId !== user.tenantId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      const updated = await prisma.consultationDocument.update({
        where: { id },
        data: {
          ...(data.type ? { type: data.type as TemplateType } : {}),
          ...(data.templateId !== undefined ? { templateId: data.templateId } : {}),
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.content !== undefined ? { content: data.content } : {}),
        },
      })

      return updated
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro ao atualizar documento' })
    }
  })

  // Delete document
  fastify.delete('/:id', {
    onRequest: del,
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { user } = request as AuthenticatedRequest

    const existing = await prisma.consultationDocument.findUnique({
      where: { id },
      include: {
        draft: { select: { tenantId: true } },
        medicalRecord: { select: { tenantId: true } },
      },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Documento não encontrado' })
    }
    const tenantId = existing.draft?.tenantId ?? existing.medicalRecord?.tenantId
    if (tenantId !== user.tenantId) {
      return reply.status(403).send({ error: 'Acesso negado' })
    }

    await prisma.consultationDocument.delete({ where: { id } })
    return reply.status(204).send()
  })
}

export default routes
