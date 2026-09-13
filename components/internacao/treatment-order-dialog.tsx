"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const ROUTE_OPTIONS = [
  { value: "IV", label: "Intravenosa (IV)" },
  { value: "IM", label: "Intramuscular (IM)" },
  { value: "SC", label: "Subcutânea (SC)" },
  { value: "VO", label: "Oral (VO)" },
  { value: "TOP", label: "Tópica" },
] as const

interface TreatmentOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    time: string
    drug: string
    dose: string
    route: string
  }) => Promise<void>
}

export function TreatmentOrderDialog({
  open,
  onOpenChange,
  onSave,
}: TreatmentOrderDialogProps) {
  const [formData, setFormData] = useState({
    time: "",
    drug: "",
    dose: "",
    route: "VO" as "IV" | "IM" | "SC" | "VO" | "TOP",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.time) {
      setError("O horário é obrigatório")
      return
    }

    if (!formData.drug) {
      setError("O medicamento é obrigatório")
      return
    }

    if (!formData.dose) {
      setError("A dose é obrigatória")
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(formData)
      onOpenChange(false)
      setError(null)
      setFormData({
        time: "",
        drug: "",
        dose: "",
        route: "VO",
      })
    } catch (err) {
      console.error("Error saving treatment order:", err)
      setError("Erro ao salvar prescrição. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Prescrição</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para adicionar uma prescrição.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="time">Horário</Label>
            <TimePicker
              value={formData.time}
              onChange={(value) => setFormData({ ...formData, time: value })}
              placeholder="Selecione o horário"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="drug">Medicamento</Label>
            <Input
              id="drug"
              value={formData.drug}
              onChange={(e) => setFormData({ ...formData, drug: e.target.value })}
              placeholder="Ex: Dipirona, Meloxicam..."
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="dose">Dose</Label>
            <Input
              id="dose"
              value={formData.dose}
              onChange={(e) => setFormData({ ...formData, dose: e.target.value })}
              placeholder="Ex: 10mg, 5ml..."
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="route">Via de Administração</Label>
            <Select
              value={formData.route}
              onValueChange={(value: "IV" | "IM" | "SC" | "VO" | "TOP") =>
                setFormData({ ...formData, route: value })
              }
            >
              <SelectTrigger id="route">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROUTE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
