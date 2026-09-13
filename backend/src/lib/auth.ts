import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { Permission } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

// Parse a TTL env var that is expected to be a plain integer count of seconds.
// Rejects anything that isn't a positive integer (e.g. "100h" → NaN-after-strip),
// because jsonwebtoken and cookie maxAge both expect seconds as a number, and a
// silent parseInt("100h") = 100 means tokens expire in 100 seconds.
function parseTtlSeconds(value: string | undefined, fallback: number, name: string): number {
  if (!value) return fallback
  if (!/^\d+$/.test(value.trim())) {
    console.warn(`[auth] ${name}=${value} is not a plain integer of seconds; using fallback ${fallback}s`)
    return fallback
  }
  const n = parseInt(value, 10)
  return n > 0 ? n : fallback
}

export const ACCESS_TOKEN_TTL_SECONDS = parseTtlSeconds(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN, 7200, 'JWT_ACCESS_TOKEN_EXPIRES_IN')
export const REFRESH_TOKEN_TTL_SECONDS = parseTtlSeconds(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN, 604800, 'JWT_REFRESH_TOKEN_EXPIRES_IN')

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required')
}

export interface TokenPayload {
  userId: string
  email: string
  tenantId: string
  userTenantId: string
  role: string
  permissions: Permission[]
  permVersion: number
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: TokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: ACCESS_TOKEN_TTL_SECONDS }
  return jwt.sign(payload, JWT_SECRET, options)
}

export function generateRefreshToken(payload: TokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: REFRESH_TOKEN_TTL_SECONDS }
  return jwt.sign(payload, JWT_REFRESH_SECRET, options)
}

function isTokenPayload(payload: unknown): payload is TokenPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'userId' in payload &&
    'email' in payload &&
    'tenantId' in payload &&
    'role' in payload
    // userTenantId / permissions / permVersion are validated softly to keep
    // backward compatibility with old tokens during the rollout window.
  )
}

export function verifyToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_SECRET)
  if (typeof decoded === 'string' || !isTokenPayload(decoded)) {
    throw new Error('Invalid token payload')
  }
  return decoded
}

export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, JWT_REFRESH_SECRET)
  if (typeof decoded === 'string' || !isTokenPayload(decoded)) {
    throw new Error('Invalid refresh token payload')
  }
  return decoded
}
