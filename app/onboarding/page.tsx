'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard'
import { getTenantOnboardingStatus } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

export default function OnboardingPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function checkOnboarding() {
      if (!isAuthenticated) {
        router.push('/login')
        return
      }

      try {
        const tenant = await getTenantOnboardingStatus()
        if (tenant.onboardingCompleted) {
          router.push('/')
          return
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        // If error, allow user to proceed with onboarding
      } finally {
        setIsLoading(false)
      }
    }

    checkOnboarding()
  }, [isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return <OnboardingWizard />
}
