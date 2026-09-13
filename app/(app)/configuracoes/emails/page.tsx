"use client"

import { useEffect, useState } from "react"
import { redirect } from "next/navigation"
import { Plus, Mail, CheckCircle2, XCircle, Clock, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate, type EmailTemplate } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

const EMAIL_TYPES = [
  { value: "appointment_confirmation", label: "Confirmação de Agendamento" },
  { value: "appointment_reminder", label: "Lembrete de Agendamento" },
  { value: "password_reset", label: "Recuperação de Senha" },
  { value: "hospitalization_update", label: "Atualização de Internação" },
  { value: "financial_report", label: "Relatório Financeiro" },
  { value: "surgery_reminder", label: "Lembrete de Cirurgia" },
  { value: "custom", label: "Personalizado" },
]

const VARIABLES_DOC = {
  appointment_confirmation: ["patientName", "tutorName", "appointmentDate", "appointmentTime", "appointmentType", "clinicName"],
  appointment_reminder: ["patientName", "tutorName", "appointmentDate", "appointmentTime", "clinicName"],
  password_reset: ["userName", "resetLink", "clinicName"],
  hospitalization_update: ["patientName", "tutorName", "status", "veterinarianName", "clinicName"],
  financial_report: ["clinicName", "period", "totalRevenue", "totalExpenses"],
  surgery_reminder: ["patientName", "tutorName", "surgeryDate", "surgeryTime", "procedure", "clinicName"],
  custom: [],
}

export default function EmailsPage() {
  const { isAuthenticated, role } = useAuth()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    body: "",
    type: "custom" as EmailTemplate["type"],
    active: true,
    variables: [] as string[],
  })

  useEffect(() => {
    if (!isAuthenticated) {
      redirect("/login")
    }
    loadTemplates()
  }, [isAuthenticated])

  const loadTemplates = async () => {
    try {
      const data = await listEmailTemplates()
      setTemplates(data)
    } catch (error) {
      console.error("Failed to load templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingTemplate(null)
    setFormData({
      name: "",
      subject: "",
      body: "",
      type: "custom",
      active: true,
      variables: [],
    })
    setDialogOpen(true)
  }

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body,
      type: template.type,
      active: template.active,
      variables: template.variables || [],
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return
    
    try {
      await deleteEmailTemplate(id)
      loadTemplates()
    } catch (error) {
      console.error("Failed to delete template:", error)
      alert("Erro ao excluir template")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingTemplate) {
        await updateEmailTemplate(editingTemplate.id, formData)
      } else {
        await createEmailTemplate(formData)
      }
      setDialogOpen(false)
      loadTemplates()
    } catch (error) {
      console.error("Failed to save template:", error)
      alert("Erro ao salvar template")
    }
  }

  const getTypeLabel = (type: EmailTemplate["type"]) => {
    return EMAIL_TYPES.find((t) => t.value === type)?.label || type
  }

  if (!isAuthenticated || (role !== "CLINIC_ADMIN" && role !== "SUPER_ADMIN")) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">Emails</h1>
            <p className="truncate text-xs text-muted-foreground">Configure templates de email</p>
          </div>
        </div>
        <Button size="sm" className="h-8 gap-1.5" onClick={handleCreate}>
          <Plus className="h-3.5 w-3.5" />
          Novo Template
        </Button>
      </div>

      <main className="flex flex-col gap-6 p-4 md:p-6">
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
              <h2 className="text-sm font-medium">Templates de Email</h2>
            </div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
              {templates.length}
            </span>
          </div>

          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center">
              <Mail className="mx-auto h-10 w-10 text-muted-foreground" strokeWidth={1.75} />
              <p className="mt-2 text-sm text-muted-foreground">
                Nenhum template de email configurado
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Crie seu primeiro template para começar
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {templates.map((template) => (
                <li key={template.id} className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{template.name}</span>
                      {template.active ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" strokeWidth={1.75} />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {getTypeLabel(template.type)}
                    </span>
                    <p className="truncate text-xs text-muted-foreground">
                      {template.subject}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(template)}
                    >
                      <Edit className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(template.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
              <h2 className="text-sm font-medium">Variáveis Disponíveis</h2>
            </div>
          </div>
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-3">
              Use estas variáveis nos seus templates no formato <code className="bg-muted px-1 py-0.5 rounded">{'{{variavel}}'}</code>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {EMAIL_TYPES.map((type) => (
                <div key={type.value} className="rounded-lg border border-border bg-muted/30 p-3">
                  <h3 className="text-xs font-medium mb-2">{type.label}</h3>
                  <ul className="space-y-1">
                    {VARIABLES_DOC[type.value as keyof typeof VARIABLES_DOC].map((variable) => (
                      <li key={variable} className="text-[11px] font-mono text-muted-foreground">
                        {`{{${variable}}}`}
                      </li>
                    ))}
                    {VARIABLES_DOC[type.value as keyof typeof VARIABLES_DOC].length === 0 && (
                      <li className="text-[11px] text-muted-foreground">Nenhuma variável</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Editar Template" : "Novo Template"}
            </DialogTitle>
            <DialogDescription>
              Configure seu template de email
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4 py-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Confirmação de Consulta"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as EmailTemplate["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMAIL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Confirmação de agendamento"
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="body">Corpo do Email (HTML)</Label>
                <Textarea
                  id="body"
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  placeholder="<h1>Olá {{tutorName}}</h1><p>Seu agendamento para {{patientName}} está confirmado.</p>"
                  className="h-64 font-mono text-xs resize-none"
                  required
                />
                {VARIABLES_DOC[formData.type]?.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Variáveis disponíveis: {VARIABLES_DOC[formData.type]?.join(", ")}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="h-4 w-4 rounded border-border"
                />
                <Label htmlFor="active" className="text-sm">
                  Template ativo
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingTemplate ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
