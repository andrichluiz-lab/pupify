"use client"

import { useState } from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
import { useToast } from "@/hooks/use-toast"
import { put } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-client"

const days = [
  { id: 'segunda', label: 'Segunda' },
  { id: 'terca', label: 'Terça' },
  { id: 'quarta', label: 'Quarta' },
  { id: 'quinta', label: 'Quinta' },
  { id: 'sexta', label: 'Sexta' },
  { id: 'sabado', label: 'Sábado' },
  { id: 'domingo', label: 'Domingo' },
]

interface HoursFormData {
  [key: string]: { open: string; close: string; closed: boolean }
}

interface HoursFormProps {
  operatingHours?: string | null
}

export function HoursForm({ operatingHours }: HoursFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const [hours, setHours] = useState<HoursFormData>(() => {
    if (operatingHours) {
      try {
        return JSON.parse(operatingHours)
      } catch {
        return days.reduce((acc, day) => ({
          ...acc,
          [day.id]: { open: '08:00', close: '18:00', closed: day.id === 'domingo' }
        }), {} as HoursFormData)
      }
    }
    return days.reduce((acc, day) => ({
      ...acc,
      [day.id]: { open: '08:00', close: '18:00', closed: day.id === 'domingo' }
    }), {} as HoursFormData)
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      await put("/api/tenant", { operatingHours: JSON.stringify(hours) })
      toast({
        title: "Horários atualizados",
        description: "Os horários de funcionamento foram atualizados com sucesso.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar horários",
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleClosed = (dayId: string) => {
    if (!hours[dayId]) {
      setHours({
        ...hours,
        [dayId]: { open: '08:00', close: '18:00', closed: false }
      })
      return
    }
    setHours({
      ...hours,
      [dayId]: { ...hours[dayId], closed: !hours[dayId].closed }
    })
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Horários de Funcionamento</h2>
      </div>
      <form onSubmit={onSubmit} className="p-4">
        <div className="space-y-3">
          {days.map((day) => {
            const dayHours = hours[day.id] || { open: '08:00', close: '18:00', closed: day.id === 'domingo' }
            return (
              <div key={day.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex-1">
                  <Label className="text-sm font-medium">{day.label}</Label>
                </div>
                {!dayHours.closed ? (
                  <>
                    <TimePicker
                      value={dayHours.open}
                      onChange={(value) => setHours({
                        ...hours,
                        [day.id]: { ...dayHours, open: value }
                      })}
                      className="w-32"
                      disabled={isLoading}
                    />
                    <span className="text-muted-foreground">às</span>
                    <TimePicker
                      value={dayHours.close}
                      onChange={(value) => setHours({
                        ...hours,
                        [day.id]: { ...dayHours, close: value }
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
            )
          })}
        </div>

        <div className="flex justify-end mt-4">
          <Button type="submit" size="sm" className="h-8 gap-1.5" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </form>
    </div>
  )
}
