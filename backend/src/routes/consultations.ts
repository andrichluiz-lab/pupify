import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.consultations_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.consultations_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.consultations_edit)]
const del = [authenticate, verifyPermVersion, requirePermission(Permission.consultations_delete)]
const ai = [authenticate, verifyPermVersion, requirePermission(Permission.consultations_ai)]
import { transcribeAudio } from '../lib/ai/transcription.js'
import { generateSOAP } from '../lib/ai/soap-generator.js'
import { getPatientContext } from '../lib/ai/patient-context.js'
import { summarizePatientHistory } from '../lib/ai/history-summarizer.js'
import { suggestPrescriptions } from '../lib/ai/prescription-suggester.js'
import { generateTutorInstructions } from '../lib/ai/tutor-instructions-generator.js'
import { uploadAudioToS3, deleteAudioFromS3 } from '../lib/s3-upload.js'
import { getPresignedDownloadUrl } from '../lib/s3-presigned.js'
import type { Prisma } from '@prisma/client'
import { recalcFichaTotal } from '../lib/ficha-helpers.js'

const prescriptionSchema = z.object({
  drug: z.string(),
  dosage: z.string(),
  frequency: z.string(),
  duration: z.string(),
})

const soapNoteSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
})

const soapJsonSchema = z.object({
  subjective: z.array(z.string()).optional(),
  objective: z.array(z.string()).optional(),
  assessment: z.array(z.string()).optional(),
  plan: z.array(z.string()).optional(),
})

const medicalRecordSchema = z.object({
  patientId: z.string(),
  veterinarianId: z.string(),
  tenantId: z.string(),
  veterinarianName: z.string(),
  durationSec: z.number().optional(),
  chiefComplaint: z.string(),
  status: z.enum(['gravando', 'transcrevendo', 'rascunho', 'finalizado']),
  tags: z.array(z.string()).optional(),
  soap: soapNoteSchema.optional(),
  prescriptions: z.array(prescriptionSchema).optional(),
})

