import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import { hashPassword } from '../lib/auth.js'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../types/fastify.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.team_view)]
const create = [authenticate, verifyPermVersion, requirePermission(Permission.team_create)]
const edit = [authenticate, verifyPermVersion, requirePermission(Permission.team_edit)]

const timeEntrySchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  notes: z.string().optional(),
})

const leaveRequestSchema = z.object({
  userId: z.string(),
  tenantId: z.string(),
  type: z.enum(['ferias', 'licenca_medica', 'licenca_maternidade', 'outro']),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional(),
})

const shiftSchema = z.object({
  tenantId: z.string(),
  name: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
  daysOfWeek: z.array(z.number()),
})

const shiftAssignmentSchema = z.object({
  shiftId: z.string(),
  userId: z.string(),
  tenantId: z.string(),
  date: z.string(),
})

const createMemberSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['CLINIC_ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'TECHNICIAN']),
  crmv: z.string().optional(),
  specialty: z.string().optional(),
  avatarUrl: z.string().optional(),
})

const approveLeaveSchema = z.object({
  approvedBy: z.string(),
})

export async function teamRoutes(fastify: FastifyInstance) {
  // Get team stats
  fastify.get('/team/stats', {
    onRequest: view
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get total team members (users with tenant roles)
    const totalMembers = await prisma.userTenant.count({
      where: {
        tenantId: user.tenantId,
        role: {
          in: ['CLINIC_ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'TECHNICIAN']
        }
      }
    })

    // Get present today (checked in)
    const presentToday = await prisma.timeEntry.count({
      where: {
        tenantId: user.tenantId,
        date: {
          gte: today,
          lt: tomorrow
        }
      }
    })

    // Get on leave today
    const onLeave = await prisma.leaveRequest.count({
      where: {
        tenantId: user.tenantId,
        status: 'aprovado',
        startDate: {
          lte: tomorrow
        },
        endDate: {
          gte: today
        }
      }
    })

    // Get on vacation
    const onVacation = await prisma.leaveRequest.count({
      where: {
        tenantId: user.tenantId,
        status: 'aprovado',
        type: 'ferias',
        startDate: {
          lte: tomorrow
        },
        endDate: {
          gte: today
        }
      }
    })

    return {
      totalMembers,
      presentToday,
      onLeave,
      onVacation
    }
  })

  // Get team members
  fastify.get('/team/members', {
    onRequest: view
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const userTenants = await prisma.userTenant.findMany({
      where: {
        tenantId: user.tenantId,
        role: {
          in: ['CLINIC_ADMIN', 'VETERINARIAN', 'RECEPTIONIST', 'TECHNICIAN']
        }
      },
      include: {
        user: true,
        tenant: true
      },
      orderBy: {
        user: {
          name: 'asc'
        }
      }
    })

    // Get today's status for each member
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const members = await Promise.all(
      userTenants.map(async (ut: { 
        id: string; 
        userId: string; 
        tenantId: string; 
        role: string; 
        createdAt: Date; 
        updatedAt: Date;
        user: {
          id: string;
          email: string;
          name: string;
          avatarUrl: string | null;
        };
      }) => {
        // Check if has time entry today
        const timeEntry = await prisma.timeEntry.findFirst({
          where: {
            userId: ut.userId,
            tenantId: user.tenantId,
            date: {
              gte: today,
              lt: tomorrow
            }
          }
        })

        // Check if on leave
        const leaveRequest = await prisma.leaveRequest.findFirst({
          where: {
            userId: ut.userId,
            tenantId: user.tenantId,
            status: 'aprovado',
            startDate: {
              lte: tomorrow
            },
            endDate: {
              gte: today
            }
          }
        })

        let status = 'folga'
        if (timeEntry && timeEntry.checkIn && !timeEntry.checkOut) {
          status = 'presente'
        } else if (timeEntry && timeEntry.checkOut) {
          status = 'presente'
        } else if (leaveRequest) {
          status = leaveRequest.type === 'ferias' ? 'ferias' : 'folga'
        }

        // Get veterinarian info if applicable
        let veterinarian = null
        if (ut.role === 'VETERINARIAN') {
          veterinarian = await prisma.veterinarian.findFirst({
            where: {
              tenantId: user.tenantId,
              // Assuming there's a relation or we need to match by name
              // For now, we'll skip this or add a relation later
            }
          })
        }

        return {
          id: ut.id,
          userId: ut.userId,
          name: ut.user.name,
          email: ut.user.email,
          role: ut.role,
          avatarUrl: ut.user.avatarUrl,
          status,
          specialty: veterinarian?.specialty,
          crmv: veterinarian?.crmv
        }
      })
    )

    return members
  })

  // Get upcoming shifts
  fastify.get('/team/shifts', {
    onRequest: view
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)

    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        tenantId: user.tenantId,
        date: {
          gte: today,
          lte: nextWeek
        }
      },
      include: {
        shift: true
      },
      orderBy: {
        date: 'asc'
      },
      take: 10
    })

    const result = await Promise.all(
      assignments.map(async (assignment: { 
        id: string; 
        userId: string; 
        date: Date; 
        shift: { 
          id: string; 
          name: string; 
          startTime: string; 
          endTime: string 
        } 
      }) => {
        const userRecord = await prisma.user.findUnique({
          where: { id: assignment.userId }
        })

        return {
          id: assignment.id,
          member: userRecord?.name || 'Unknown',
          date: assignment.date.toISOString().split('T')[0],
          shift: `${assignment.shift.name} (${assignment.shift.startTime} - ${assignment.shift.endTime})`,
          role: assignment.shift.name
        }
      })
    )

    return result
  })

  // Create time entry (check-in)
  // Time-entry endpoints stay auth-only — every team member should be able to clock in/out
  fastify.post('/team/time-entry', {
    onRequest: [authenticate, verifyPermVersion]
  }, async (request, reply) => {
    try {
      const data = timeEntrySchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      const timeEntry = await prisma.timeEntry.create({
        data: {
          userId: data.userId,
          tenantId: user.tenantId,
          date: new Date(),
          checkIn: new Date(),
          notes: data.notes
        }
      })
      return reply.status(201).send(timeEntry)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }
  })

  // Update time entry (check-out)
  fastify.put('/team/time-entry/:id', {
    onRequest: [authenticate, verifyPermVersion]
  }, async (request) => {
    const { id } = request.params as { id: string }
    const timeEntry = await prisma.timeEntry.update({
      where: { id },
      data: {
        checkOut: new Date()
      }
    })
    return timeEntry
  })

  // Create leave request
  fastify.post('/team/leave-request', {
    onRequest: [authenticate, verifyPermVersion]
  }, async (request, reply) => {
    try {
      const data = leaveRequestSchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      const leaveRequest = await prisma.leaveRequest.create({
        data: {
          userId: data.userId,
          tenantId: user.tenantId,
          type: data.type,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          reason: data.reason
        }
      })
      return reply.status(201).send(leaveRequest)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }
  })

  // Approve leave request
  fastify.put('/team/leave-request/:id/approve', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const data = approveLeaveSchema.parse(request.body)

      const leaveRequest = await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: 'aprovado',
          approvedBy: data.approvedBy,
          approvedAt: new Date()
        }
      })
      return leaveRequest
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }
  })

  // Get leave requests
  fastify.get('/team/leave-requests', {
    onRequest: view
  }, async (request) => {
    const user = (request as AuthenticatedRequest).user
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        tenantId: user.tenantId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    return leaveRequests
  })

  // Create shift
  fastify.post('/team/shifts', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const data = shiftSchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      const shift = await prisma.shift.create({
        data: {
          tenantId: user.tenantId,
          name: data.name,
          startTime: data.startTime,
          endTime: data.endTime,
          daysOfWeek: data.daysOfWeek
        }
      })
      return reply.status(201).send(shift)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }
  })

  // Assign shift to user
  fastify.post('/team/shift-assignments', {
    onRequest: edit
  }, async (request, reply) => {
    try {
      const data = shiftAssignmentSchema.parse(request.body)
      const user = (request as AuthenticatedRequest).user

      const assignment = await prisma.shiftAssignment.create({
        data: {
          shiftId: data.shiftId,
          userId: data.userId,
          tenantId: user.tenantId,
          date: new Date(data.date)
        }
      })
      return reply.status(201).send(assignment)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }
  })

  // Create team member
  fastify.post('/team/members', {
    onRequest: create
  }, async (request, reply) => {
    try {
      const data = createMemberSchema.parse(request.body)
      const { email, password, name, role, crmv, specialty, avatarUrl } = data
      const authenticatedUser = (request as AuthenticatedRequest).user

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return reply.status(400).send({ error: 'Email already registered' })
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create user
      const userRecord = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          avatarUrl
        }
      })

      // Create user-tenant relation
      const userTenant = await prisma.userTenant.create({
        data: {
          userId: userRecord.id,
          tenantId: authenticatedUser.tenantId,
          role
        },
        include: {
          user: true,
          tenant: true
        }
      })

      // If veterinarian, create veterinarian record
      if (role === 'VETERINARIAN' && crmv) {
        await prisma.veterinarian.create({
          data: {
            name,
            crmv,
            specialty,
            tenantId: authenticatedUser.tenantId,
            avatarUrl
          }
        })
      }

      return reply.status(201).send(userTenant)
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      throw error
    }
  })
}
