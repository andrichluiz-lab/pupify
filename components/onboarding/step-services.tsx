'use client'

import { useState } from 'react'
import { Sparkles, DollarSign, Clock, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createServicesBulk, createService } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/api-client'

interface StepServicesProps {
  onNext: () => void
  onSkip: () => void
}

const defaultServices = [
  { name: 'Consulta', category: 'consulta', price: 150, durationMin: 30, description: 'Consulta veterinária geral' },
  { name: 'Consulta de Retorno', category: 'retorno', price: 100, durationMin: 20, description: 'Consulta de acompanhamento' },
  { name: 'Vacina', category: 'vacina', price: 80, durationMin: 15, description: 'Aplicação de vacina' },
  { name: 'Banho', category: 'banho_tosa', price: 60, durationMin: 60, description: 'Banho completo' },
  { name: 'Tosa', category: 'banho_tosa', price: 80, durationMin: 45, description: 'Tosa higiênica ou completa' },
  { name: 'Exame de Sangue', category: 'exame', price: 120, durationMin: 30, description: 'Hemograma completo' },
  { name: 'Raio-X', category: 'exame', price: 200, durationMin: 30, description: 'Exame radiográfico' },
  { name: 'Ultrassom', category: 'exame', price: 250, durationMin: 45, description: 'Exame de ultrassom' },
]

export function StepServices({ onNext, onSkip }: StepServicesProps) {
  const { toast } = useToast()
  const [useTemplate, setUseTemplate] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  const handleUseTemplate = async () => {
    setIsLoading(true)
    try {
      await createServicesBulk(defaultServices)
      toast({
        title: 'Serviços configurados',
        description: 'Os serviços padrão foram adicionados com sucesso.',
      })
      onNext()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao configurar serviços',
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSkip = () => {
    onSkip()
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-semibold">Serviços e Preços</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure os serviços oferecidos pela sua clínica
        </p>
      </div>

      {useTemplate ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Package className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="flex min-w-0 flex-1">
                <h3 className="text-sm font-medium">Usar Template Padrão</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Adicione automaticamente os serviços mais comuns para clínicas veterinárias:
                  Consulta, Vacina, Banho, Tosa, Exames, etc.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {defaultServices.map((service) => (
                    <span
                      key={service.name}
                      className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                    >
                      {service.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={handleSkip}>
              Pular
            </Button>
            <Button type="button" variant="outline" onClick={() => setUseTemplate(false)}>
              Configurar Manualmente
            </Button>
            <Button type="button" onClick={handleUseTemplate} disabled={isLoading}>
              {isLoading ? 'Configurando...' : 'Usar Template'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configuração manual estará disponível em breve. Por enquanto, use o template padrão.
          </p>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button type="button" variant="ghost" onClick={handleSkip}>
              Pular
            </Button>
            <Button type="button" variant="outline" onClick={() => setUseTemplate(true)}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
