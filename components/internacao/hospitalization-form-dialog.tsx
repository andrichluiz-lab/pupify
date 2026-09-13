"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Combobox } from "@/components/ui/combobox"
import type { Hospitalization, Patient, Veterinarian } from "@/lib/types"
import { listPatients, listVeterinarians } from "@/lib/api"

interface HospitalizationFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Hospitalization>) => Promise<void>
}

const STATUS_OPTIONS = [
  { value: "estavel", label: "Estável" },
  { value: "observacao", label: "Observação" },
  { value: "critico", label: "Crítico" },
  { value: "recuperacao", label: "Recuperação" },
] as const

export function HospitalizationFormDialog({
  open,
  onOpenChange,
  onSave,
}: HospitalizationFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Hospitalization>>({
    status: "estavel",
    admittedAt: "",
    reason: "",
    kennel: "",
    painLevel: 0,
    dietNotes: "",
    dailyRate: undefined,
  })

  const [patients, setPatients] = useState<Patient[]>([])
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [patientsData, vetsData] = await Promise.all([
        listPatients(),
        listVeterinarians(),
      ])
      setPatients(patientsData)
      setVeterinarians(vetsData)
    } catch (err) {
      console.error("Error loading data:", err)
      setError("Erro ao carregar dados. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.patientId) {
      setError("Selecione um paciente")
      return
    }

    if (!formData.veterinarianId) {
      setError("Selecione um veterinário")
      return
    }

    if (!formData.reason) {
      setError("O motivo da internação é obrigatório")
      return
    }

    if (!formData.kennel) {
      setError("A baia é obrigatória")
      return
    }

    if (!formData.admittedAt) {
      setError("A data de admissão é obrigatória")
      return
    }

    const selectedPatient = patients.find((p) => p.id === formData.patientId)
    if (!selectedPatient) {
      setError("Paciente não encontrado")
      return
    }

    const submissionData: Partial<Hospitalization> = {
      ...formData,
      admittedAt: new Date(formData.admittedAt).toISOString(),
    }

    setIsSubmitting(true)
    try {
      await onSave(submissionData)
      onOpenChange(false)
      setError(null)
      setFormData({
        status: "estavel",
        admittedAt: "",
        reason: "",
        kennel: "",
        painLevel: 0,
        dietNotes: "",
        dailyRate: undefined,
      })
    } catch (err) {
      console.error("Error saving hospitalization:", err)
      setError("Erro ao salvar internação. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Internação</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para registrar uma internação.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Carregando...</div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="patientId">Paciente</Label>
                <Combobox
                  options={patients.map((p) => ({ value: p.id, label: `${p.name} (${p.species})` }))}
                  value={formData.patientId}
                  onChange={(value) => setFormData({ ...formData, patientId: value })}
                  placeholder="Buscar paciente..."
                  emptyMessage="Nenhum paciente encontrado"
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="veterinarianId">Veterinário</Label>
                <Combobox
                  options={veterinarians.map((v) => ({
                    value: v.id,
                    label: v.specialty ? `${v.name} (${v.specialty})` : v.name,
                  }))}
                  value={formData.veterinarianId}
                  onChange={(value) => setFormData({ ...formData, veterinarianId: value })}
                  placeholder="Buscar veterinário..."
                  emptyMessage="Nenhum veterinário encontrado"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: "estavel" | "observacao" | "critico" | "recuperacao") =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor="painLevel">Nível de Dor (0-5)</Label>
                  <Input
                    id="painLevel"
                    type="number"
                    min={0}
                    max={5}
                    value={formData.painLevel ?? 0}
                    onChange={(e) => setFormData({ ...formData, painLevel: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="kennel">Baia</Label>
                <Input
                  id="kennel"
                  value={formData.kennel}
                  onChange={(e) => setFormData({ ...formData, kennel: e.target.value })}
                  placeholder="Ex: A1, B2..."
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="admittedAt">Data de Admissão</Label>
                <Input
                  id="admittedAt"
                  type="datetime-local"
                  value={formData.admittedAt}
                  onChange={(e) => setFormData({ ...formData, admittedAt: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="reason">Motivo da Internação</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Descreva o motivo da internação..."
                  rows={3}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="dietNotes">Notas de Dieta (opcional)</Label>
                <Textarea
                  id="dietNotes"
                  value={formData.dietNotes}
                  onChange={(e) => setFormData({ ...formData, dietNotes: e.target.value })}
                  placeholder="Restrições alimentares, horários, etc..."
                  rows={2}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="dailyRate">Valor da diária (R$)</Label>
                <Input
                  id="dailyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.dailyRate ?? ""}
                  onChange={(e) =>
                    setFormData({ ...formData, dailyRate: e.target.value ? parseFloat(e.target.value) : undefined })
                  }
                  placeholder="Ex: 150,00"
                />
                {formData.dailyRate && formData.admittedAt && (
                  <p className="text-xs text-muted-foreground">
                    {(() => {
                      const days = Math.max(
                        1,
                        Math.ceil((Date.now() - new Date(formData.admittedAt).getTime()) / 86400000)
                      )
                      return `Estimativa: ${days} dia(s) × R$ ${formData.dailyRate.toFixed(2)} = R$ ${(days * formData.dailyRate).toFixed(2)}`
                    })()}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Internar"}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
