'use client'

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { useAuth } from "@/lib/auth-context"

export default function AppShellLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, tenant, isLoading: authLoading } = useAuth()
  const [shouldRedirect, setShouldRedirect] = useState(false)

  useEffect(() => {
    // Don't redirect if already on onboarding page
    if (pathname === '/onboarding') {
      return
    }

    if (!isAuthenticated || authLoading) {
      return
    }

    // Check onboarding status from tenant data (comes from /api/auth/me)
    if (tenant && !tenant.onboardingCompleted) {
      setShouldRedirect(true)
      router.push('/onboarding')
    }
  }, [isAuthenticated, tenant, authLoading, pathname, router])

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  // Don't flash the protected shell while the AuthProvider's redirect
  // effect is firing — show a neutral state instead.
  if (!isAuthenticated || shouldRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Redirecionando...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh bg-background">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}
