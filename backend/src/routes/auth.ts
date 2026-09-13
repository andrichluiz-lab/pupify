import { FastifyInstance, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword, generateToken, generateRefreshToken, verifyRefreshToken, ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from '../lib/auth.js'
import { authenticate } from '../lib/jwt-middleware.js'
import { loadPermissionsForToken } from '../lib/permissions.js'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  tenantSlug: z.string().min(2),
  clinicName: z.string().min(2),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  tenantSlug: z.string().optional(),
})

export async function authRoutes(fastify: FastifyInstance) {
  // Helper function to set auth cookies.
  // In production we set domain=.pupify.com.br so the cookie is shared between
  // app.pupify.com.br (Next.js SSR) and api.pupify.com.br (this backend).
  // Without this, server components can't read the cookie and SSR data fetching fails.
  function setAuthCookies(reply: FastifyReply, token: string, refreshToken: string) {
    const isSecure = process.env.NODE_ENV === 'production'
    const sameSiteValue = isSecure ? 'none' : 'lax'
    const cookieDomain = process.env.COOKIE_DOMAIN || (isSecure ? '.pupify.com.br' : undefined)

    reply.setCookie('auth_token', token, {
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: sameSiteValue,
      maxAge: ACCESS_TOKEN_TTL_SECONDS,
      domain: cookieDomain,
    })

    reply.setCookie('refresh_token', refreshToken, {
      path: '/',
      httpOnly: true,
      secure: isSecure,
      sameSite: sameSiteValue,
      maxAge: REFRESH_TOKEN_TTL_SECONDS,
      domain: cookieDomain,
    })
  }

  // Must match setAuthCookies' domain/path so the browser actually clears them.
  function clearAuthCookies(reply: FastifyReply) {
    const isSecure = process.env.NODE_ENV === 'production'
    const cookieDomain = process.env.COOKIE_DOMAIN || (isSecure ? '.pupify.com.br' : undefined)
    reply.clearCookie('auth_token', { path: '/', domain: cookieDomain })
    reply.clearCookie('refresh_token', { path: '/', domain: cookieDomain })
  }

  // Register new user and tenant
  fastify.post('/auth/register', async (request, reply) => {
    try {
      const body = registerSchema.parse(request.body)

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: body.email },
      })

      if (existingUser) {
        return reply.status(400).send({ error: 'Email already registered' })
      }

      // Check if tenant already exists
      const existingTenant = await prisma.tenant.findUnique({
        where: { slug: body.tenantSlug },
      })

      if (existingTenant) {
        return reply.status(400).send({ error: 'Tenant slug already taken' })
      }

      // Create tenant
      const tenant = await prisma.tenant.create({
        data: {
          name: body.clinicName,
          slug: body.tenantSlug,
        },
      })

      // Create user
      const hashedPassword = await hashPassword(body.password)
      const user = await prisma.user.create({
        data: {
          email: body.email,
          password: hashedPassword,
          name: body.name,
        },
      })

      // Assign user to tenant as CLINIC_ADMIN
      const newUserTenant = await prisma.userTenant.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          role: 'CLINIC_ADMIN',
        },
      })

      // Load permissions for the freshly-minted JWT
      const { permissions, permVersion } = await loadPermissionsForToken(newUserTenant.id)

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        tenantId: tenant.id,
        userTenantId: newUserTenant.id,
        role: 'CLINIC_ADMIN' as const,
        permissions,
        permVersion,
      }

      // Generate tokens
      const token = generateToken(tokenPayload)
      const refreshToken = generateRefreshToken(tokenPayload)

      // Save refresh token to database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          tenantId: tenant.id,
          expiresAt,
        },
      })

      setAuthCookies(reply, token, refreshToken)

      return reply.status(201).send({
        message: 'Registration successful'
      })
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Login
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const body = loginSchema.parse(request.body)

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: body.email },
      })

      if (!user || !user.active) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }

      // Verify password
      const isValid = await verifyPassword(body.password, user.password)
      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid credentials' })
      }

      // Find tenant - either by slug if provided, or get user's first tenant
      let tenant
      let userTenant

      if (body.tenantSlug) {
        // Find specific tenant by slug
        tenant = await prisma.tenant.findUnique({
          where: { slug: body.tenantSlug },
        })

        if (!tenant || !tenant.active) {
          return reply.status(401).send({ error: 'Invalid tenant' })
        }

        // Check if user has access to this tenant
        userTenant = await prisma.userTenant.findUnique({
          where: {
            userId_tenantId: {
              userId: user.id,
              tenantId: tenant.id,
            },
          },
        })

        if (!userTenant) {
          return reply.status(403).send({ error: 'User does not have access to this tenant' })
        }
      } else {
        // Get user's first tenant
        userTenant = await prisma.userTenant.findFirst({
          where: { userId: user.id },
          include: { tenant: true },
          orderBy: { createdAt: 'asc' },
        })

        if (!userTenant || !userTenant.tenant || !userTenant.tenant.active) {
          return reply.status(403).send({ error: 'User does not have access to any active tenant' })
        }

        tenant = userTenant.tenant
      }

      // Load permissions for the freshly-minted JWT
      const { permissions, permVersion } = await loadPermissionsForToken(userTenant.id)

      const tokenPayload = {
        userId: user.id,
        email: user.email,
        tenantId: tenant.id,
        userTenantId: userTenant.id,
        role: userTenant.role,
        permissions,
        permVersion,
      }

      // Generate tokens
      const token = generateToken(tokenPayload)
      const refreshToken = generateRefreshToken(tokenPayload)

      // Save refresh token to database
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          tenantId: tenant.id,
          expiresAt,
        },
      })

      setAuthCookies(reply, token, refreshToken)

      return {
        message: 'Login successful'
      }
    } catch (error: unknown) {
      fastify.log.error(error)
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors })
      }
      return reply.status(500).send({ error: 'Internal server error' })
    }
  })

  // Get current user
  fastify.get('/auth/me', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const payload = request.user as { userId: string; tenantId: string; role: string }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    })

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: payload.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        cnpj: true,
        phone: true,
        email: true,
        address: true,
        onboardingCompleted: true,
        onboardingStep: true,
      },
    })

    if (!tenant) {
      return reply.status(404).send({ error: 'Tenant not found' })
    }

    // Get veterinarian data if user is a veterinarian
    let veterinarian = null
    if (payload.role === 'VETERINARIAN') {
      veterinarian = await prisma.veterinarian.findFirst({
        where: {
          tenantId: payload.tenantId,
          name: user.name, // Match by name (could be improved with a direct relation)
        },
      })
    }

    // Permissions: prefer the JWT payload (already includes overrides). Fall
    // back to loading from DB for legacy tokens that don't carry them yet.
    const jwtPerms = (request.user as { permissions?: string[] }).permissions
    const userTenantId = (request.user as { userTenantId?: string }).userTenantId
    let permissions = Array.isArray(jwtPerms) ? jwtPerms : null
    if (!permissions && userTenantId) {
      const { permissions: loaded } = await loadPermissionsForToken(userTenantId)
      permissions = loaded
    }

    return {
      user,
      tenant,
      veterinarian,
      role: payload.role,
      permissions: permissions ?? [],
    }
  })

  // Refresh token
  fastify.post('/auth/refresh', async (request, reply) => {
    try {
      const refreshToken = request.cookies.refresh_token

      if (!refreshToken) {
        return reply.status(401).send({ error: 'Refresh token not found' })
      }

      // Verify refresh token signature
      const payload = verifyRefreshToken(refreshToken)

      // Check if refresh token exists in database and is not revoked
      const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      })

      if (!storedToken) {
        return reply.status(401).send({ error: 'Invalid refresh token' })
      }

      if (storedToken.revokedAt) {
        return reply.status(401).send({ error: 'Refresh token has been revoked' })
      }

      if (storedToken.expiresAt < new Date()) {
        return reply.status(401).send({ error: 'Refresh token has expired' })
      }

      // Verify user still has access to the tenant
      const userTenant = await prisma.userTenant.findUnique({
        where: {
          userId_tenantId: {
            userId: payload.userId,
            tenantId: payload.tenantId,
          },
        },
      })

      if (!userTenant) {
        return reply.status(403).send({ error: 'User no longer has access to this tenant' })
      }

      // Recalculate permissions on every refresh — picks up admin changes
      const { permissions, permVersion } = await loadPermissionsForToken(userTenant.id)

      const newTokenPayload = {
        userId: payload.userId,
        email: payload.email,
        tenantId: payload.tenantId,
        userTenantId: userTenant.id,
        role: userTenant.role,
        permissions,
        permVersion,
      }

      // Generate new access token
      const token = generateToken(newTokenPayload)

      // Generate new refresh token
      const newRefreshToken = generateRefreshToken(newTokenPayload)

      // Use transaction to prevent race condition
      await prisma.$transaction(async (tx) => {
        // Revoke old refresh token with optimistic concurrency check
        const updated = await tx.refreshToken.updateMany({
          where: {
            id: storedToken.id,
            revokedAt: null, // Optimistic check - only update if not already revoked
          },
          data: { revokedAt: new Date() },
        })

        if (updated.count === 0) {
          throw new Error('Refresh token already revoked or used')
        }

        // Save new refresh token to database
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        await tx.refreshToken.create({
          data: {
            token: newRefreshToken,
            userId: payload.userId,
            tenantId: payload.tenantId,
            expiresAt,
          },
        })

        setAuthCookies(reply, token, newRefreshToken)
      })

      return { message: 'Token refreshed successfully' }
    } catch (error: unknown) {
      fastify.log.error(error)
      return reply.status(401).send({ error: 'Invalid refresh token' })
    }
  })

  // Logout
  fastify.post('/auth/logout', {
    onRequest: [authenticate],
  }, async (request, reply) => {
    const payload = request.user as { userId: string; tenantId: string; role: string }

    // Revoke all refresh tokens for this user
    try {
      await prisma.refreshToken.updateMany({
        where: {
          userId: payload.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      })
    } catch (error: unknown) {
      // Log error but don't fail the logout
      fastify.log.error({ error }, 'Error revoking refresh tokens')
    }

    clearAuthCookies(reply)
    return { message: 'Logged out successfully' }
  })
}