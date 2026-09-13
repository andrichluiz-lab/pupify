'use client'

import { useState } from 'react'
import { AppointmentFormDialog } from '@/components/agenda/appointment-form-dialog'
import { createAppointmentFromContact } from '@/lib/api'
import type { Appointment, WhatsAppContact } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  contact: WhatsAppContact
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function NewAppointmentModal({ contact, open, onClose, onCreated }: Props) {
  const initialData: Partial<Appointment> = {
    patientId: contact.patientId ?? undefined,
    tutorId: contact.tutorId ?? undefined,
  }

  const handleSave = async (data: Partial<Appointment>) => {
    try {
      await createAppointmentFromContact(contact.id, data)
      toast.success('Agendamento criado!')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar agendamento')
      throw err
    }
  }

  return (
    <AppointmentFormDialog
      open={open}
      onOpenChange={(o) => !o && onClose()}
      onSave={handleSave}
      initialData={initialData}
    />
  )
}
