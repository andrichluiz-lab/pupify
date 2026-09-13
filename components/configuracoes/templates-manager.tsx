"use client"

import { useEffect, useState } from "react"
import { Plus, Pencil, Trash2, FileText, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  listTemplates,
  deleteTemplate,
} from "@/lib/api"
import type { DocumentTemplate, TemplateType } from "@/lib/types"
import { TemplateFormDialog } from "./template-form-dialog"

const TYPE_LABELS: Record<TemplateType, string> = {
  receita: "Receita",
  exame: "Exame",
  termo: "Termo",
  atestado: "Atestado",
  declaracao: "Declaração",
  prontuario_modelo: "Prontuário Modelo",
}

const TYPE_COLORS: Record<TemplateType, string> = {
  receita: "bg-blue-500/10 text-blue-700",
  exame: "bg-purple-500/10 text-purple-700",
  termo: "bg-amber-500/10 text-amber-700",
  atestado: "bg-green-500/10 text-green-700",
  declaracao: "bg-cyan-500/10 text-cyan-700",
  prontuario_modelo: "bg-pink-500/10 text-pink-700",
}

export function TemplatesManager() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [filteredTemplates, setFilteredTemplates] = useState<DocumentTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<TemplateType | "all">("all")
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<DocumentTemplate | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null)

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await listTemplates()
      setTemplates(data)
      setFilteredTemplates(data)
    } catch (error) {
      console.error("Error loading templates:", error)
      toast({ variant: "destructive", title: "Erro ao carregar templates" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  useEffect(() => {
    let filtered = templates

    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.type === typeFilter)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.type.toLowerCase().includes(query)
      )
    }

    setFilteredTemplates(filtered)
  }, [searchQuery, typeFilter, templates])

  const handleCreate = () => {
    setEditingTemplate(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (template: DocumentTemplate) => {
    setEditingTemplate(template)
    setFormDialogOpen(true)
  }

  const handleDelete = (template: DocumentTemplate) => {
    setTemplateToDelete(template)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!templateToDelete) return

    try {
      await deleteTemplate(templateToDelete.id)
      toast({ title: "Template excluído" })
      setDeleteDialogOpen(false)
      loadTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      toast({ variant: "destructive", title: "Erro ao excluir template" })
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TemplateType | "all")}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="all">Todos os tipos</option>
              <option value="receita">Receita</option>
              <option value="exame">Exame</option>
              <option value="termo">Termo</option>
              <option value="atestado">Atestado</option>
              <option value="declaracao">Declaração</option>
              <option value="prontuario_modelo">Prontuário Modelo</option>
            </select>
          </div>
          <Button onClick={handleCreate} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Novo Template
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {searchQuery || typeFilter !== "all"
                ? "Nenhum template encontrado"
                : "Nenhum template cadastrado"}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${TYPE_COLORS[template.type]}`}
                      >
                        {TYPE_LABELS[template.type]}
                      </span>
                      {!template.isActive && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Inativo
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium">{template.name}</h3>
                    {template.description && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    )}
                    {template.variables && template.variables.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.variables.slice(0, 3).map((variable) => (
                          <span
                            key={variable}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                          >
                            {variable}
                          </span>
                        ))}
                        {template.variables.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{template.variables.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(template)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(template)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <TemplateFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        editingTemplate={editingTemplate}
        onSaved={loadTemplates}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir template</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o template "{templateToDelete?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
