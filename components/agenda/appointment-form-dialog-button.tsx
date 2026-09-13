"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { AppointmentFormDialog } from "./appointment-form-dialog"
import type { Appointment } from "@/lib/types"

interface AppointmentFormDialogButtonProps {
  children: ReactNode
  onSave: (data: Partial<Appointment>) => Promise<void>
  initialData?: Partial<Appointment>
  buttonVariant?: "default" | "outline" | "ghost"
  buttonSize?: "default" | "sm" | "lg"
  buttonClassName?: string
}

export function AppointmentFormDialogButton({
  children,
  onSave,
  initialData,
  buttonVariant = "default",
  buttonSize = "default",
  buttonClassName = "",
}: AppointmentFormDialogButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${buttonClassName}`}
      >
        {children}
      </button>
      <AppointmentFormDialog
        open={open}
        onOpenChange={setOpen}
        onSave={onSave}
        initialData={initialData}
      />
    </>
  )
}
