'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { TimePicker } from '@/components/ui/time-picker'
import { updateTenant } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/api-client'

interface StepHoursProps {
  onNext: () => void
  onSkip: () => void
}

const days = [
  { id: 'segunda', label: 'Segunda' },
  { id: 'terca', label: 'Terça' },
  { id: 'quarta', label: 'Quarta' },
  { id: 'quinta', label: 'Quinta' },
  { id: 'sexta', label: 'Sexta' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
]

export function StepHours({ onNext, onSkip }: StepHoursProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [hours, setHours] = useState(
    days.reduce((acc, day) => ({
      ...acc,
      [day.id]: { open: '08:00', close: '18:00', closed: day.id === 'domingo' }
    }), {} as Record<string, { open: string; close: string; closed: boolean }>)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      // Convert hours object to JSON string for storage
      const operatingHours = JSON.stringify(hours)
      await updateTenant({ operatingHours })
      onNext()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar horários',
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleClosed = (dayId: string) => {
    setHours({
      ...hours,
      [dayId]: { ...hours[dayId], closed: !hours[dayId].closed }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Clock className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-semibold">Horários de Funcionamento</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Defina os horários de atendimento da clínica
        </p>
      </div>

      <div className="space-y-3">
        {days.map((day) => (
          <div key={day.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex-1">
              <Label className="text-sm font-medium">{day.label}</Label>
            </div>
            {!hours[day.id].closed ? (
              <>
                <TimePicker
                  value={hours[day.id].open}
                  onChange={(value) => setHours({
                    ...hours,
                    [day.id]: { ...hours[day.id], open: value }
                  })}
                  className="w-32"
                  disabled={isLoading}
                />
                <span className="text-muted-foreground">às</span>
                <TimePicker
                  value={hours[day.id].close}
                  onChange={(value) => setHours({
                    ...hours,
                    [day.id]: { ...hours[day.id], close: value }
                  })}
                  className="w-32"
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleClosed(day.id)}
                  className="text-destructive hover:text-destructive"
                  disabled={isLoading}
                >
                  Fechado
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Fechado</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleClosed(day.id)}
                  disabled={isLoading}
                >
                  Abrir
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onSkip} disabled={isLoading}>
          Pular
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Próximo'}
        </Button>
      </div>
    </form>
  )
}
