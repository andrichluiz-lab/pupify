'use client'

import { useState } from 'react'
import { Building2, Phone, Mail, MapPin, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MaskedInput, masks } from '@/components/ui/masked-input'
import { updateTenant } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { getErrorMessage } from '@/lib/api-client'

interface StepClinicProfileProps {
  onNext: () => void
  onSkip: () => void
}

export function StepClinicProfile({ onNext, onSkip }: StepClinicProfileProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    cnpj: '',
    phone: '',
    email: '',
    address: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await updateTenant({
        cnpj: formData.cnpj || null,
        phone: formData.phone || null,
        email: formData.email || null,
        address: formData.address || null,
      })
      onNext()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar dados da clínica',
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
          <Building2 className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <h2 className="text-xl font-semibold">Perfil da Clínica</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure as informações básicas da sua clínica
        </p>
      </div>

      <div className="grid gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <MaskedInput
              id="cnpj"
              mask={masks.cnpj}
              value={formData.cnpj}
              onChange={(value) => setFormData({ ...formData, cnpj: value })}
              placeholder="00.000.000/0000-00"
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Telefone</Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <MaskedInput
              id="phone"
              mask={masks.phone}
              value={formData.phone}
              onChange={(value) => setFormData({ ...formData, phone: value })}
              placeholder="(11) 99999-9999"
              className="pl-10"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.75} />
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="contato@clinica.com"
              className="pl-10"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="address">Endereço</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, bairro, cidade - UF"
              className="pl-10 min-h-[80px]"
            />
          </div>
        </div>
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
