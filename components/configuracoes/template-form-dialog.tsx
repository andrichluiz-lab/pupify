"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { useToast } from "@/hooks/use-toast"
import {
  createTemplate,
  updateTemplate,
} from "@/lib/api"
import type { DocumentTemplate, TemplateType } from "@/lib/types"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingTemplate?: DocumentTemplate | null
  onSaved?: () => void
}

export function TemplateFormDialog({ open, onOpenChange, editingTemplate, onSaved }: Props) {
  const { toast } = useToast()
  const [type, setType] = useState<TemplateType>("receita")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const [variables, setVariables] = useState<string[]>([])
  const [variableInput, setVariableInput] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingTemplate) {
      setType(editingTemplate.type)
      setName(editingTemplate.name)
      setDescription(editingTemplate.description || "")
      setContent(editingTemplate.content)
      setVariables(editingTemplate.variables || [])
      setIsActive(editingTemplate.isActive)
    } else {
      setType("receita")
      setName("")
      setDescription("")
      setContent("")
      setVariables([])
      setIsActive(true)
    }
  }, [editingTemplate, open])

  const handleAddVariable = () => {
    if (!variableInput.trim()) return
    const varName = variableInput.trim().startsWith("{{") 
      ? variableInput.trim() 
      : `{{${variableInput.trim()}}}`
    if (!variables.includes(varName)) {
      setVariables([...variables, varName])
    }
    setVariableInput("")
  }

  const handleRemoveVariable = (variable: string) => {
    setVariables(variables.filter((v) => v !== variable))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: "destructive", title: "Informe o nome do template" })
      return
    }
    if (!content.trim()) {
      toast({ variant: "destructive", title: "Informe o conteúdo do template" })
      return
    }
    
    setSaving(true)
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, {
          type,
          name,
          description,
          content,
          variables,
          isActive,
        })
        toast({ title: "Template atualizado" })
      } else {
        await createTemplate({
          type,
          name,
          description,
          content,
          variables,
          isActive,
        })
        toast({ title: "Template criado" })
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      console.error("Save template error:", error)
      toast({ variant: "destructive", title: "Erro ao salvar template" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? "Editar Template" : "Novo Template"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="template-type">Tipo</Label>
            <select
              id="template-type"
              value={type}
              onChange={(e) => setType(e.target.value as TemplateType)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="receita">Receita</option>
              <option value="exame">Exame</option>
              <option value="termo">Termo</option>
              <option value="atestado">Atestado</option>
              <option value="declaracao">Declaração</option>
              <option value="prontuario_modelo">Prontuário Modelo</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-name">Nome</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Receita Padrão"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-description">Descrição</Label>
            <Input
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do template"
            />
          </div>

          <div className="grid gap-2">
            <Label>Variáveis</Label>
            <div className="flex gap-2">
              <Input
                value={variableInput}
                onChange={(e) => setVariableInput(e.target.value)}
                placeholder="Ex: paciente ou {{paciente}}"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddVariable()
                  }
                }}
              />
              <Button size="sm" onClick={handleAddVariable} className="gap-1.5">
                Adicionar
              </Button>
            </div>
            {variables.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {variables.map((variable) => (
                  <span
                    key={variable}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
                  >
                    {variable}
                    <button
                      onClick={() => handleRemoveVariable(variable)}
                      className="hover:text-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-content">Conteúdo</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Use {{variavel}} para inserir dados dinâmicos. Ex: {{paciente}}, {{tutor}}, {{especie}}, {{raca}}"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="template-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="template-active" className="cursor-pointer">
              Template ativo
            </Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
