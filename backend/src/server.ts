import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import jwt from '@fastify/jwt'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import cookie from '@fastify/cookie'
import multipart from '@fastify/multipart'
import { prisma } from './lib/prisma.js'
import { authenticate } from './lib/jwt-middleware.js'
import { authRoutes } from './routes/auth.js'
import { patientsRoutes } from './routes/patients.js'
import { appointmentsRoutes } from './routes/appointments.js'
import { hospitalizationsRoutes } from './routes/hospitalizations.js'
import { consultationsRoutes } from './routes/consultations.js'
import { templatesRoutes } from './routes/templates.js'
import { inventoryRoutes } from './routes/inventory.js'
import { financialRoutes } from './routes/financial.js'
import { surgeriesRoutes } from './routes/surgeries.js'
import { dashboardRoutes } from './routes/dashboard.js'
import { teamRoutes } from './routes/team.js'
import { usersRoutes } from './routes/users.js'
import { tenantRoutes } from './routes/tenant.js'
import { servicesRoutes } from './routes/services.js'
import filesRoutes from './routes/files.js'
import consultationDocumentsRoutes from './routes/consultation-documents.js'
import { permissionsRoutes } from './routes/permissions.js'
import { notificationsRoutes } from './routes/notifications.js'
import { whatsappRoutes } from './routes/whatsapp.js'
import { emailRoutes } from './routes/emails.js'
import imageExamsRoutes from './routes/image-exams.js'
import { quotesRoutes } from './routes/quotes.js'
import { fichasRoutes } from './routes/fichas.js'
import { startWhatsAppScheduler } from './lib/whatsapp-scheduler.js'
import { startEmailScheduler } from './lib/email-scheduler.js'
import { ROLE_DEFAULTS } from './lib/permission-defaults.js'
import { Role } from '@prisma/client'

async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: true,
        },
      },
    },
    bodyLimit: 10 * 1024 * 1024, // 10MB for webhook payloads
  })

  // Register JWT
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  await fastify.register(jwt, {
    secret: jwtSecret,
  })

  // Register Cookie plugin
  const cookieSecret = process.env.COOKIE_SECRET
  if (!cookieSecret) {
    throw new Error('COOKIE_SECRET environment variable is required')
  }
  await fastify.register(cookie, {
    secret: cookieSecret,
  })

  // Register Multipart plugin for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    },
  })

  // Register Helmet for security headers
  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })

  // Register Rate Limiting
  const rateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false'
  if (rateLimitEnabled) {
    await fastify.register(rateLimit, {
      max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      timeWindow: process.env.RATE_LIMIT_TIME_WINDOW || '1 minute',
    })
  }

  // Register CORS with whitelist
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
  await fastify.register(cors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'), false)
      }
    },
    credentials: true,
  })

  // Add authenticate decorator
  fastify.decorate('authenticate', authenticate)

  // Register Swagger
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Pupify API',
        description: 'API for Pupify - Veterinary Clinic Management System',
        version: '1.0.0',
      },
      servers: [
        {
          url: 'http://localhost:3001',
          description: 'Development server',
        },
      ],
    },
  })

  // Register Swagger only in development
  if (process.env.NODE_ENV !== 'production') {
    await fastify.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
      },
      staticCSP: true,
      transformStaticCSP: (header: string) => header,
      transformSpecification: (swaggerObject: Record<string, unknown>) => {
        return swaggerObject as Record<string, unknown>
      },
      transformSpecificationClone: true,
    })
  }

  // Register routes
  await fastify.register(authRoutes, { prefix: '/api' })
  await fastify.register(patientsRoutes, { prefix: '/api' })
  await fastify.register(appointmentsRoutes, { prefix: '/api' })
  await fastify.register(hospitalizationsRoutes, { prefix: '/api' })
  await fastify.register(consultationsRoutes, { prefix: '/api' })
  await fastify.register(templatesRoutes, { prefix: '/api' })
  await fastify.register(inventoryRoutes, { prefix: '/api' })
  await fastify.register(financialRoutes, { prefix: '/api' })
  await fastify.register(surgeriesRoutes, { prefix: '/api' })
  await fastify.register(dashboardRoutes, { prefix: '/api' })
  await fastify.register(usersRoutes, { prefix: '/api' })

  await fastify.register(teamRoutes, { prefix: '/api' })
  await fastify.register(tenantRoutes, { prefix: '/api' })
  await fastify.register(servicesRoutes, { prefix: '/api' })
  await fastify.register(filesRoutes, { prefix: '/api/files' })
  await fastify.register(consultationDocumentsRoutes, { prefix: '/api/consultation-documents' })
  await fastify.register(permissionsRoutes, { prefix: '/api' })
  await fastify.register(notificationsRoutes, { prefix: '/api' })
  await fastify.register(whatsappRoutes, { prefix: '/api' })
  await fastify.register(emailRoutes, { prefix: '/api/emails' })
  await fastify.register(imageExamsRoutes, { prefix: '/api/image-exams' })
  await fastify.register(quotesRoutes, { prefix: '/api' })
  await fastify.register(fichasRoutes, { prefix: '/api' })

  // Health check
  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() }
  })

  return fastify
}

async function syncRolePermissions() {
  const roles = [Role.CLINIC_ADMIN, Role.VETERINARIAN, Role.RECEPTIONIST, Role.TECHNICIAN]
  for (const role of roles) {
    const perms = ROLE_DEFAULTS[role]
    for (const permission of perms) {
      await prisma.rolePermission.upsert({
        where: { role_permission: { role, permission } },
        update: {},
        create: { role, permission },
      })
    }
  }
}

async function start() {
  const fastify = await buildServer()

  // Graceful shutdown
  const close = async () => {
    await fastify.close()
    await prisma.$disconnect()
  }

  process.on('SIGINT', close)
  process.on('SIGTERM', close)

  try {
    const port = parseInt(process.env.PORT || '3001', 10)
    const host = process.env.HOST || 'localhost'
    
    await fastify.listen({ port, host })
    console.log(`🚀 Server running at http://${host}:${port}`)
    console.log(`📚 Documentation available at http://${host}:${port}/docs`)
    await syncRolePermissions()
    startWhatsAppScheduler()
    startEmailScheduler()
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

export { buildServer }
