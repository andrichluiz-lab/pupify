"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, AlertCircle } from "lucide-react"

interface Diagnosis {
  id: string
  name: string
  description?: string
  isPrimary: boolean
  icd10?: string
}

interface DiagnosisEditorProps {
  diagnoses: Diagnosis[]
  onChange: (diagnoses: Diagnosis[]) => void
}

export function DiagnosisEditor({ diagnoses, onChange }: DiagnosisEditorProps) {
  const [newName, setNewName] = useState("")
  const [newDescription, setNewDescription] = useState("")
  const [newIcd10, setNewIcd10] = useState("")
  const [isPrimary, setIsPrimary] = useState(false)

  const handleAddDiagnosis = () => {
    if (!newName.trim()) return

    const diagnosis: Diagnosis = {
      id: crypto.randomUUID(),
      name: newName,
      description: newDescription || undefined,
      isPrimary: isPrimary,
      icd10: newIcd10 || undefined,
    }

    onChange([...diagnoses, diagnosis])
    setNewName("")
    setNewDescription("")
    setNewIcd10("")
    setIsPrimary(false)
  }

  const handleDeleteDiagnosis = (id: string) => {
    onChange(diagnoses.filter((d) => d.id !== id))
  }

  const handleTogglePrimary = (id: string) => {
    onChange(
      diagnoses.map((d) =>
        d.id === id ? { ...d, isPrimary: !d.isPrimary } : { ...d, isPrimary: false }
      )
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Diagnósticos</h3>
        <span className="text-xs text-muted-foreground">{diagnoses.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {diagnoses.map((diagnosis) => (
          <div
            key={diagnosis.id}
            className="flex items-start gap-3 rounded-lg border border-border bg-muted/50 px-3 py-3"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {diagnosis.isPrimary && (
                  <AlertCircle className="h-3.5 w-3.5 text-primary" strokeWidth={1.75} />
                )}
                <p className="text-sm font-medium">{diagnosis.name}</p>
                {diagnosis.icd10 && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    CID-10: {diagnosis.icd10}
                  </span>
                )}
              </div>
              {diagnosis.description && (
                <p className="mt-1 text-xs text-muted-foreground">{diagnosis.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleTogglePrimary(diagnosis.id)}
              >
                {diagnosis.isPrimary ? "Primário" : "Marcar como primário"}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDeleteDiagnosis(diagnosis.id)}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do diagnóstico"
            className="flex-1"
          />
          <Input
            value={newIcd10}
            onChange={(e) => setNewIcd10(e.target.value)}
            placeholder="CID-10 (opcional)"
            className="w-24"
          />
        </div>
        <Textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Descrição (opcional)"
          className="min-h-[60px] resize-none"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Marcar como diagnóstico primário
          </label>
          <Button
            size="sm"
            className="h-8"
            onClick={handleAddDiagnosis}
            disabled={!newName.trim()}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.75} />
            Adicionar
          </Button>
        </div>
      </div>
    </div>
  )
}
