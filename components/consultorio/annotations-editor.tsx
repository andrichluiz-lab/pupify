"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

interface Annotation {
  id: string
  content: string
  timestamp: Date
}

interface AnnotationsEditorProps {
  annotations: Annotation[]
  onChange: (annotations: Annotation[]) => void
}

export function AnnotationsEditor({ annotations, onChange }: AnnotationsEditorProps) {
  const [newAnnotation, setNewAnnotation] = useState("")

  const handleAddAnnotation = () => {
    if (!newAnnotation.trim()) return

    const annotation: Annotation = {
      id: crypto.randomUUID(),
      content: newAnnotation,
      timestamp: new Date(),
    }

    onChange([...annotations, annotation])
    setNewAnnotation("")
  }

  const handleDeleteAnnotation = (id: string) => {
    onChange(annotations.filter((a) => a.id !== id))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Anotações</h3>
        <span className="text-xs text-muted-foreground">{annotations.length}</span>
      </div>

      <div className="flex flex-col gap-2">
        {annotations.map((annotation) => (
          <div
            key={annotation.id}
            className="flex gap-2 rounded-lg border border-border bg-muted/50 p-3"
          >
            <div className="flex-1">
              <p className="text-sm">{annotation.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(annotation.timestamp).toLocaleString("pt-BR")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleDeleteAnnotation(annotation.id)}
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={newAnnotation}
          onChange={(e) => setNewAnnotation(e.target.value)}
          placeholder="Adicionar uma anotação..."
          className="min-h-[60px] resize-none"
        />
        <Button
          size="icon"
          className="h-9 w-9"
          onClick={handleAddAnnotation}
          disabled={!newAnnotation.trim()}
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  )
}
