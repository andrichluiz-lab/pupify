'use client'

import { CheckCircle, Sparkles } from 'lucide-react'
import { useEffect } from 'react'

export function StepComplete() {
  useEffect(() => {
    // Auto-redirect after 2 seconds
    const timer = setTimeout(() => {
      window.location.href = '/'
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center space-y-6 text-center">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle className="h-12 w-12 text-primary" strokeWidth={1.75} />
        </div>
        <div className="absolute -top-2 -right-2">
          <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.75} />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Configuração Concluída!</h2>
        <p className="text-sm text-muted-foreground">
          Sua clínica está pronta para usar o Pupify.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/50 px-4 py-2">
        <p className="text-xs text-muted-foreground">Redirecionando para o dashboard...</p>
      </div>
    </div>
  )
}
