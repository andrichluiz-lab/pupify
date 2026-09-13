'use client'

import { useState } from 'react'
import { Stethoscope, User, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createTeamMember } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/api-client'

interface StepVeterinarianProps {
  onNext: () => void
  onSkip: () => void
}

export function StepVeterinarian({ onNext, onSkip }: StepVeterinarianProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    crmv: '',
    specialty: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordFocused, setIsPasswordFocused] = useState(false)

  const passwordRequirements = [
    { id: 'length', label: 'Mínimo 8 caracteres', check: (pwd: string) => pwd.length >= 8 },
    { id: 'uppercase', label: 'Uma letra maiúscula', check: (pwd: string) => /[A-Z]/.test(pwd) },
    { id: 'lowercase', label: 'Uma letra minúscula', check: (pwd: string) => /[a-z]/.test(pwd) },
    { id: 'number', label: 'Um número', check: (pwd: string) => /[0-9]/.test(pwd) },
    { id: 'special', label: 'Um caractere especial', check: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await createTeamMember({
        ...formData,
        role: 'VETERINARIAN',
      })
      toast({
        title: 'Veterinário adicionado',
        description: 'O veterinário foi cadastrado com sucesso.',
      })
      onNext()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao adicionar veterinário',
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
          <Stethoscope className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-semibold">Primeiro Veterinário</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Adicione o primeiro veterinário da equipe
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nome Completo</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Dr. João Silva"
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="veterinario@clinica.com"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">Senha Temporária</Label>
          <div className="relative">
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              placeholder="Mínimo 8 caracteres"
              required
              minLength={8}
            />
            {isPasswordFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 z-50 rounded-lg border border-border bg-background p-3 shadow-lg">
                <p className="text-xs font-medium text-foreground mb-2">A senha deve conter:</p>
                <ul className="space-y-1.5">
                  {passwordRequirements.map((req) => {
                    const isValid = req.check(formData.password)
                    return (
                      <li key={req.id} className="flex items-center gap-2 text-xs">
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          isValid ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {isValid && <Check className="h-2.5 w-2.5" strokeWidth={2} />}
                        </div>
                        <span className={isValid ? 'text-foreground' : 'text-muted-foreground'}>
                          {req.label}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="crmv">CRMV</Label>
          <Input
            id="crmv"
            value={formData.crmv}
            onChange={(e) => setFormData({ ...formData, crmv: e.target.value })}
            placeholder="12345-SP"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="specialty">Especialidade (opcional)</Label>
          <Input
            id="specialty"
            value={formData.specialty}
            onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
            placeholder="Clínica geral, Cirurgia, etc."
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onSkip}>
          Pular
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Salvando...' : 'Próximo'}
        </Button>
      </div>
    </form>
  )
}
