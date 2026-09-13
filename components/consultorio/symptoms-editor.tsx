"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"

interface Symptom {
  id: string
  name: string
  severity: "leve" | "moderado" | "grave"
  duration?: string
}

interface SymptomsEditorProps {
  symptoms: Symptom[]
  onChange: (symptoms: Symptom[]) => void
}

export function SymptomsEditor({ symptoms, onChange }: SymptomsEditorProps) {
  const [newSymptom, setNewSymptom] = useState("")
  const [newSeverity, setNewSeverity] = useState<"leve" | "moderado" | "grave">("moderado")
  const [newDuration, setNewDuration] = useState("")

  const handleAddSymptom = () => {
    if (!newSymptom.trim()) return

    const symptom: Symptom = {
      id: crypto.randomUUID(),
      name: newSymptom,
      severity: newSeverity,
      duration: newDuration || undefined,
    }

    onChange([...symptoms, symptom])
    setNewSymptom("")
    setNewSeverity("moderado")
    setNewDuration("")
  }

  const handleDeleteSymptom = (id: string) => {
    onChange(symptoms.filter((s) => s.id !== id))
  }

  const severityColors = {
    leve: "bg-green-500/10 text-green-700",
    moderado: "bg-amber-500/10 text-amber-700",
    grave: "bg-red-500/10 text-red-700",
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Sintomas</h3>
        <span className="text-xs text-muted-foreground">{symptoms.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {symptoms.map((symptom) => (
          <div
            key={symptom.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2"
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{symptom.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${severityColors[symptom.severity]}`}>
                  {symptom.severity}
                </span>
                {symptom.duration && (
                  <span className="text-xs text-muted-foreground">
                    · {symptom.duration}
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleDeleteSymptom(symptom.id)}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={newSymptom}
          onChange={(e) => setNewSymptom(e.target.value)}
          placeholder="Nome do sintoma"
          className="flex-1"
        />
        <select
          value={newSeverity}
          onChange={(e) => setNewSeverity(e.target.value as "leve" | "moderado" | "grave")}
          className="h-9 rounded-md border border-border bg-background px-3 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="leve">Leve</option>
          <option value="moderado">Moderado</option>
          <option value="grave">Grave</option>
        </select>
        <Input
          value={newDuration}
          onChange={(e) => setNewDuration(e.target.value)}
          placeholder="Duração (opcional)"
          className="w-32"
        />
        <Button
          size="icon"
          className="h-9 w-9"
          onClick={handleAddSymptom}
          disabled={!newSymptom.trim()}
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  )
}
