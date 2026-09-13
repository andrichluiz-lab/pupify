"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AppointmentFormDialogButton } from "./appointment-form-dialog-button"
import type { Appointment } from "@/lib/types"

interface NewAppointmentButtonProps {
  onCreate: (data: Partial<Appointment>) => Promise<void>
}

export function NewAppointmentButton({ onCreate }: NewAppointmentButtonProps) {
  return (
    <AppointmentFormDialogButton
      onSave={onCreate}
      buttonClassName="bg-primary text-primary-foreground hover:bg-primary/90 h-8 gap-1.5 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
    >
      <Plus className="h-3.5 w-3.5" />
      Novo agendamento
    </AppointmentFormDialogButton>
  )
}
