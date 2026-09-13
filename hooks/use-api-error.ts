'use client'

import { toast } from '@/hooks/use-toast'
import { getErrorMessage, ApiError } from '@/lib/api-client'

export function useApiError() {
  const showError = (error: unknown, title: string = 'Erro') => {
    const message = getErrorMessage(error)
    
    toast({
      variant: 'destructive',
      title,
      description: message,
    })
  }

  return { showError }
}

// Helper function for non-client components
export function showApiError(error: unknown, title: string = 'Erro') {
  const message = getErrorMessage(error)
  
  toast({
    variant: 'destructive',
    title,
    description: message,
  })
}
