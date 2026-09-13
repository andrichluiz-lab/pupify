import { FastifyInstance } from 'fastify'
import { Permission } from '@prisma/client'
import { prisma } from '../lib/prisma.js'
import { authenticate, requirePermission, verifyPermVersion } from '../lib/jwt-middleware.js'
import type { AuthenticatedRequest } from '../types/fastify.js'

const view = [authenticate, verifyPermVersion, requirePermission(Permission.dashboard_view)]

export async function dashboardRoutes(fastify: FastifyInstance) {
  // Get dashboard stats
  fastify.get('/dashboard/stats', { onRequest: view }, async (request, _reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const now = new Date()
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    // Appointments today
    const appointmentsToday = await prisma.appointment.count({
      where: {
        tenantId,
        startsAt: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    })

    // Appointments same day last week
    const lastWeekSameDay = new Date(today)
    lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7)
    const lastWeekSameDayEnd = new Date(lastWeekSameDay.getTime() + 24 * 60 * 60 * 1000)
    const appointmentsLastWeekSameDay = await prisma.appointment.count({
      where: {
        tenantId,
        startsAt: {
          gte: lastWeekSameDay,
          lt: lastWeekSameDayEnd,
        },
      },
    })

    const appointmentsTodayDelta = appointmentsLastWeekSameDay > 0
      ? Math.round(((appointmentsToday - appointmentsLastWeekSameDay) / appointmentsLastWeekSameDay) * 100)
      : 0

    // New patients this week
    const newPatientsThisWeek = await prisma.patient.count({
      where: {
        tenantId,
        createdAt: {
          gte: weekAgo,
        },
      },
    })

    // New patients last week
    const twoWeeksAgo = new Date(weekAgo)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7)
    const newPatientsLastWeek = await prisma.patient.count({
      where: {
        tenantId,
        createdAt: {
          gte: twoWeeksAgo,
          lt: weekAgo,
        },
      },
    })

    const newPatientsDelta = newPatientsLastWeek > 0
      ? Math.round(((newPatientsThisWeek - newPatientsLastWeek) / newPatientsLastWeek) * 100)
      : 0

    // Hospitalized patients
    const hospitalized = await prisma.hospitalization.count({
      where: {
        tenantId,
        status: {
          in: ['estavel', 'observacao', 'critico', 'recuperacao'],
        },
      },
    })

    // Revenue this month
    const revenueThisMonth = await prisma.financialTransaction.aggregate({
      where: {
        tenantId,
        direction: 'entrada',
        status: 'pago',
        paidAt: {
          gte: monthStart,
        },
      },
      _sum: {
        amount: true,
      },
    })

    // Revenue last month
    const revenueLastMonth = await prisma.financialTransaction.aggregate({
      where: {
        tenantId,
        direction: 'entrada',
        status: 'pago',
        paidAt: {
          gte: lastMonthStart,
          lt: monthStart,
        },
      },
      _sum: {
        amount: true,
      },
    })

    const currentRevenue = revenueThisMonth._sum.amount || 0
    const lastRevenue = revenueLastMonth._sum.amount || 0
    const revenueDelta = lastRevenue > 0
      ? Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100)
      : 0

    return {
      appointmentsToday,
      appointmentsTodayDelta,
      newPatientsThisWeek,
      newPatientsDelta,
      hospitalized,
      revenueThisMonth: currentRevenue,
      revenueDelta,
    }
  })

  // Get revenue series for last 30 days
  fastify.get('/dashboard/revenue', { onRequest: view }, async (request, _reply) => {
    const { tenantId } = (request as AuthenticatedRequest).user
    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const transactions = await prisma.financialTransaction.findMany({
      where: {
        tenantId,
        direction: 'entrada',
        status: 'pago',
        paidAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        paidAt: true,
        amount: true,
      },
    })
    
    // Group by date
    const revenueByDate = new Map<string, { revenue: number; appointments: number }>()
    
    for (const tx of transactions) {
      if (tx.paidAt) {
        const dateKey = tx.paidAt.toISOString().split('T')[0]
        const current = revenueByDate.get(dateKey) || { revenue: 0, appointments: 0 }
        revenueByDate.set(dateKey, {
          revenue: current.revenue + tx.amount,
          appointments: current.appointments + 1,
        })
      }
    }
    
    // Fill missing dates
    const result = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateKey = date.toISOString().split('T')[0]
      const data = revenueByDate.get(dateKey) || { revenue: 0, appointments: 0 }
      result.push({
        date: dateKey,
        revenue: data.revenue,
        appointments: data.appointments,
      })
    }
    
    return result
  })
}
