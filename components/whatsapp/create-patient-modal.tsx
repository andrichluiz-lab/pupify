'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createPatientFromContact } from '@/lib/api'
import type { WhatsAppContact } from '@/lib/types'
import { toast } from 'sonner'

interface Props {
  contact: WhatsAppContact
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreatePatientModal({ contact, open, onClose, onCreated }: Props) {
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    tutorName: contact.name ?? '',
    tutorPhone: contact.phone,
    tutorEmail: '',
    tutorCpf: '',
    patientName: '',
    species: 'Cao',
    breed: '',
    sex: 'M',
    birthDate: '',
    weightKg: '',
    neutered: false,
  })

  const set = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.patientName || !form.breed || !form.birthDate || !form.weightKg) {
      toast.error('Preencha os campos obrigatórios do paciente')
      return
    }
    setLoading(true)
    try {
      await createPatientFromContact(contact.id, {
        tutor: {
          name: form.tutorName,
          phone: form.tutorPhone,
          email: form.tutorEmail || undefined,
          cpf: form.tutorCpf || undefined,
        },
        patient: {
          name: form.patientName,
          species: form.species,
          breed: form.breed,
          sex: form.sex,
          birthDate: form.birthDate,
          weightKg: parseFloat(form.weightKg),
          neutered: form.neutered,
          allergies: [],
          chronicConditions: [],
        },
      })
      toast.success('Paciente criado com sucesso!')
      onCreated()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar paciente')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar paciente a partir do contato</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Tutor
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={form.tutorName} onChange={(e) => set('tutorName', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Telefone *</Label>
                <Input value={form.tutorPhone} onChange={(e) => set('tutorPhone', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>E-mail</Label>
                <Input type="email" value={form.tutorEmail} onChange={(e) => set('tutorEmail', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>CPF</Label>
                <Input value={form.tutorCpf} onChange={(e) => set('tutorCpf', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Paciente
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome do pet *</Label>
                <Input value={form.patientName} onChange={(e) => set('patientName', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Espécie *</Label>
                <Select value={form.species} onValueChange={(v) => set('species', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cao">Cão</SelectItem>
                    <SelectItem value="Gato">Gato</SelectItem>
                    <SelectItem value="Ave">Ave</SelectItem>
                    <SelectItem value="Roedor">Roedor</SelectItem>
                    <SelectItem value="Reptil">Réptil</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Raça *</Label>
                <Input value={form.breed} onChange={(e) => set('breed', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Sexo *</Label>
                <Select value={form.sex} onValueChange={(v) => set('sex', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Macho</SelectItem>
                    <SelectItem value="F">Fêmea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Data de nascimento *</Label>
                <Input type="date" value={form.birthDate} onChange={(e) => set('birthDate', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Peso (kg) *</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.weightKg}
                  onChange={(e) => set('weightKg', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar paciente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
