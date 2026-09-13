"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface VitalSignsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: {
    temperature?: number
    heartRate?: number
    respiratoryRate?: number
    bloodPressure?: string
    oxygenSaturation?: number
  }) => Promise<void>
}

export function VitalSignsDialog({
  open,
  onOpenChange,
  onSave,
}: VitalSignsDialogProps) {
  const [formData, setFormData] = useState({
    temperature: "",
    heartRate: "",
    respiratoryRate: "",
    bloodPressure: "",
    oxygenSaturation: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const data = {
      temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
      heartRate: formData.heartRate ? parseInt(formData.heartRate) : undefined,
      respiratoryRate: formData.respiratoryRate ? parseInt(formData.respiratoryRate) : undefined,
      bloodPressure: formData.bloodPressure || undefined,
      oxygenSaturation: formData.oxygenSaturation ? parseInt(formData.oxygenSaturation) : undefined,
    }

    setIsSubmitting(true)
    try {
      await onSave(data)
      onOpenChange(false)
      setError(null)
      setFormData({
        temperature: "",
        heartRate: "",
        respiratoryRate: "",
        bloodPressure: "",
        oxygenSaturation: "",
      })
    } catch (err) {
      console.error("Error saving vital signs:", err)
      setError("Erro ao salvar sinais vitais. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Sinais Vitais</DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para registrar os sinais vitais do paciente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="temperature">Temperatura (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                placeholder="38.5"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="heartRate">FC (bpm)</Label>
              <Input
                id="heartRate"
                type="number"
                value={formData.heartRate}
                onChange={(e) => setFormData({ ...formData, heartRate: e.target.value })}
                placeholder="120"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="respiratoryRate">FR (rpm)</Label>
              <Input
                id="respiratoryRate"
                type="number"
                value={formData.respiratoryRate}
                onChange={(e) => setFormData({ ...formData, respiratoryRate: e.target.value })}
                placeholder="30"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="bloodPressure">PA</Label>
              <Input
                id="bloodPressure"
                value={formData.bloodPressure}
                onChange={(e) => setFormData({ ...formData, bloodPressure: e.target.value })}
                placeholder="120/80"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="oxygenSaturation">SpO₂ (%)</Label>
            <Input
              id="oxygenSaturation"
              type="number"
              min={0}
              max={100}
              value={formData.oxygenSaturation}
              onChange={(e) => setFormData({ ...formData, oxygenSaturation: e.target.value })}
              placeholder="98"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
