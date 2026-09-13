import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { sendEmail, sendTemplateEmail, getEmailLogs } from '../lib/email-service.js'

interface AuthenticatedRequest {
  user: {
    id: string
    tenantId: string
  }
}

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  type: z.enum([
    'appointment_confirmation',
    'appointment_reminder',
    'password_reset',
    'hospitalization_update',
    'financial_report',
    'surgery_reminder',
    'custom',
  ]),
  variables: z.array(z.string()).optional(),
  active: z.boolean().optional(),
})

const updateTemplateSchema = createTemplateSchema.partial()

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
})

const sendTemplateEmailSchema = z.object({
  to: z.string().email(),
  templateType: z.enum([
    'appointment_confirmation',
    'appointment_reminder',
    'password_reset',
    'hospitalization_update',
    'financial_report',
    'surgery_reminder',
    'custom',
  ]),
  variables: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
})

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  // All routes require authentication
  fastify.register(async function (fastify) {
    fastify.addHook('onRequest', fastify.authenticate)

    // GET /api/emails/templates - List templates
    fastify.get('/templates', async (request) => {
      const tenantId = (request as AuthenticatedRequest).user.tenantId
      const { type } = request.query as { type?: string }

      const templates = await prisma.emailTemplate.findMany({
        where: {
          tenantId,
          ...(type ? { type: type as any } : {}),
        },
        orderBy: { createdAt: 'desc' },
      })

      return templates
    })

    // GET /api/emails/templates/:id - Get template by ID
    fastify.get('/templates/:id', async (request, reply) => {
      const { id } = request.params as { id: string }
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const template = await prisma.emailTemplate.findFirst({
        where: { id, tenantId },
      })

      if (!template) {
        return reply.status(404).send({ error: 'Template não encontrado' })
      }

      return template
    })

    // POST /api/emails/templates - Create template
    fastify.post('/templates', async (request, reply) => {
      const tenantId = (request as AuthenticatedRequest).user.tenantId
      const data = createTemplateSchema.parse(request.body)

      const template = await prisma.emailTemplate.create({
        data: {
          ...data,
          tenantId,
          variables: data.variables || [],
        },
      })

      return reply.status(201).send(template)
    })

    // PUT /api/emails/templates/:id - Update template
    fastify.put('/templates/:id', async (request, reply) => {
      const { id } = request.params as { id: string }
      const tenantId = (request as AuthenticatedRequest).user.tenantId
      const data = updateTemplateSchema.parse(request.body)

      const existingTemplate = await prisma.emailTemplate.findFirst({
        where: { id, tenantId },
      })

      if (!existingTemplate) {
        return reply.status(404).send({ error: 'Template não encontrado' })
      }

      const template = await prisma.emailTemplate.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.subject !== undefined && { subject: data.subject }),
          ...(data.body !== undefined && { body: data.body }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.active !== undefined && { active: data.active }),
          ...(data.variables !== undefined && { variables: data.variables }),
        },
      })

      return template
    })

    // DELETE /api/emails/templates/:id - Delete template
    fastify.delete('/templates/:id', async (request, reply) => {
      const { id } = request.params as { id: string }
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const existingTemplate = await prisma.emailTemplate.findFirst({
        where: { id, tenantId },
      })

      if (!existingTemplate) {
        return reply.status(404).send({ error: 'Template não encontrado' })
      }

      await prisma.emailTemplate.delete({
        where: { id },
      })

      return reply.status(204).send()
    })

    // POST /api/emails/send - Send custom email
    fastify.post('/send', async (request, reply) => {
      const tenantId = (request as AuthenticatedRequest).user.tenantId
      const { to, subject, html } = sendEmailSchema.parse(request.body)

      const success = await sendEmail({
        to,
        subject,
        html,
        tenantId,
      })

      if (!success) {
        return reply.status(500).send({ error: 'Falha ao enviar email' })
      }

      return { success: true, message: 'Email enviado com sucesso' }
    })

    // POST /api/emails/send-template - Send email using template
    fastify.post('/send-template', async (request, reply) => {
      const tenantId = (request as AuthenticatedRequest).user.tenantId
      const { to, templateType, variables } = sendTemplateEmailSchema.parse(request.body)

      const success = await sendTemplateEmail(
        tenantId,
        templateType,
        to,
        variables || {}
      )

      if (!success) {
        return reply.status(500).send({ error: 'Falha ao enviar email' })
      }

      return { success: true, message: 'Email enviado com sucesso' }
    })

    // GET /api/emails/logs - Get email logs
    fastify.get('/logs', async (request) => {
      const tenantId = (request as AuthenticatedRequest).user.tenantId
      const { limit } = request.query as { limit?: string }

      const logs = await getEmailLogs(
        tenantId,
        limit ? parseInt(limit, 10) : 50
      )

      return logs
    })
  })
}

export { routes as emailRoutes }