export async function consultationsRoutes(fastify: FastifyInstance) {
  // List all consultations (filtered by tenant)
  fastify.get('/consultations', {
    onRequest: view
  }, async (request, _reply) => {
    const { user } = request as AuthenticatedRequest
    const records = await prisma.medicalRecord.findMany({
      where: { tenantId: user.tenantId },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        soap: true,
        prescriptions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    return records
  })

  // Get medical records for a patient (including drafts)
  fastify.get('/patients/:patientId/medical-records', { onRequest: view }, async (request, _reply) => {
    const { patientId } = request.params as { patientId: string }
    
    // Get finalized medical records
    const records = await prisma.medicalRecord.findMany({
      where: { patientId },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        soap: true,
        prescriptions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Get draft consultations
    const drafts = await prisma.consultationDraft.findMany({
      where: { patientId },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Combine and return both records and drafts
    // Map drafts to have the same structure as records for the frontend
    const combined = [
      ...records.map((r) => ({ ...r, type: 'record' as const })),
      ...drafts.map((d) => ({
        ...d,
        type: 'draft' as const,
        patient: {
          id: d.patientId || '',
          name: d.patientName,
          tutor: { name: d.tutorName },
        },
        veterinarian: null,
        soap: null,
        prescriptions: [],
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return combined
  })

  // Get single consultation by ID
  fastify.get('/consultations/:id', { onRequest: view }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        soap: true,
        prescriptions: true,
      },
    })

    if (!record) {
      return reply.status(404).send({ error: 'Medical record not found' })
    }

    return record
  })

  // Get single medical record (legacy endpoint)
  fastify.get('/medical-records/:id', { onRequest: view }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const record = await prisma.medicalRecord.findUnique({
      where: { id },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        soap: true,
        prescriptions: true,
      },
    })

    if (!record) {
      return reply.status(404).send({ error: 'Medical record not found' })
    }

    return record
  })

  // Create consultation
  fastify.post('/consultations', {
    onRequest: create
  }, async (request, reply) => {
    const data = medicalRecordSchema.parse((request as AuthenticatedRequest).body)
    const { soap, prescriptions, ...recordData } = data
    
    const record = await prisma.medicalRecord.create({
      data: {
        ...recordData,
        soap: soap ? {
          create: soap,
        } : undefined,
        prescriptions: prescriptions ? {
          create: prescriptions,
        } : undefined,
      },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        soap: true,
        prescriptions: true,
      },
    })
    return reply.status(201).send(record)
  })

  // Update consultation
  fastify.put('/consultations/:id', {
    onRequest: edit
  }, async (request, _reply) => {
    const { id } = request.params as { id: string }
    const data = medicalRecordSchema.partial().parse((request as AuthenticatedRequest).body)
    const { soap, prescriptions, ...recordData } = data
    
    const record = await prisma.medicalRecord.update({
      where: { id },
      data: {
        ...recordData,
        soap: soap ? {
          upsert: {
            create: soap,
            update: soap,
          },
        } : undefined,
        prescriptions: prescriptions ? {
          deleteMany: {},
          create: prescriptions,
        } : undefined,
      },
      include: {
        patient: {
          include: {
            tutor: true,
          },
        },
        veterinarian: true,
        soap: true,
        prescriptions: true,
      },
    })
    
    return record
  })

  // Delete consultation
  fastify.delete('/consultations/:id', {
    onRequest: del
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { user } = request as AuthenticatedRequest

    try {
      const record = await prisma.medicalRecord.findFirst({
        where: { id, tenantId: user.tenantId },
      })

      if (!record) {
        return reply.status(404).send({ error: 'Consulta não encontrada' })
      }

      await prisma.medicalRecord.delete({
        where: { id },
      })

      return reply.status(204).send()
    } catch (error: unknown) {
      console.error('Error deleting consultation:', error)
      return reply.status(500).send({ error: 'Erro interno do servidor' })
    }
  })

  // ============================================================================
  // AI-ASSISTED CONSULTATION ROUTES
  // ============================================================================

  // POST /api/consultations/transcribe - Transcribe audio chunk
  fastify.post('/consultations/transcribe', {
    onRequest: ai
  }, async (request, reply) => {
    const transcriptionSchema = z.object({
      audioBase64: z.string(),
      mimeType: z.string().default('audio/webm'),
      elapsedSeconds: z.number().default(0),
      recentTranscript: z.array(z.object({ speaker: z.enum(['veterinario', 'tutor']), text: z.string() })).optional(),
      patientContext: z.string().optional(),
    })

    const body = transcriptionSchema.parse(request.body)

    try {
      const result = await transcribeAudio(body)
      return reply.send(result)
    } catch (error: unknown) {
      console.error('Transcription error:', error)
      return reply.status(500).send({ error: 'Failed to transcribe audio' })
    }
  })

  // POST /api/consultations/generate-soap - Generate SOAP from transcript
  fastify.post('/consultations/generate-soap', {
    onRequest: ai
  }, async (request, reply) => {
    const soapRequestSchema = z.object({
      transcript: z.array(z.object({ speaker: z.string(), text: z.string() })),
      patientName: z.string(),
      tutorName: z.string(),
      specialty: z.string().default('generalista'),
      patientId: z.string().optional(),
    })

    const body = soapRequestSchema.parse(request.body)
    const { user } = request as AuthenticatedRequest

    try {
      // Get patient context if patientId is provided
      let patientHistory = ''
      if (body.patientId) {
        patientHistory = await getPatientContext(body.patientId, user.tenantId)
      }

      const result = await generateSOAP({
        ...body,
        patientHistory,
      })
      return reply.send(result)
    } catch (error: unknown) {
      console.error('SOAP generation error:', error)
      return reply.status(500).send({ error: 'Failed to generate SOAP' })
    }
  })

  // GET /api/consultations/draft - Get latest draft for authenticated veterinarian
  fastify.get('/consultations/draft', {
    onRequest: view
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest

    try {
      const draft = await prisma.consultationDraft.findFirst({
        where: {
          veterinarianId: user.userId,
          tenantId: user.tenantId,
        },
        orderBy: { lastAutosaveAt: 'desc' },
        include: {
          transcripts: {
            orderBy: { timestampSeconds: 'asc' },
          },
        },
      })

      if (!draft) {
        return reply.send({ draft: null })
      }

      return reply.send({ draft })
    } catch (error: unknown) {
      console.error('Draft fetch error:', error)
      return reply.status(500).send({ error: 'Failed to fetch draft' })
    }
  })

  // GET /api/consultations/draft/:id - Get specific draft by id
  fastify.get('/consultations/draft/:id', {
    onRequest: view
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest
    const { id } = request.params as { id: string }

    try {
      const draft = await prisma.consultationDraft.findFirst({
        where: { id, tenantId: user.tenantId },
        include: {
          transcripts: { orderBy: { timestampSeconds: 'asc' } },
        },
      })

      if (!draft) {
        return reply.status(404).send({ error: 'Draft not found' })
      }

      return reply.send({ draft })
    } catch (error: unknown) {
      console.error('Draft fetch by id error:', error)
      return reply.status(500).send({ error: 'Failed to fetch draft' })
    }
  })

  // GET /api/consultations/drafts - List all drafts for authenticated veterinarian
  fastify.get('/consultations/drafts', {
    onRequest: view
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest

    try {
      const drafts = await prisma.consultationDraft.findMany({
        where: {
          veterinarianId: user.userId,
          tenantId: user.tenantId,
        },
        orderBy: { lastAutosaveAt: 'desc' },
        include: {
          transcripts: {
            orderBy: { timestampSeconds: 'asc' },
          },
        },
      })

      return drafts
    } catch (error: unknown) {
      console.error('Drafts fetch error:', error)
      return reply.status(500).send({ error: 'Failed to fetch drafts' })
    }
  })

  // POST /api/consultations/draft - Create or update draft (upsert)
  fastify.post('/consultations/draft', {
    onRequest: edit
  }, async (request, reply) => {
    const draftSchema = z.object({
      draftId: z.string().optional(),
      mode: z.enum(['manual', 'ai']).default('manual'),
      patientId: z.string().optional(),
      patientName: z.string().default(''),
      tutorName: z.string().default(''),
      specialty: z.string().default('generalista'),
      transcript: z.array(z.object({
        speaker: z.string(),
        text: z.string(),
        timestampSeconds: z.number(),
      })).optional(),
      soapJson: soapJsonSchema.optional(),
      finalReport: z.string().optional(),
      durationSeconds: z.number().default(0),
      // Campos para modo manual estruturado
      anamnesis: z.string().optional(),
      symptoms: z.array(z.object({
        name: z.string(),
        severity: z.string().optional(),
        duration: z.string().optional(),
        notes: z.string().optional(),
      })).optional(),
      diagnosis: z.string().optional(),
      diagnosticPlan: z.string().optional(),
      treatmentPlan: z.string().optional(),
      notes: z.string().optional(),
      pdvItems: z.array(z.object({
        id: z.string(),
        type: z.enum(['service', 'product']),
        name: z.string(),
        price: z.number(),
        quantity: z.number(),
      })).optional(),
    })

    const body = draftSchema.parse((request as AuthenticatedRequest).body)
    const { user } = request as AuthenticatedRequest
    const resolvedPatientId = body.patientId && body.patientId.length > 0 ? body.patientId : null

    try {
      const now = new Date()

      if (body.draftId) {
        // Update existing draft
        const updatedDraft = await prisma.consultationDraft.update({
          where: { id: body.draftId },
          data: {
            mode: body.mode,
            patientId: resolvedPatientId,
            patientName: body.patientName,
            tutorName: body.tutorName,
            specialty: body.specialty,
            transcript: body.transcript,
            soapJson: body.soapJson,
            finalReport: body.finalReport,
            durationSeconds: body.durationSeconds,
            anamnesis: body.anamnesis,
            symptoms: body.symptoms,
            diagnosis: body.diagnosis,
            diagnosticPlan: body.diagnosticPlan,
            treatmentPlan: body.treatmentPlan,
            notes: body.notes,
            pdvItems: body.pdvItems,
            lastAutosaveAt: now,
          },
          include: {
            transcripts: {
              orderBy: { timestampSeconds: 'asc' },
            },
          },
        })

        // Update transcripts
        if (body.transcript && body.transcript.length > 0) {
          await prisma.consultationTranscript.deleteMany({
            where: { consultationDraftId: body.draftId },
          })

          await prisma.consultationTranscript.createMany({
            data: body.transcript.map((t) => ({
              consultationDraftId: body.draftId!,
              speaker: t.speaker,
              text: t.text,
              timestampSeconds: t.timestampSeconds,
            })),
          })
        }

        return reply.send({ id: updatedDraft.id, draft: updatedDraft, message: 'Draft updated successfully' })
      } else {
        // Create new draft
        const newDraft = await prisma.consultationDraft.create({
          data: {
            mode: body.mode,
            veterinarianId: user.userId,
            tenantId: user.tenantId,
            patientId: resolvedPatientId,
            patientName: body.patientName,
            tutorName: body.tutorName,
            specialty: body.specialty,
            transcript: body.transcript,
            soapJson: body.soapJson,
            finalReport: body.finalReport,
            durationSeconds: body.durationSeconds,
            anamnesis: body.anamnesis,
            symptoms: body.symptoms,
            diagnosis: body.diagnosis,
            diagnosticPlan: body.diagnosticPlan,
            treatmentPlan: body.treatmentPlan,
            notes: body.notes,
            pdvItems: body.pdvItems,
            lastAutosaveAt: now,
          },
          include: {
            transcripts: { orderBy: { timestampSeconds: 'asc' } },
          },
        })

        // Create transcripts
        if (body.transcript && body.transcript.length > 0) {
          await prisma.consultationTranscript.createMany({
            data: body.transcript.map((t) => ({
              consultationDraftId: newDraft.id,
              speaker: t.speaker,
              text: t.text,
              timestampSeconds: t.timestampSeconds,
            })),
          })
        }

        return reply.status(201).send({ id: newDraft.id, draft: newDraft, message: 'Draft created successfully' })
      }
    } catch (error: unknown) {
      console.error('Draft save error:', error)
      return reply.status(500).send({ error: 'Failed to save draft' })
    }
  })

  // DELETE /api/consultations/draft - Delete draft
  fastify.delete('/consultations/draft', {
    onRequest: edit
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest
    const { id } = request.query as { id: string }

    if (!id) {
      return reply.status(400).send({ error: 'Draft ID is required' })
    }

    try {
      // Delete audio from S3 if exists
      const draft = await prisma.consultationDraft.findUnique({
        where: { id },
        select: { audioS3Key: true },
      })

      if (draft?.audioS3Key) {
        await deleteAudioFromS3(draft.audioS3Key)
      }

      // Delete draft (transcripts cascade delete)
      await prisma.consultationDraft.delete({
        where: { id, veterinarianId: user.userId },
      })

      return reply.send({ message: 'Draft deleted successfully' })
    } catch (error: unknown) {
      console.error('Draft delete error:', error)
      return reply.status(500).send({ error: 'Failed to delete draft' })
    }
  })

  // POST /api/consultations/finalize - Convert draft to final MedicalRecord
  fastify.post('/consultations/finalize', {
    onRequest: edit
  }, async (request, reply) => {
    const finalizeSchema = z.object({
      draftId: z.string(),
      method: z.enum(['pix', 'credito', 'debito', 'dinheiro', 'boleto']).optional(),
      amount: z.number().optional(),
      fichaId: z.string().optional(),
    })

    const { draftId, method, amount, fichaId } = finalizeSchema.parse(request.body)
    const { user } = request as AuthenticatedRequest

    try {
      // Get or create Veterinarian for this user
      let veterinarian = await prisma.veterinarian.findFirst({
        where: {
          tenantId: user.tenantId,
          name: user.name || 'Veterinário',
        },
      })

      if (!veterinarian) {
        veterinarian = await prisma.veterinarian.create({
          data: {
            name: user.name || 'Veterinário',
            crmv: '',
            tenantId: user.tenantId,
          },
        })
      }

      // Get draft with all data
      const draft = await prisma.consultationDraft.findUnique({
        where: { id: draftId, tenantId: user.tenantId },
        include: { transcripts: true },
      })

      if (!draft) {
        return reply.status(404).send({ error: 'Draft not found' })
      }

      // Parse SOAP from JSON
      let soapData = null
      if (draft.soapJson && typeof draft.soapJson === 'object') {
        const parsed = soapJsonSchema.safeParse(draft.soapJson)
        if (parsed.success) {
          const soap = parsed.data
          soapData = {
            subjective: soap.subjective?.join('\n') || '',
            objective: soap.objective?.join('\n') || '',
            assessment: soap.assessment?.join('\n') || '',
            plan: soap.plan?.join('\n') || '',
          }
        }
      }

      // Create final MedicalRecord
      const medicalRecord = await prisma.medicalRecord.create({
        data: {
          patientId: draft.patientId || '',
          veterinarianId: veterinarian.id,
          tenantId: user.tenantId,
          veterinarianName: veterinarian.name,
          durationSec: draft.durationSeconds,
          chiefComplaint: draft.finalReport || 'Consulta',
          status: 'finalizado',
          tags: [],
          mode: draft.mode || 'manual',
          anamnesis: draft.anamnesis,
          symptoms: draft.symptoms as Prisma.InputJsonValue,
          diagnosis: draft.diagnosis,
          diagnosticPlan: draft.diagnosticPlan,
          treatmentPlan: draft.treatmentPlan,
          differentialDiagnosis: null,
          notes: draft.notes,
          pdvItems: draft.pdvItems as Prisma.InputJsonValue,
          soap: soapData ? { create: soapData } : undefined,
        },
        include: {
          patient: true,
          soap: true,
          prescriptions: true,
        },
      })

      // Mark draft as finalized instead of deleting (preserve S3 audio)
      await prisma.consultationDraft.update({
        where: { id: draftId },
        data: { finalReport: `Finalizado como prontuário ${medicalRecord.id}` },
      })

      // Transfer documents from draft to medical record
      await prisma.consultationDocument.updateMany({
        where: { draftId },
        data: { medicalRecordId: medicalRecord.id, draftId: null },
      })

      let transaction = null

      if (fichaId) {
        // Ficha aberta flow: add pdvItems to the ficha and move to aguardando_cobranca
        const ficha = await prisma.ficha.findFirst({
          where: { id: fichaId, tenantId: user.tenantId, status: { not: 'fechado' } },
        })

        if (ficha && draft.pdvItems && Array.isArray(draft.pdvItems)) {
          const pdvItems = draft.pdvItems as Array<{ id?: string; name: string; price: number; quantity: number; type: string }>
          await Promise.all(
            pdvItems.map(item =>
              prisma.fichaItem.create({
                data: {
                  fichaId,
                  type: item.type || 'servico',
                  sourceId: medicalRecord.id,
                  sourceType: 'consulta',
                  name: item.name,
                  quantity: item.quantity || 1,
                  unitPrice: item.price || 0,
                  total: (item.price || 0) * (item.quantity || 1),
                  addedById: user.userId,
                },
              })
            )
          )
          await recalcFichaTotal(fichaId)
          await prisma.ficha.update({
            where: { id: fichaId },
            data: { status: 'aguardando_cobranca' },
          })
        }
      } else if (amount && amount > 0) {
        // Legacy flow: create financial transaction immediately
        const patient = await prisma.patient.findUnique({
          where: { id: medicalRecord.patientId },
          include: { tutor: true },
        })

        if (patient) {
          transaction = await prisma.financialTransaction.create({
            data: {
              direction: 'entrada',
              category: 'consulta',
              description: `Consulta - ${patient.name}`,
              amount,
              status: 'pago',
              dueDate: new Date(),
              paidAt: new Date(),
              counterparty: patient.tutor?.name || 'Paciente',
              method,
              patientId: medicalRecord.patientId,
              tutorId: patient.tutorId,
              tenantId: user.tenantId,
            },
          })
        }
      }

      return reply.status(201).send({ medicalRecord, transaction })
    } catch (error: unknown) {
      console.error('Finalization error:', error)
      return reply.status(500).send({ error: 'Failed to finalize consultation' })
    }
  })

  // POST /api/consultations/upload-audio - Upload audio to S3
  fastify.post('/consultations/upload-audio', {
    onRequest: edit
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest

    try {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' })
      }

      const buffer = await data.toBuffer()
      const mimeType = data.mimetype || 'audio/webm'

      // Get draft ID from form data or create new
      let targetDraftId: string | undefined
      const draftIdField = data.fields.draftId
      if (draftIdField) {
        targetDraftId = typeof draftIdField === 'string' ? draftIdField : String((draftIdField as { value: unknown }).value)
      }

      if (!targetDraftId) {
        // Create a new draft if not provided
        const newDraft = await prisma.consultationDraft.create({
          data: {
            veterinarianId: user.userId,
            tenantId: user.tenantId,
            patientName: 'Paciente não informado',
            tutorName: 'Tutor não informado',
            durationSeconds: 0,
          },
        })
        targetDraftId = newDraft.id
      }

      // Upload to S3
      const { s3Key } = await uploadAudioToS3(buffer, mimeType, targetDraftId)

      // Update draft with S3 key
      await prisma.consultationDraft.update({
        where: { id: targetDraftId },
        data: { audioS3Key: s3Key },
      })

      // Generate presigned URL for download
      const presignedUrl = await getPresignedDownloadUrl(s3Key)

      return reply.send({
        draftId: targetDraftId,
        s3Key,
        presignedUrl,
      })
    } catch (error: unknown) {
      console.error('Audio upload error:', error)
      return reply.status(500).send({ error: 'Failed to upload audio' })
    }
  })

  // POST /api/consultations/suggest-prescriptions
  fastify.post('/consultations/suggest-prescriptions', {
    onRequest: ai,
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest
    const { draftId } = request.body as { draftId: string }

    if (!draftId) return reply.status(400).send({ error: 'draftId is required' })

    const draft = await prisma.consultationDraft.findFirst({
      where: { id: draftId, tenantId: user.tenantId },
    })

    if (!draft) return reply.status(404).send({ error: 'Draft not found' })

    const soap = draft.soapJson as Record<string, unknown> | null
    if (!soap) return reply.status(400).send({ error: 'Draft has no SOAP data yet' })

    const patientContext = draft.patientId
      ? await getPatientContext(draft.patientId, user.tenantId)
      : `Paciente: ${draft.patientName}`

    try {
      const suggestions = await suggestPrescriptions(soap, patientContext)
      return reply.send({ suggestions })
    } catch (error: unknown) {
      console.error('Prescription suggestion error:', error)
      return reply.status(500).send({ error: 'Failed to suggest prescriptions' })
    }
  })

  // POST /api/consultations/tutor-instructions
  fastify.post('/consultations/tutor-instructions', {
    onRequest: ai,
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest
    const { draftId } = request.body as { draftId: string }

    if (!draftId) return reply.status(400).send({ error: 'draftId is required' })

    try {
      const result = await generateTutorInstructions(draftId, user.tenantId)
      return reply.send(result)
    } catch (error: unknown) {
      console.error('Tutor instructions error:', error)
      return reply.status(500).send({ error: 'Failed to generate tutor instructions' })
    }
  })

  // GET /api/consultations/history-summary?patientId=:id
  fastify.get('/consultations/history-summary', {
    onRequest: ai,
  }, async (request, reply) => {
    const { user } = request as AuthenticatedRequest
    const { patientId } = request.query as { patientId?: string }

    if (!patientId) {
      return reply.status(400).send({ error: 'patientId is required' })
    }

    try {
      const summary = await summarizePatientHistory(patientId, user.tenantId)
      return reply.send(summary)
    } catch (error: unknown) {
      console.error('History summary error:', error)
      return reply.status(500).send({ error: 'Failed to generate history summary' })
    }
  })
}
