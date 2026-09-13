'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Permission } from '@/lib/permissions'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
}

export interface Tenant {
  id: string
  name: string
  slug: string
  cnpj?: string
  phone?: string
  email?: string
  address?: string
  onboardingCompleted: boolean
  onboardingStep: number
}

export interface Veterinarian {
  id: string
  name: string
  crmv: string
  specialty?: string
  avatarUrl?: string
}

export interface AuthContextType {
  user: User | null
  tenant: Tenant | null
  veterinarian: Veterinarian | null
  role: string | null
  permissions: Permission[]
  token: string | null
  login: (email: string, password: string, tenantSlug?: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshToken: () => Promise<void>
  isLoading: boolean
  isAuthenticated: boolean
}

export interface RegisterData {
  email: string
  password: string
  name: string
  tenantSlug: string
  clinicName?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [veterinarian, setVeterinarian] = useState<Veterinarian | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'

    const applySession = (data: {
      user: User
      tenant: Tenant
      veterinarian?: Veterinarian | null
      role: string
      permissions?: Permission[]
    }) => {
      setUser(data.user)
      setTenant(data.tenant)
      setVeterinarian(data.veterinarian || null)
      setRole(data.role)
      setPermissions(data.permissions || [])
      setToken('exists')
    }

    const fetchMe = () =>
      fetch(`${apiBase}/api/auth/me`, { credentials: 'include' })

    // Hydrate the session on mount. If /me returns 401, try the refresh
    // token once before giving up — otherwise an expired access token
    // forces the user back to /login on every F5 even though their
    // refresh token is still valid.
    const fetchUserData = async () => {
      try {
        let response = await fetchMe()

        if (response.status === 401) {
          const refreshResponse = await fetch(`${apiBase}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          })
          if (refreshResponse.ok) {
            response = await fetchMe()
          }
        }

        if (response.ok) {
          applySession(await response.json())
        }
      } catch (error: unknown) {
        console.error('Failed to fetch user data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [])

  // Redirect unauthenticated users from protected routes
  useEffect(() => {
    if (!isLoading && !token) {
      const pathname = window.location.pathname
      if (pathname !== '/login' && pathname !== '/register') {
        // Add a small delay to prevent rapid redirects
        const redirectTimer = setTimeout(() => {
          window.location.href = `/login?redirect=${encodeURIComponent(pathname)}`
        }, 100)
        return () => clearTimeout(redirectTimer)
      }
    }
  }, [isLoading, token])

  const login = async (email: string, password: string, tenantSlug?: string) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, tenantSlug }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Login failed')
    }

    // Token is set in HttpOnly cookie by backend
    // Fetch user data from /api/auth/me
    const meResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/auth/me`, {
      credentials: 'include',
    })

    if (meResponse.ok) {
      const data = await meResponse.json()
      setUser(data.user)
      setTenant(data.tenant)
      setVeterinarian(data.veterinarian || null)
      setRole(data.role)
      setPermissions(data.permissions || [])
      setToken('exists')
    }
  }

  const register = async (data: RegisterData) => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    // Token is set in HttpOnly cookie by backend
    // Fetch user data from /api/auth/me
    const meResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/auth/me`, {
      credentials: 'include',
    })

    if (meResponse.ok) {
      const result = await meResponse.json()
      setUser(result.user)
      setTenant(result.tenant)
      setVeterinarian(result.veterinarian || null)
      setRole(result.role)
      setPermissions(result.permissions || [])
      setToken('exists')
    }
  }

  const logout = async () => {
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error: unknown) {
      console.error('Logout error:', error)
    }

    // Clear state (cookies are cleared by backend)
    setToken(null)
    setUser(null)
    setTenant(null)
    setVeterinarian(null)
    setRole(null)
    setPermissions([])
    
    // Force redirect to login page
    window.location.href = '/login'
  }

  const refreshToken = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      // Token is refreshed in HttpOnly cookie by backend.
      // Re-fetch /api/auth/me so the new permissions array is hydrated.
      try {
        const meResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/auth/me`, {
          credentials: 'include',
        })
        if (meResponse.ok) {
          const data = await meResponse.json()
          setRole(data.role)
          setPermissions(data.permissions || [])
        }
      } catch (err) {
        console.error('Failed to refresh /me after token refresh:', err)
      }
    } catch (error: unknown) {
      console.error('Token refresh error:', error)
      // If refresh fails, logout the user
      await logout()
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        veterinarian,
        role,
        permissions,
        token,
        login,
        register,
        logout,
        refreshToken,
        isLoading,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
