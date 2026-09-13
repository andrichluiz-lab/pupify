import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../lib/jwt-middleware.js'
import type { AuthenticatedRequest } from '../types/fastify.js'

export async function notificationsRoutes(fastify: FastifyInstance) {
  // List notifications for the authenticated user
  fastify.get('/notifications', {
    onRequest: [authenticate]
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user

    const notifications = await prisma.notification.findMany({
      where: {
        userId: user.userId,
        tenantId: user.tenantId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return notifications
  })

  // Mark a single notification as read
  fastify.put('/notifications/:id/read', {
    onRequest: [authenticate]
  }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = (request as AuthenticatedRequest).user

    const notification = await prisma.notification.findUnique({ where: { id } })

    if (!notification || notification.userId !== user.userId) {
      return reply.status(404).send({ error: 'Notification not found' })
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    })

    return { ok: true }
  })

  // Mark all notifications as read
  fastify.put('/notifications/read-all', {
    onRequest: [authenticate]
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user

    await prisma.notification.updateMany({
      where: { userId: user.userId, tenantId: user.tenantId, read: false },
      data: { read: true },
    })

    return { ok: true }
  })
}

// ============================================================================
// Helper: create a notification for a veterinarian
// Looks up the user linked to the vet's name in the same tenant
// ============================================================================

export async function createAppointmentNotification(opts: {
  veterinarianId: string
  tenantId: string
  title: string
  message: string
  link?: string
}) {
  try {
    const vet = await prisma.veterinarian.findUnique({
      where: { id: opts.veterinarianId },
    })

    if (!vet) return

    // Find the user in this tenant whose name matches the vet name and has role VETERINARIAN
    const userTenant = await prisma.userTenant.findFirst({
      where: {
        tenantId: opts.tenantId,
        role: 'VETERINARIAN',
        user: { name: vet.name },
      },
      include: { user: true },
    })

    if (!userTenant) return

    await prisma.notification.create({
      data: {
        userId: userTenant.userId,
        tenantId: opts.tenantId,
        type: 'appointment_assigned',
        title: opts.title,
        message: opts.message,
        link: opts.link ?? '/agenda',
        read: false,
      },
    })
  } catch (error) {
    // Non-critical — log but don't break the main flow
    console.error('[Notifications] Failed to create notification:', error)
  }
}
