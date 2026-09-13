import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'
import * as evo from '../lib/evolution-client.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.whatsapp_view)]
const send = [authenticate, verifyPermVersion, requirePermission(Permission.whatsapp_send)]
const manage = [authenticate, verifyPermVersion, requirePermission(Permission.whatsapp_manage)]

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET
if (!WEBHOOK_SECRET) throw new Error('WEBHOOK_SECRET environment variable is required')

const PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? 'http://localhost:3001'

function webhookUrl(tenantId: string) {
  return `${PUBLIC_API_URL}/api/whatsapp/webhook?token=${WEBHOOK_SECRET}&tenantId=${tenantId}`
}

function phoneFromJid(jid: string): string {
  return jid.replace(/[@:].*/g, '')
}

// ── Automation helpers ────────────────────────────────────────────────────────

function isOutsideOperatingHours(operatingHours: string): boolean {
  try {
    const hours = JSON.parse(operatingHours) as {
      weekdays?: { from: string; to: string } | null
      saturday?: { from: string; to: string } | null
      sunday?: { from: string; to: string } | null
    }
    const now = new Date()
    const day = now.getDay()
    const slot = day === 0 ? hours.sunday : day === 6 ? hours.saturday : hours.weekdays
    if (!slot) return true
    const [fh, fm] = slot.from.split(':').map(Number)
    const [th, tm] = slot.to.split(':').map(Number)
    const cur = now.getHours() * 60 + now.getMinutes()
    return cur < fh * 60 + fm || cur > th * 60 + tm
  } catch {
    return false
  }
}

function applyVars(template: string, contactName: string | null, phone: string): string {
  return template
    .replace(/\{\{nome\}\}/gi, contactName ?? phone)
    .replace(/\{\{telefone\}\}/gi, phone)
}

async function handleAppointmentConfirmation(
  contact: { jid: string; lid: string | null; tutorId: string | null; name: string | null; phone: string },
  reply: string,
  tenantId: string,
  instanceToken: string,
): Promise<void> {
  if (!contact.tutorId) return

  const now = new Date()
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  // Find the nearest reminded appointment in the next 48h
  const appt = await prisma.appointment.findFirst({
    where: {
      tutorId: contact.tutorId,
      tenantId,
      status: { in: ['agendado', 'confirmado'] },
      startsAt: { gte: now, lte: in48h },
      whatsappReminderSentAt: { not: null },
    },
    include: { patient: true },
    orderBy: { startsAt: 'asc' },
  })
  if (!appt) return

  const to = contact.lid || contact.jid
  if (reply === '1') {
    await prisma.appointment.update({ where: { id: appt.id }, data: { status: 'confirmado' } })
    const msg = `✅ Consulta de ${appt.patient?.name ?? 'seu pet'} confirmada! Até lá 🐾`
    await evo.sendTextMessage(instanceToken, to, msg).catch(() => {})
  } else {
    await prisma.appointment.update({ where: { id: appt.id }, data: { status: 'cancelado' } })
    const msg = `❌ Consulta de ${appt.patient?.name ?? 'seu pet'} cancelada. Entre em contato para reagendar.`
    await evo.sendTextMessage(instanceToken, to, msg).catch(() => {})
  }
}

async function triggerAutoReply(
  instance: { id: string; instanceToken: string | null; autoReplyEnabled: boolean; autoReplyOutOfHours: string | null; autoReplyGreeting: string | null },
  contact: { jid: string; lid: string | null; name: string | null; phone: string },
  messageText: string,
  tenantId: string,
  isFirstMessage: boolean,
): Promise<void> {
  if (!instance.instanceToken) return
  const to = contact.lid || contact.jid

  // 1. Greeting on first-ever message
  if (isFirstMessage && instance.autoReplyGreeting) {
    const msg = applyVars(instance.autoReplyGreeting, contact.name, contact.phone)
    await evo.sendTextMessage(instance.instanceToken, to, msg).catch(() => {})
    return
  }

  // 2. Out-of-hours auto-reply
  if (instance.autoReplyEnabled && instance.autoReplyOutOfHours) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { operatingHours: true } })
    if (tenant?.operatingHours && isOutsideOperatingHours(tenant.operatingHours)) {
      const msg = applyVars(instance.autoReplyOutOfHours, contact.name, contact.phone)
      await evo.sendTextMessage(instance.instanceToken, to, msg).catch(() => {})
      return
    }
  }

  // 3. Keyword triggers
  if (!messageText) return
  const triggers = await prisma.whatsAppAutoResponse.findMany({
    where: { tenantId, active: true },
    orderBy: { createdAt: 'asc' },
  })
  for (const t of triggers) {
    if (messageText.toLowerCase().includes(t.trigger.toLowerCase())) {
      const msg = applyVars(t.response, contact.name, contact.phone)
      await evo.sendTextMessage(instance.instanceToken, to, msg).catch(() => {})
      return
    }
  }
}

