'use client'

import { useState } from 'react'
import { PawPrint, User as UserIcon, Phone, Mail, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MaskedInput, masks } from '@/components/ui/masked-input'
import { createPatient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/api-client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ptBR as ptBRDayPicker } from 'react-day-picker/locale'

import type { Species } from '@/lib/types'

interface StepPatientProps {
  onNext: () => void
  onSkip: () => void
}

export function StepPatient({ onNext, onSkip }: StepPatientProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    patientName: '',
    species: 'Cao',
    breed: '',
    birthDate: '',
    weightKg: '',
    tutorName: '',
    tutorPhone: '',
    tutorEmail: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await createPatient({
        patient: {
          name: formData.patientName,
          species: formData.species as Species,
          breed: formData.breed,
          sex: 'M',
          birthDate: formData.birthDate || new Date('2020-01-01').toISOString(),
          weightKg: parseFloat(formData.weightKg) || 5,
        },
        tutor: {
          name: formData.tutorName,
          phone: formData.tutorPhone,
          email: formData.tutorEmail || undefined,
        },
      } as unknown as Parameters<typeof createPatient>[0])
      
      toast({
        title: 'Paciente cadastrado',
        description: 'O paciente foi adicionado com sucesso.',
      })
      onNext()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar paciente',
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PawPrint className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-semibold">Primeiro Paciente</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastre o primeiro paciente para começar a usar o sistema
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="patientName">Nome do Animal</Label>
          <div className="relative">
            <PawPrint className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input
              id="patientName"
              value={formData.patientName}
              onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
              placeholder="Rex"
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="species">Espécie</Label>
            <select
              id="species"
              value={formData.species}
              onChange={(e) => setFormData({ ...formData, species: e.target.value })}
              className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              required
            >
              <option value="Cao">Cão</option>
              <option value="Gato">Gato</option>
              <option value="Ave">Ave</option>
              <option value="Roedor">Roedor</option>
              <option value="Reptil">Réptil</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="breed">Raça</Label>
            <Input
              id="breed"
              value={formData.breed}
              onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              placeholder="Vira-lata"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />
                  {formData.birthDate ? format(new Date(formData.birthDate), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.birthDate ? new Date(formData.birthDate) : undefined}
                  onSelect={(date) => {
                    setFormData({ ...formData, birthDate: date ? date.toISOString().split('T')[0] : '' })
                    setIsCalendarOpen(false)
                  }}
                  initialFocus
                  locale={ptBRDayPicker}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="weightKg">Peso (kg)</Label>
            <Input
              id="weightKg"
              type="number"
              step="0.1"
              value={formData.weightKg}
              onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
              placeholder="5.0"
            />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-medium mb-3">Dados do Tutor</h3>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="tutorName">Nome do Tutor</Label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              <Input
                id="tutorName"
                value={formData.tutorName}
                onChange={(e) => setFormData({ ...formData, tutorName: e.target.value })}
                placeholder="Maria Silva"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-3">
            <Label htmlFor="tutorPhone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              <MaskedInput
                id="tutorPhone"
                mask={masks.phone}
                value={formData.tutorPhone}
                onChange={(value) => setFormData({ ...formData, tutorPhone: value })}
                placeholder="(11) 99999-9999"
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-3">
            <Label htmlFor="tutorEmail">Email (opcional)</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
              <Input
                id="tutorEmail"
                type="email"
                value={formData.tutorEmail}
                onChange={(e) => setFormData({ ...formData, tutorEmail: e.target.value })}
                placeholder="maria@email.com"
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onSkip}>
          Pular
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Concluir'}
        </Button>
      </div>
    </form>
  )
}
