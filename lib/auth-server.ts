import { cookies } from 'next/headers'

export interface ServerAuthUser {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

export interface ServerAuthTenant {
  id: string
  name: string
  slug: string
}

export interface ServerAuthSession {
  user: ServerAuthUser | null
  tenant: ServerAuthTenant | null
  role: string | null
  isAuthenticated: boolean
}

export async function getServerSession(): Promise<ServerAuthSession> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value

  if (!token) {
    return {
      user: null,
      tenant: null,
      role: null,
      isAuthenticated: false
    }
  }

  // Fetch user data from /api/auth/me (backend validates JWT and returns secure data)
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
    const allCookies = cookieStore.getAll()
    const cookieString = allCookies.map(c => `${c.name}=${c.value}`).join('; ')
    
    const response = await fetch(`${apiUrl}/api/auth/me`, {
      headers: {
        'Cookie': cookieString,
      },
      cache: 'no-store',
    })

    if (response.ok) {
      const data = await response.json()
      return {
        user: data.user,
        tenant: data.tenant,
        role: data.role,
        isAuthenticated: true
      }
    }
  } catch (error: unknown) {
    console.error('Failed to fetch server session:', error)
  }

  return {
    user: null,
    tenant: null,
    role: null,
    isAuthenticated: false
  }
}

export async function requireAuth() {
  const session = await getServerSession()
  
  if (!session.isAuthenticated) {
    throw new Error('Unauthorized')
  }
  
  return session
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth()
  
  if (!session.role || !allowedRoles.includes(session.role)) {
    throw new Error('Forbidden')
  }
  
  return session
}