export async function whatsappRoutes(fastify: FastifyInstance) {
  // ──────────────────────────────────────────────────────────────────────────
  // WEBHOOK (public — no JWT, verified by secret token)
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post('/whatsapp/webhook', { bodyLimit: 10 * 1024 * 1024 }, async (request, reply) => {
    const { token, tenantId } = request.query as { token?: string; tenantId?: string }

    if (!token || token !== WEBHOOK_SECRET || !tenantId) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const instance = await prisma.whatsAppInstance.findFirst({
      where: { tenantId },
    })
    if (!instance) return reply.status(200).send({ ok: true })

    const body = request.body as Record<string, unknown>
    const event = body.event as string | undefined

    // Handle PairSuccess event (sent when WhatsApp is successfully connected)
    if (event === 'PairSuccess') {
      const data = body.data as { status?: string; jid?: string } | undefined
      const jid = data?.jid

      await prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: {
          status: 'connected',
          phoneNumber: jid ? phoneFromJid(jid) : undefined,
        },
      })

      // Request history sync to fetch past messages
      if (instance.instanceToken) {
        try {
          await evo.requestHistorySync(instance.instanceToken, 100)
        } catch (error) {
          console.error('[WhatsApp] Failed to request history sync:', error)
        }
      }
    }

    // Handle CONNECTION events
    if (event === 'connection.update' || event === 'CONNECTION_UPDATE') {
      const data = body.data as { state?: string; instance?: { profileName?: string; wuid?: string } } | undefined
      const state = data?.state
      const wuid = data?.instance?.wuid

      const wasNotConnected = instance.status !== 'connected'
      const isNowConnected = state === 'open'

      await prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: {
          status:
            state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected',
          phoneNumber: wuid ? phoneFromJid(wuid) : undefined,
        },
      })

      // Request history sync when transitioning to connected state
      if (isNowConnected && wasNotConnected && instance.instanceToken) {
        try {
          await evo.requestHistorySync(instance.instanceToken, 100)
        } catch (error) {
          console.error('[WhatsApp] Failed to request history sync:', error)
        }
      }
    }

    if (event === 'messages.upsert' || event === 'MESSAGES_UPSERT') {
      const messages = (body.data as { messages?: unknown[] } | undefined)?.messages ?? []

      for (const raw of messages) {
        const msg = raw as {
          key?: { id?: string; remoteJid?: string; fromMe?: boolean }
          message?: {
            conversation?: string
            extendedTextMessage?: { text: string }
            imageMessage?: { caption?: string; base64?: string; url?: string; mimetype?: string }
            videoMessage?: { caption?: string; base64?: string; url?: string; mimetype?: string }
            audioMessage?: { base64?: string; url?: string; mimetype?: string }
            documentMessage?: { caption?: string; base64?: string; url?: string; mimetype?: string }
          }
          messageType?: string
          messageTimestamp?: number
          pushName?: string
        }

        const rawJid = msg.key?.remoteJid
        const messageId = msg.key?.id
        if (!rawJid || !messageId || rawJid.endsWith('@g.us')) continue

        const phone = phoneFromJid(rawJid)
        // Normalize JID to avoid duplicate contacts when Evolution sends :xx suffix
        const jid = `${phone}@s.whatsapp.net`

        let body_text =
          msg.message?.conversation ??
          msg.message?.extendedTextMessage?.text ??
          msg.message?.imageMessage?.caption ??
          msg.message?.videoMessage?.caption ??
          msg.message?.documentMessage?.caption ??
          ''

        let mediaUrl = 
          msg.message?.imageMessage?.base64 ?? 
          msg.message?.imageMessage?.url ??
          msg.message?.videoMessage?.base64 ??
          msg.message?.videoMessage?.url ??
          msg.message?.audioMessage?.base64 ??
          msg.message?.audioMessage?.url ??
          msg.message?.documentMessage?.base64 ??
          msg.message?.documentMessage?.url ?? null

        let msgType = msg.messageType ?? 'text'
        if (msg.message?.imageMessage) msgType = 'image'
        else if (msg.message?.videoMessage) msgType = 'video'
        else if (msg.message?.audioMessage) msgType = 'audio'
        else if (msg.message?.documentMessage) msgType = 'document'
        
        // If Evolution provides base64 without data URI prefix, we can optionally prepend it in the frontend,
        // but Evolution API usually sends "data:image/jpeg;base64,..." if it provides base64.
        // Or if it's just raw base64, we can prepend it based on type.
        if (mediaUrl && !mediaUrl.startsWith('http') && !mediaUrl.startsWith('data:')) {
           const mime = msg.message?.imageMessage?.mimetype || msg.message?.videoMessage?.mimetype || msg.message?.audioMessage?.mimetype || 'application/octet-stream'
           mediaUrl = `data:${mime};base64,${mediaUrl}`
        }

        const ts = msg.messageTimestamp
          ? new Date(msg.messageTimestamp * 1000)
          : new Date()

        const contact = await prisma.whatsAppContact.upsert({
          where: { instanceId_jid: { instanceId: instance.id, jid } },
          update: {
            name: msg.pushName ?? undefined,
            lastMessageAt: ts,
          },
          create: {
            instanceId: instance.id,
            tenantId,
            jid,
            phone,
            name: msg.pushName ?? null,
            lastMessageAt: ts,
          },
        })

        const isFromMe = msg.key?.fromMe ?? false
        const savedMsg = await prisma.whatsAppMessage.upsert({
          where: { instanceId_messageId: { instanceId: instance.id, messageId } },
          update: {},
          create: {
            instanceId: instance.id,
            tenantId,
            contactId: contact.id,
            messageId,
            fromMe: isFromMe,
            body: body_text,
            type: msgType,
            mediaUrl: mediaUrl,
            timestamp: ts,
          },
        })

        // Auto-reply for new incoming messages
        if (!isFromMe && savedMsg.createdAt === savedMsg.timestamp) {
          const msgCount = await prisma.whatsAppMessage.count({ where: { contactId: contact.id } })
          triggerAutoReply(instance, contact, body_text, tenantId, msgCount === 1).catch(() => {})

          // Appointment confirmation: "1" = confirm, "2" = cancel
          const trimmed = body_text.trim()
          if ((trimmed === '1' || trimmed === '2') && instance.instanceToken) {
            handleAppointmentConfirmation(contact, trimmed, tenantId, instance.instanceToken).catch(() => {})
          }
        }
      }
    }

    if (event === 'messages.update') {
      const updates = (body.data as { updates?: unknown[] } | undefined)?.updates ?? []
      for (const raw of updates) {
        const upd = raw as { key?: { id?: string }; update?: { status?: number } }
        const messageId = upd.key?.id
        const statusCode = upd.update?.status
        if (!messageId) continue
        const statusMap: Record<number, string> = { 1: 'sent', 2: 'delivered', 3: 'read', 4: 'played' }
        const statusStr = statusCode ? statusMap[statusCode] : undefined
        if (statusStr) {
          await prisma.whatsAppMessage.updateMany({
            where: { instanceId: instance.id, messageId },
            data: { status: statusStr },
          })
        }
      }
    }

    // Handle CONTACTS_UPDATE event to save WhatsApp contacts
    if (event === 'CONTACTS_UPDATE') {
      const data = body.data as { contacts?: unknown[] } | undefined
      const contacts = data?.contacts ?? []

      for (const raw of contacts) {
        const contact = raw as {
          id?: string
          pushName?: string
        }
        const jid = contact.id
        if (!jid || jid.endsWith('@g.us')) continue // Skip groups

        const phone = phoneFromJid(jid)
        await prisma.whatsAppContact.upsert({
          where: { instanceId_jid: { instanceId: instance.id, jid } },
          update: {
            name: contact.pushName ?? undefined,
          },
          create: {
            instanceId: instance.id,
            tenantId,
            jid,
            phone,
            name: contact.pushName ?? null,
          },
        })
      }
    }

    // Handle HISTORY_SYNC event to save message history
    if (event === 'HistorySync') {
      const data = body.data as { messages?: unknown[] } | undefined
      const messages = data?.messages ?? []

      for (const raw of messages) {
        const msg = raw as {
          message?: {
            key?: { remoteJID?: string; fromMe?: boolean; ID?: string }
            message?: { conversation?: string; extendedTextMessage?: { text: string } }
            messageTimestamp?: number
            participant?: string
            pushName?: string
          }
        }
        
        if (!msg.message?.key) continue
        
        const jid = msg.message.key.remoteJID
        const messageId = msg.message.key.ID
        if (!jid || !messageId || jid.endsWith('@g.us')) continue // Skip groups

        const phone = phoneFromJid(jid)
        const body_text =
          msg.message.message?.conversation ??
          msg.message.message?.extendedTextMessage?.text ??
          ''
        const ts = msg.message.messageTimestamp
          ? new Date(msg.message.messageTimestamp * 1000)
          : new Date()

        const contact = await prisma.whatsAppContact.upsert({
          where: { instanceId_jid: { instanceId: instance.id, jid } },
          update: {
            name: msg.message.pushName ?? undefined,
            lastMessageAt: ts,
          },
          create: {
            instanceId: instance.id,
            tenantId,
            jid,
            phone,
            name: msg.message.pushName ?? null,
            lastMessageAt: ts,
          },
        })

        await prisma.whatsAppMessage.upsert({
          where: { instanceId_messageId: { instanceId: instance.id, messageId } },
          update: {},
          create: {
            instanceId: instance.id,
            tenantId,
            contactId: contact.id,
            messageId,
            fromMe: msg.message.key.fromMe ?? false,
            body: body_text,
            type: 'text',
            timestamp: ts,
          },
        })
      }
    }

    // Handle Message event (Evolution API v2 go format)
    if (event === 'Message') {
      const data = body.data as {
        Info?: {
          Chat?: string
          Sender?: string
          SenderAlt?: string
          RecipientAlt?: string
          IsFromMe?: boolean
          ID?: string
          Timestamp?: string
          PushName?: string
        }
        Message?: {
          conversation?: string
          extendedTextMessage?: { text: string }
          audioMessage?: {
            URL?: string
            seconds?: number
            PTT?: boolean
          }
        }
      } | undefined

      const info = data?.Info
      const messageContent = data?.Message
      
      if (!info || !messageContent) return reply.status(200).send({ ok: true })

      const jid = info.IsFromMe ? info.RecipientAlt : info.SenderAlt
      const lid = info.Chat
      if (!jid) return reply.status(200).send({ ok: true })

      const messageId = info.ID
      if (!messageId) return reply.status(200).send({ ok: true })

      if (jid.endsWith('@g.us')) return reply.status(200).send({ ok: true })

      const phone = phoneFromJid(jid)
      const body_text = messageContent.conversation ?? messageContent.extendedTextMessage?.text ?? ''
      const ts = info.Timestamp ? new Date(info.Timestamp) : new Date()

      // Check for audio message
      const audioMessage = messageContent.audioMessage
      const isAudio = !!audioMessage
      const audioUrl = audioMessage?.URL
      const audioDuration = audioMessage?.seconds

      // Try to find existing contact by JID, phone, or LID
      let contact = await prisma.whatsAppContact.findFirst({
        where: {
          instanceId: instance.id,
          tenantId,
          OR: [
            { jid },
            { phone },
            ...(lid ? [{ lid }] : []),
          ],
        },
      })

      if (!contact) {
        contact = await prisma.whatsAppContact.create({
          data: {
            instanceId: instance.id,
            tenantId,
            jid,
            lid,
            phone,
            name: info.PushName ?? null,
            lastMessageAt: ts,
          },
        })
      } else {
        contact = await prisma.whatsAppContact.update({
          where: { id: contact.id },
          data: {
            name: info.PushName ?? undefined,
            lid: lid ?? undefined,
            lastMessageAt: ts,
          },
        })
      }

      const isFromMe = info.IsFromMe ?? false
      const savedMsg = await prisma.whatsAppMessage.upsert({
        where: { instanceId_messageId: { instanceId: instance.id, messageId } },
        update: {},
        create: {
          instanceId: instance.id,
          tenantId,
          contactId: contact.id,
          messageId,
          fromMe: isFromMe,
          body: isAudio ? '🎤 Áudio' : body_text,
          type: isAudio ? 'audio' : 'text',
          mediaUrl: audioUrl,
          audioDuration: audioDuration,
          timestamp: ts,
        },
      })

      if (!isFromMe && savedMsg.createdAt === savedMsg.timestamp) {
        const msgCount = await prisma.whatsAppMessage.count({ where: { contactId: contact.id } })
        triggerAutoReply(instance, contact, body_text, tenantId, msgCount === 1).catch(() => {})
      }
    }

    return reply.status(200).send({ ok: true })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // INSTANCE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  fastify.get('/whatsapp/instance', { onRequest: view }, async (request) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const instance = await prisma.whatsAppInstance.findUnique({ where: { tenantId } })
    return instance ?? null
  })

  fastify.post('/whatsapp/instance/connect', { onRequest: manage }, async (request, reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user

    const existing = await prisma.whatsAppInstance.findUnique({ where: { tenantId } })
    if (existing && existing.status === 'connected') {
      return reply.status(400).send({ error: 'Instância já conectada' })
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } })
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' })

    const instanceName = `pupify-${tenant.slug}`

    const instance = await prisma.whatsAppInstance.upsert({
      where: { tenantId },
      update: { instanceName, status: 'connecting' },
      create: { tenantId, instanceName, status: 'connecting' },
    })

    try {
      const { instanceId, instanceToken } = await evo.createInstance(instanceName, webhookUrl(tenantId))
      await prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: { instanceId, instanceToken },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (!msg.includes('already exists') && !msg.includes('já existe')) {
        await prisma.whatsAppInstance.update({
          where: { id: instance.id },
          data: { status: 'disconnected' },
        })
        return reply.status(502).send({ error: 'Falha ao criar instância na Evolution API', detail: msg })
      }
    }

    return instance
  })

  fastify.get('/whatsapp/instance/qr', { onRequest: manage }, async (request, reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const instance = await prisma.whatsAppInstance.findUnique({ where: { tenantId } })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })
    if (instance.status === 'connected') return reply.status(400).send({ error: 'Já conectado' })
    if (!instance.instanceToken) return reply.status(400).send({ error: 'Instância não inicializada, tente conectar novamente' })

    const qr = await evo.getQRCode(instance.instanceToken, instance.instanceName, webhookUrl(tenantId))
    if (!qr) return reply.status(404).send({ error: 'QR code não disponível ainda, tente novamente' })

    if ('connected' in qr && qr.connected) {
      // The session is already logged in, update DB
      await prisma.whatsAppInstance.update({
        where: { id: instance.id },
        data: { status: 'connected' },
      })
      return reply.status(400).send({ error: 'Já conectado' })
    }

    return qr
  })

  fastify.delete('/whatsapp/instance', { onRequest: manage }, async (request, reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const instance = await prisma.whatsAppInstance.findUnique({ where: { tenantId } })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })

    try {
      await evo.disconnectInstance(instance.instanceName)
      await evo.deleteInstance(instance.instanceName)
    } catch {
      // best-effort — delete from DB anyway
    }

    await prisma.whatsAppInstance.delete({ where: { id: instance.id } })
    return reply.status(204).send()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // CONVERSATIONS
  // ──────────────────────────────────────────────────────────────────────────

  fastify.post('/whatsapp/instance/sync-contacts', { onRequest: manage }, async (request, reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    
    const instance = await prisma.whatsAppInstance.findUnique({ where: { tenantId } })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })
    if (instance.status !== 'connected') return reply.status(400).send({ error: 'Instância não conectada' })

    try {
      if (!instance.instanceToken) throw new Error('Missing token')
      const contacts = await evo.fetchContacts(instance.instanceToken)

      let savedCount = 0

      for (const contact of contacts) {
        const jid = contact.id
        if (!jid) continue

        const lid = jid.includes('@lid') ? jid : null
        if (jid.endsWith('@g.us')) continue // Skip groups

        const phone = phoneFromJid(jid)
        await prisma.whatsAppContact.upsert({
          where: { instanceId_jid: { instanceId: instance.id, jid } },
          update: { 
            name: contact.pushName ?? undefined,
            lid,
          },
          create: {
            instanceId: instance.id,
            tenantId,
            jid,
            lid,
            phone,
            name: contact.pushName ?? null,
            lastMessageAt: null, // Don't set lastMessageAt to avoid creating conversations
          },
        })
        savedCount++
      }

      return { savedCount }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return reply.status(500).send({ error: 'Erro ao buscar contatos', detail: msg })
    }
  })

  const startConversationSchema = z.object({
    phone: z.string().min(8),
    name: z.string().optional(),
  })

  fastify.post('/whatsapp/conversations/start', { onRequest: manage }, async (request, reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = startConversationSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const instance = await prisma.whatsAppInstance.findUnique({ where: { tenantId } })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })

    const cleanPhone = parsed.data.phone.replace(/\D/g, '')
    if (!cleanPhone) return reply.status(400).send({ error: 'Número de telefone inválido' })

    const jid = `${cleanPhone}@s.whatsapp.net`

    const contact = await prisma.whatsAppContact.upsert({
      where: { instanceId_jid: { instanceId: instance.id, jid } },
      update: {
        name: parsed.data.name ?? undefined,
      },
      create: {
        instanceId: instance.id,
        tenantId,
        jid,
        phone: cleanPhone,
        name: parsed.data.name ?? null,
        lastMessageAt: new Date(),
      },
    })

    return contact
  })

  fastify.get('/whatsapp/conversations', { onRequest: view }, async (request) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const { archived, tutorId, patientId, dateFrom, dateTo, labelId } = request.query as {
      archived?: string
      tutorId?: string
      patientId?: string
      dateFrom?: string
      dateTo?: string
      labelId?: string
    }

    const showArchived = archived === 'true'

    const contacts = await prisma.whatsAppContact.findMany({
      where: {
        tenantId,
        lastMessageAt: { not: null },
        archived: showArchived,
        ...(tutorId ? { tutorId } : {}),
        ...(patientId ? { patientId } : {}),
        ...((dateFrom || dateTo) ? {
          lastMessageAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        } : {}),
        ...(labelId ? { labels: { some: { id: labelId } } } : {}),
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        patient: { select: { id: true, name: true, species: true } },
        tutor: { select: { id: true, name: true } },
        labels: { select: { id: true, name: true, color: true } },
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    })

    const unreadCounts = await prisma.whatsAppMessage.groupBy({
      by: ['contactId'],
      where: {
        tenantId,
        fromMe: false,
        status: 'received',
        contactId: { in: contacts.map((c) => c.id) },
      },
      _count: { id: true },
    })
    const unreadMap = Object.fromEntries(unreadCounts.map((r) => [r.contactId, r._count.id]))

    return contacts.map((c) => ({ ...c, unreadCount: unreadMap[c.id] ?? 0 }))
  })

  fastify.put('/whatsapp/conversations/:contactId/read', { onRequest: view }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) return reply.status(404).send({ error: 'Conversa não encontrada' })

    await prisma.whatsAppMessage.updateMany({
      where: { contactId, fromMe: false, status: 'received' },
      data: { status: 'read' },
    })

    return { ok: true }
  })

  fastify.get('/whatsapp/conversations/:contactId/messages', { onRequest: view }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const { cursor, limit } = request.query as { cursor?: string; limit?: string }

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) {
      return reply.status(404).send({ error: 'Conversa não encontrada' })
    }

    const take = Math.min(Number(limit ?? 50), 100)
    const messages = await prisma.whatsAppMessage.findMany({
      where: {
        contactId,
        ...(cursor ? { timestamp: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take,
    })

    const nextCursor =
      messages.length === take ? messages[messages.length - 1].timestamp.toISOString() : null

    return { messages: messages.reverse(), nextCursor }
  })

  const sendSchema = z.object({ text: z.string().min(1) })

  fastify.post('/whatsapp/conversations/:contactId/send', { onRequest: send }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = sendSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) {
      return reply.status(404).send({ error: 'Contato não encontrado' })
    }

    const instance = await prisma.whatsAppInstance.findUnique({ where: { tenantId } })
    if (!instance || instance.status !== 'connected') {
      return reply.status(400).send({ error: 'WhatsApp não conectado' })
    }

    if (!instance.instanceToken) return reply.status(400).send({ error: 'Instância não inicializada (token ausente)' })
    const result = await evo.sendTextMessage(instance.instanceToken, contact.lid || contact.jid, parsed.data.text)

    const now = new Date()
    const messageId = result?.key?.id || `manual-${Date.now()}`
    
    await prisma.whatsAppMessage.create({
      data: {
        instanceId: instance.id,
        tenantId,
        contactId: contact.id,
        messageId,
        fromMe: true,
        body: parsed.data.text,
        type: 'text',
        status: 'sent',
        timestamp: now,
      },
    })
    await prisma.whatsAppContact.update({
      where: { id: contact.id },
      data: { lastMessageAt: now },
    })
    
    return { ok: true, messageId }
  })

  fastify.post('/whatsapp/conversations/:contactId/send-media', { onRequest: send }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) return reply.status(404).send({ error: 'Contato não encontrado' })

    const instance = await prisma.whatsAppInstance.findUnique({ where: { tenantId } })
    if (!instance || instance.status !== 'connected') return reply.status(400).send({ error: 'WhatsApp não conectado' })
    if (!instance.instanceToken) return reply.status(400).send({ error: 'Instância não inicializada' })

    let fileBuffer: Buffer | undefined
    let fileMimetype: string | undefined
    let fileName: string | undefined
    let caption: string | undefined

    const parts = request.parts({ limits: { fileSize: 16 * 1024 * 1024 } })
    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer()
        fileMimetype = part.mimetype
        fileName = part.filename
      } else if (part.fieldname === 'caption') {
        caption = String(part.value ?? '')
      }
    }

    if (!fileBuffer || !fileMimetype) return reply.status(400).send({ error: 'Nenhum arquivo enviado' })

    let mediatype: 'image' | 'document' | 'video' | 'audio' = 'document'
    if (fileMimetype.startsWith('image/')) mediatype = 'image'
    else if (fileMimetype.startsWith('video/')) mediatype = 'video'
    else if (fileMimetype.startsWith('audio/')) mediatype = 'audio'

    const base64 = fileBuffer.toString('base64')
    const recipient = contact.jid // Use jid instead of lid for media sending
    
    request.log.info({ 
      contactId, 
      recipient, 
      recipientLid: contact.lid,
      recipientJid: contact.jid,
      mediatype, 
      fileMimetype, 
      fileName, 
      caption,
      base64Length: base64.length 
    }, 'Sending WhatsApp media')
    
    let result: { key: { id: string } } | undefined
    try {
      result = await evo.sendMediaMessage(
        instance.instanceToken,
        recipient,
        mediatype,
        fileMimetype,
        base64,
        caption || undefined,
        fileName,
      )
      request.log.info({ result }, 'Media sent successfully')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      request.log.error({ error: err }, 'Failed to send media')
      return reply.status(502).send({ error: 'Falha ao enviar mídia', detail: msg })
    }

    const now = new Date()
    const messageId = result?.key?.id || `manual-media-${Date.now()}`

    await prisma.whatsAppMessage.create({
      data: {
        instanceId: instance.id,
        tenantId,
        contactId: contact.id,
        messageId,
        fromMe: true,
        body: caption || (fileName ?? ''),
        type: mediatype,
        // Store base64 data URI for images so they appear inline; others store null
        mediaUrl: mediatype === 'image' ? `data:${fileMimetype};base64,${base64}` : null,
        status: 'sent',
        timestamp: now,
      },
    })

    await prisma.whatsAppContact.update({
      where: { id: contact.id },
      data: { lastMessageAt: now },
    })

    return { ok: true, messageId, mediatype, fileName }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // CONTACTS / PATIENT MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  const linkTutorSchema = z.object({ tutorId: z.string() })

  fastify.post('/whatsapp/contacts/:contactId/link-tutor', { onRequest: manage }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = linkTutorSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) {
      return reply.status(404).send({ error: 'Contato não encontrado' })
    }

    const updated = await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { tutorId: parsed.data.tutorId },
      include: { tutor: true, patient: true },
    })
    return updated
  })

  const createPatientSchema = z.object({
    tutor: z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string(),
      cpf: z.string().optional(),
      address: z.string().optional(),
    }),
    patient: z.object({
      name: z.string().min(1),
      species: z.enum(['Cao', 'Gato', 'Ave', 'Roedor', 'Reptil', 'Outro']),
      breed: z.string(),
      sex: z.enum(['M', 'F']),
      birthDate: z.string(),
      weightKg: z.number().positive(),
      color: z.string().optional(),
      neutered: z.boolean().default(false),
      allergies: z.array(z.string()).default([]),
      chronicConditions: z.array(z.string()).default([]),
    }),
  })

  fastify.post('/whatsapp/contacts/:contactId/create-patient', { onRequest: manage }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = createPatientSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) {
      return reply.status(404).send({ error: 'Contato não encontrado' })
    }

    const { tutor: tutorData, patient: patientData } = parsed.data

    const { tutor, patient } = await prisma.$transaction(async (tx) => {
      const tutor = await tx.tutor.create({
        data: {
          name: tutorData.name,
          email: tutorData.email ?? null,
          phone: tutorData.phone,
          cpf: tutorData.cpf ?? null,
          address: tutorData.address ?? null,
        },
      })

      const patient = await tx.patient.create({
        data: {
          name: patientData.name,
          species: patientData.species,
          breed: patientData.breed,
          sex: patientData.sex,
          birthDate: new Date(patientData.birthDate),
          weightKg: patientData.weightKg,
          color: patientData.color ?? null,
          neutered: patientData.neutered,
          allergies: patientData.allergies,
          chronicConditions: patientData.chronicConditions,
          tutorId: tutor.id,
          tenantId,
        },
      })

      await tx.whatsAppContact.update({
        where: { id: contactId },
        data: { tutorId: tutor.id, patientId: patient.id },
      })

      return { tutor, patient }
    })

    return { tutor, patient }
  })

  const appointmentSchema = z.object({
    patientId: z.string(),
    tutorId: z.string(),
    veterinarianId: z.string(),
    type: z.enum(['consulta', 'retorno', 'vacina', 'cirurgia', 'exame', 'banho_tosa', 'emergencia']),
    status: z.enum(['agendado', 'confirmado', 'em_atendimento', 'concluido', 'cancelado', 'falta']).default('agendado'),
    startsAt: z.string(),
    endsAt: z.string(),
    notes: z.string().optional(),
    room: z.string().optional(),
  })

  fastify.post('/whatsapp/contacts/:contactId/appointment', { onRequest: manage }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = appointmentSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) {
      return reply.status(404).send({ error: 'Contato não encontrado' })
    }

    const { patientId, tutorId, veterinarianId, type, status, notes, room } = parsed.data
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        tutorId,
        veterinarianId,
        type,
        status,
        notes: notes ?? null,
        room: room ?? null,
        tenantId,
        startsAt: new Date(parsed.data.startsAt),
        endsAt: new Date(parsed.data.endsAt),
      },
      include: { patient: true, tutor: true, veterinarian: true },
    })

    return appointment
  })

  // ──────────────────────────────────────────────────────────────────────────
  // ARCHIVE, NOTES, LABELS
  // ──────────────────────────────────────────────────────────────────────────

  fastify.put('/whatsapp/contacts/:contactId/archive', { onRequest: manage }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) return reply.status(404).send({ error: 'Contato não encontrado' })

    const updated = await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { archived: !contact.archived },
    })
    return { archived: updated.archived }
  })

  const patchContactSchema = z.object({
    internalNotes: z.string().nullable().optional(),
  })

  fastify.patch('/whatsapp/contacts/:contactId', { onRequest: manage }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = patchContactSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) return reply.status(404).send({ error: 'Contato não encontrado' })

    const updated = await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { internalNotes: parsed.data.internalNotes ?? undefined },
    })
    return updated
  })

  // Labels CRUD
  const labelSchema = z.object({ name: z.string().min(1).max(40), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() })

  fastify.get('/whatsapp/labels', { onRequest: view }, async (request) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    return prisma.whatsAppLabel.findMany({ where: { tenantId }, orderBy: { name: 'asc' } })
  })

  fastify.post('/whatsapp/labels', { onRequest: manage }, async (request, reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = labelSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      return await prisma.whatsAppLabel.create({
        data: { tenantId, name: parsed.data.name, color: parsed.data.color ?? '#6B7280' },
      })
    } catch {
      return reply.status(409).send({ error: 'Já existe uma etiqueta com este nome' })
    }
  })

  fastify.put('/whatsapp/labels/:labelId', { onRequest: manage }, async (request, reply) => {
    const { labelId } = request.params as { labelId: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = labelSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const label = await prisma.whatsAppLabel.findUnique({ where: { id: labelId } })
    if (!label || label.tenantId !== tenantId) return reply.status(404).send({ error: 'Etiqueta não encontrada' })

    return prisma.whatsAppLabel.update({
      where: { id: labelId },
      data: { name: parsed.data.name, color: parsed.data.color ?? label.color },
    })
  })

  fastify.delete('/whatsapp/labels/:labelId', { onRequest: manage }, async (request, reply) => {
    const { labelId } = request.params as { labelId: string }
    const { tenantId } = (request as AuthenticatedRequest).user

    const label = await prisma.whatsAppLabel.findUnique({ where: { id: labelId } })
    if (!label || label.tenantId !== tenantId) return reply.status(404).send({ error: 'Etiqueta não encontrada' })

    await prisma.whatsAppLabel.delete({ where: { id: labelId } })
    return reply.status(204).send()
  })

  const setLabelsSchema = z.object({ labelIds: z.array(z.string()) })

  fastify.put('/whatsapp/contacts/:contactId/labels', { onRequest: manage }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = setLabelsSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) return reply.status(404).send({ error: 'Contato não encontrado' })

    const updated = await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { labels: { set: parsed.data.labelIds.map((id) => ({ id })) } },
      include: { labels: true },
    })
    return updated.labels
  })

  // ──────────────────────────────────────────────────────────────────────────
  // AUTOMATION SETTINGS, QUICK REPLIES, AUTO-RESPONSES
  // ──────────────────────────────────────────────────────────────────────────

  const automationSettingsSchema = z.object({
    autoReplyEnabled:    z.boolean().optional(),
    autoReplyOutOfHours: z.string().nullable().optional(),
    autoReplyGreeting:   z.string().nullable().optional(),
  })

  fastify.put('/whatsapp/instance/settings', { onRequest: manage }, async (request, reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = automationSettingsSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const instance = await prisma.whatsAppInstance.findUnique({ where: { tenantId } })
    if (!instance) return reply.status(404).send({ error: 'Instância não encontrada' })

    const updated = await prisma.whatsAppInstance.update({
      where: { tenantId },
      data: {
        autoReplyEnabled:    parsed.data.autoReplyEnabled ?? undefined,
        autoReplyOutOfHours: parsed.data.autoReplyOutOfHours,
        autoReplyGreeting:   parsed.data.autoReplyGreeting,
      },
    })
    return updated
  })

  // Quick Replies CRUD
  const quickReplySchema = z.object({
    shortcut: z.string().min(1).max(30).regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e _'),
    content:  z.string().min(1),
  })

  fastify.get('/whatsapp/quick-replies', { onRequest: view }, async (request) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    return prisma.whatsAppQuickReply.findMany({ where: { tenantId }, orderBy: { shortcut: 'asc' } })
  })

  fastify.post('/whatsapp/quick-replies', { onRequest: manage }, async (request, reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = quickReplySchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    try {
      return await prisma.whatsAppQuickReply.create({ data: { tenantId, ...parsed.data } })
    } catch {
      return reply.status(409).send({ error: 'Já existe uma resposta rápida com este atalho' })
    }
  })

  fastify.put('/whatsapp/quick-replies/:id', { onRequest: manage }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = quickReplySchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const item = await prisma.whatsAppQuickReply.findUnique({ where: { id } })
    if (!item || item.tenantId !== tenantId) return reply.status(404).send({ error: 'Não encontrado' })
    return prisma.whatsAppQuickReply.update({ where: { id }, data: parsed.data })
  })

  fastify.delete('/whatsapp/quick-replies/:id', { onRequest: manage }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const item = await prisma.whatsAppQuickReply.findUnique({ where: { id } })
    if (!item || item.tenantId !== tenantId) return reply.status(404).send({ error: 'Não encontrado' })
    await prisma.whatsAppQuickReply.delete({ where: { id } })
    return reply.status(204).send()
  })

  // Auto-responses CRUD
  const autoResponseSchema = z.object({
    trigger:  z.string().min(1).max(60),
    response: z.string().min(1),
    active:   z.boolean().optional(),
  })

  fastify.get('/whatsapp/auto-responses', { onRequest: view }, async (request) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    return prisma.whatsAppAutoResponse.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } })
  })

  fastify.post('/whatsapp/auto-responses', { onRequest: manage }, async (request, reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = autoResponseSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })
    return prisma.whatsAppAutoResponse.create({ data: { tenantId, ...parsed.data } })
  })

  fastify.put('/whatsapp/auto-responses/:id', { onRequest: manage }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = autoResponseSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const item = await prisma.whatsAppAutoResponse.findUnique({ where: { id } })
    if (!item || item.tenantId !== tenantId) return reply.status(404).send({ error: 'Não encontrado' })
    return prisma.whatsAppAutoResponse.update({ where: { id }, data: parsed.data })
  })

  fastify.delete('/whatsapp/auto-responses/:id', { onRequest: manage }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const item = await prisma.whatsAppAutoResponse.findUnique({ where: { id } })
    if (!item || item.tenantId !== tenantId) return reply.status(404).send({ error: 'Não encontrado' })
    await prisma.whatsAppAutoResponse.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // ASSIGNMENT
  // ──────────────────────────────────────────────────────────────────────────

  fastify.get('/whatsapp/team', { onRequest: view }, async (request) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const members = await prisma.userTenant.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, avatarUrl: true, active: true } } },
      orderBy: { user: { name: 'asc' } },
    })
    return members
      .filter((m) => m.user.active)
      .map((m) => ({ id: m.user.id, name: m.user.name, avatarUrl: m.user.avatarUrl, role: m.role }))
  })

  const assignSchema = z.object({ userId: z.string().nullable() })

  fastify.put('/whatsapp/contacts/:contactId/assign', { onRequest: manage }, async (request, reply) => {
    const { contactId } = request.params as { contactId: string }
    const { tenantId } = (request as AuthenticatedRequest).user
    const parsed = assignSchema.safeParse(request.body)
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() })

    const contact = await prisma.whatsAppContact.findUnique({ where: { id: contactId } })
    if (!contact || contact.tenantId !== tenantId) return reply.status(404).send({ error: 'Contato não encontrado' })

    if (parsed.data.userId) {
      const membership = await prisma.userTenant.findFirst({ where: { userId: parsed.data.userId, tenantId } })
      if (!membership) return reply.status(400).send({ error: 'Usuário não pertence a esta clínica' })
    }

    const updated = await prisma.whatsAppContact.update({
      where: { id: contactId },
      data: { assignedToId: parsed.data.userId },
      include: { assignedTo: { select: { id: true, name: true, avatarUrl: true } } },
    })
    return updated
  })

  // List all contacts (for search/link modal)
  fastify.get('/whatsapp/contacts', { onRequest: view }, async (request) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const { q } = request.query as { q?: string }
    const contacts = await prisma.whatsAppContact.findMany({
      where: {
        tenantId,
        ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phone: { contains: q } }] } : {}),
      },
      include: {
        patient: { select: { id: true, name: true, species: true } },
        tutor: { select: { id: true, name: true } },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    })
    return contacts
  })

  // ──────────────────────────────────────────────────────────────────────────
  // ANALYTICS
  // ──────────────────────────────────────────────────────────────────────────

  fastify.get('/whatsapp/analytics', { onRequest: view }, async (request) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000)

    const [totalConversations, activeConversations, sentCount, receivedCount, byType, rawMsgs] =
      await Promise.all([
        prisma.whatsAppContact.count({ where: { tenantId, lastMessageAt: { not: null } } }),
        prisma.whatsAppContact.count({ where: { tenantId, lastMessageAt: { gte: sevenDaysAgo } } }),
        prisma.whatsAppMessage.count({ where: { tenantId, fromMe: true,  createdAt: { gte: thirtyDaysAgo } } }),
        prisma.whatsAppMessage.count({ where: { tenantId, fromMe: false, createdAt: { gte: thirtyDaysAgo } } }),
        prisma.whatsAppMessage.groupBy({
          by: ['type'],
          where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
          _count: { id: true },
        }),
        prisma.whatsAppMessage.findMany({
          where: { tenantId, createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
      ])

    // Group messages by ISO date (YYYY-MM-DD) in local Sao_Paulo time
    const dayMap: Record<string, number> = {}
    for (const m of rawMsgs) {
      const day = m.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      // Convert pt-BR dd/mm/yyyy → yyyy-mm-dd for consistent sorting
      const [d, mo, y] = day.split('/')
      const iso = `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
      dayMap[iso] = (dayMap[iso] ?? 0) + 1
    }

    const messagesPerDay = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000)
      const iso = d.toISOString().slice(0, 10)
      return { date: iso, count: dayMap[iso] ?? 0 }
    })

    return {
      totalConversations,
      activeConversations,
      sentCount,
      receivedCount,
      messagesByType: byType.map((r) => ({ type: r.type, count: r._count.id })),
      messagesPerDay,
    }
  })
}
