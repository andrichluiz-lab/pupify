import { FastifyPluginAsync } from 'fastify'
import { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { s3Client } from '../lib/s3.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import type { Prisma } from '@prisma/client'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.files_view)]
const upload = [authenticate, verifyPermVersion, requirePermission(Permission.files_upload)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.files_delete)]

const uploadSchema = z.object({
  entityType: z.enum([
    'patient',
    'medical_record',
    'appointment',
    'surgery',
    'hospitalization',
    'consultation_draft',
    'rich_text_image',
    'image_exam',
  ]),
  entityId: z.string().optional(),
})

function buildPublicUrl(key: string): string {
  const endpoint = process.env.B2_ENDPOINT?.replace(/\/$/, '') ?? ''
  const bucket = process.env.B2_BUCKET_NAME ?? ''
  return `${endpoint}/${bucket}/${key}`
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
]

const routes: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Upload file
  fastify.post('/upload', {
    onRequest: upload,
  }, async (request, reply) => {
    try {
      const userId = (request as AuthenticatedRequest).user.userId
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      let entityType: string | undefined
      let entityId: string | undefined
      let fileBuffer: Buffer | undefined
      let fileName: string | undefined
      let fileMimeType: string | undefined

      const parts = request.parts({ limits: { fileSize: MAX_FILE_SIZE } })
      for await (const part of parts) {
        if (part.type === 'file') {
          fileBuffer = await part.toBuffer()
          fileName = part.filename
          fileMimeType = part.mimetype
        } else if (part.fieldname === 'entityType') {
          entityType = String(part.value ?? '')
        } else if (part.fieldname === 'entityId') {
          entityId = String(part.value ?? '')
        }
      }

      if (!fileBuffer || !fileName || !fileMimeType) {
        return reply.status(400).send({ error: 'Nenhum arquivo enviado' })
      }

      const data = uploadSchema.parse({ entityType, entityId })

      if (!ALLOWED_MIME_TYPES.includes(fileMimeType)) {
        return reply.status(400).send({ error: 'Tipo de arquivo não permitido' })
      }

      const timestamp = Date.now()
      const sanitizedFilename = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      entityId = data.entityId || 'standalone'
      const key = `${tenantId}/${data.entityType}/${entityId}/${timestamp}-${sanitizedFilename}`

      const buffer = fileBuffer

      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.B2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: fileMimeType,
      }))

      const fileRecord = await prisma.file.create({
        data: {
          filename: sanitizedFilename,
          originalName: fileName,
          mimeType: fileMimeType,
          sizeBytes: buffer.length,
          key,
          bucket: process.env.B2_BUCKET_NAME || '',
          entityType: data.entityType,
          entityId: entityId!,
          tenantId,
          uploadedBy: userId,
        },
      })

      return reply.status(201).send({ ...fileRecord, url: buildPublicUrl(key) })
    } catch (error: unknown) {
      fastify.log.error(error)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as any).code === 'FST_REQ_FILE_TOO_LARGE'
      ) {
        return reply.status(413).send({
          error: `Arquivo muito grande. O limite máximo é ${MAX_FILE_SIZE / 1024 / 1024}MB.`,
        })
      }
      return reply.status(500).send({ error: 'Erro ao fazer upload do arquivo' })
    }
  })

  // Get signed URL for download
  fastify.get('/:id/download', {
    onRequest: view,
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const file = await prisma.file.findUnique({
        where: { id },
      })

      if (!file) {
        return reply.status(404).send({ error: 'Arquivo não encontrado' })
      }

      if (file.tenantId !== tenantId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      // Generate signed URL (valid for 15 minutes)
      const signedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: file.bucket,
          Key: file.key,
        }),
        { expiresIn: 900 }
      )

      return { url: signedUrl }
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro ao gerar URL de download' })
    }
  })

  // List files by entity
  fastify.get('/', {
    onRequest: view,
  }, async (request, reply) => {
    try {
      const { entityType, entityId } = request.query as {
        entityType?: string
        entityId?: string
      }
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const where: Prisma.FileWhereInput = { tenantId }
      if (entityType) where.entityType = entityType
      if (entityId) where.entityId = entityId

      const files = await prisma.file.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })

      return files.map((f) => ({ ...f, url: buildPublicUrl(f.key) }))
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro ao listar arquivos' })
    }
  })

  // Delete file
  fastify.delete('/:id', {
    onRequest: del,
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const tenantId = (request as AuthenticatedRequest).user.tenantId

      const file = await prisma.file.findUnique({
        where: { id },
      })

      if (!file) {
        return reply.status(404).send({ error: 'Arquivo não encontrado' })
      }

      if (file.tenantId !== tenantId) {
        return reply.status(403).send({ error: 'Acesso negado' })
      }

      // Delete from S3
      await s3Client.send(new DeleteObjectCommand({
        Bucket: file.bucket,
        Key: file.key,
      }))

      // Delete from database
      await prisma.file.delete({
        where: { id },
      })

      return reply.status(204).send()
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(500).send({ error: 'Erro ao deletar arquivo' })
    }
  })
}

export default routes
