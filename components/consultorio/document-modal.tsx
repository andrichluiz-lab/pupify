"use client"

import { useEffect, useState } from "react"
import { Plus, Loader2 } from "lucide-react"
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
import { useAuth } from "@/lib/auth-context"
import {
  listTemplatesByType,
  createConsultationDocument,
  updateConsultationDocument,
} from "@/lib/api"
import type { DocumentTemplate, Patient, TemplateType, ConsultationDocument } from "@/lib/types"
import type { Tenant, Veterinarian } from "@/lib/auth-context"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  draftId: string
  patient: Patient | null
  onSaved?: () => void
  editingDoc?: ConsultationDocument | null
}

const RECEITA_HEADER_HTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border-bottom:1px solid #ddd;padding-bottom:12px;margin-bottom:16px;">
    <div><strong>Clínica Veterinária</strong></div>
    <div style="color:#0a78ff;font-weight:600;">CRMV: ____</div>
  </div>
`

function calculateAge(birthDate: string): string {
  const birth = new Date(birthDate)
  const now = new Date()
  const years = now.getFullYear() - birth.getFullYear()
  const months = now.getMonth() - birth.getMonth()

  if (months < 0 || (months === 0 && now.getDate() < birth.getDate())) {
    return `${years - 1} anos`
  }

  if (years === 0) {
    const monthsOld = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    return `${monthsOld} meses`
  }

  return `${years} anos`
}

function replaceTemplateVariables(content: string, patient: Patient | null, tenant: Tenant | null, veterinarian: Veterinarian | null): string {
  if (!patient) return content

  const today = format(new Date(), "dd 'de' MMMM yyyy", { locale: ptBR })

  return content
    .replaceAll("{{clinica.nome}}", tenant?.name ?? "")
    .replaceAll("{{clinica.endereco}}", tenant?.address ?? "")
    .replaceAll("{{clinica.cnpj}}", tenant?.cnpj ?? "")
    .replaceAll("{{clinica.telefone}}", tenant?.phone ?? "")
    .replaceAll("{{clinica.email}}", tenant?.email ?? "")
    .replaceAll("{{clinica.crmv}}", veterinarian?.crmv ?? "")
    .replaceAll("{{veterinario.crmv}}", veterinarian?.crmv ?? "")
    .replaceAll("{{veterinario.nome}}", veterinarian?.name ?? "")
    .replaceAll("{{paciente.nome}}", patient.name ?? "")
    .replaceAll("{{paciente}}", patient.name ?? "")
    .replaceAll("{{paciente.especie}}", patient.species ?? "")
    .replaceAll("{{especie}}", patient.species ?? "")
    .replaceAll("{{paciente.raca}}", patient.breed ?? "")
    .replaceAll("{{raca}}", patient.breed ?? "")
    .replaceAll("{{paciente.idade}}", calculateAge(patient.birthDate))
    .replaceAll("{{paciente.peso}}", patient.weightKg?.toString() ?? "")
    .replaceAll("{{paciente.sexo}}", patient.sex === "M" ? "Macho" : "Fêmea")
    .replaceAll("{{tutor.nome}}", patient.tutor?.name ?? "")
    .replaceAll("{{tutor}}", patient.tutor?.name ?? "")
    .replaceAll("{{tutor.endereco}}", patient.tutor?.address ?? "")
    .replaceAll("{{tutor.telefone}}", patient.tutor?.phone ?? "")
    .replaceAll("{{tutor.email}}", patient.tutor?.email ?? "")
    .replaceAll("{{data}}", today)
    .replaceAll("{{data_atual}}", today)
}

function patientBlockHtml(p: Patient | null): string {
  if (!p) return ""
  return `
    <p><strong>DADOS DO ANIMAL:</strong></p>
    <p>
      <strong>Paciente:</strong> ${p.name}
      &nbsp;&nbsp; <strong>Espécie:</strong> ${p.species}
      &nbsp;&nbsp; <strong>Raça:</strong> ${p.breed}
      &nbsp;&nbsp; <strong>Sexo:</strong> ${p.sex === "M" ? "Macho" : "Fêmea"}
    </p>
    <p><strong>DADOS DO PROPRIETÁRIO:</strong></p>
    <p><strong>Nome:</strong> ${p.tutor?.name ?? "—"}</p>
    <hr />
  `
}

export function DocumentModal({ open, onOpenChange, draftId, patient, onSaved, editingDoc }: Props) {
  const { toast } = useToast()
  const { tenant, veterinarian } = useAuth()
  const [type, setType] = useState<TemplateType>("receita")
  const [title, setTitle] = useState("Receita Padrão")
  const [includeHeader, setIncludeHeader] = useState(true)
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [templateId, setTemplateId] = useState<string>("")
  const [content, setContent] = useState<string>("")
  const [saving, setSaving] = useState(false)

  // Receita inputs
  const [usoTipo, setUsoTipo] = useState("")
  const [medicamento, setMedicamento] = useState("")
  const [formaQtd, setFormaQtd] = useState("")
  const [posologia, setPosologia] = useState("")
  const [farmacia, setFarmacia] = useState("")

  // Exame input
  const [novoExame, setNovoExame] = useState("")
  const [exames, setExames] = useState<string[]>([])

  // Load editing document data
  useEffect(() => {
    if (editingDoc) {
      setTitle(editingDoc.title)
      setType(editingDoc.type as TemplateType)
      setContent(editingDoc.content)
      setTemplateId(editingDoc.templateId || "")
    } else {
      setTitle("Receita Padrão")
      setType("receita")
      setContent(buildBaseHtml())
      setTemplateId("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingDoc])

  const buildBaseHtml = (): string => {
    const header = includeHeader ? RECEITA_HEADER_HTML : ""
    const patientBlock = patientBlockHtml(patient)
    return `${header}${patientBlock}`
  }

  useEffect(() => {
    if (!open) return
    listTemplatesByType(type)
      .then((data) => {
        console.log("Templates loaded:", data)
        setTemplates(data)
      })
      .catch((err) => console.error("Error loading templates:", err))
    setContent(buildBaseHtml())
    setExames([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type])

  useEffect(() => {
    setContent(buildBaseHtml())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeHeader, patient])

  const handlePickTemplate = (id: string) => {
    console.log("Template selected:", id)
    setTemplateId(id)
    const t = templates.find((x) => x.id === id)
    console.log("Template found:", t)
    if (!t) return
    const filled = replaceTemplateVariables(t.content, patient, tenant, veterinarian)
    console.log("Filled content:", filled)
    setContent(`${buildBaseHtml()}${filled}`)
  }

  const handleAddMedicamento = () => {
    if (!medicamento.trim()) return
    const block = `
      <p>
        <strong>${medicamento}</strong> — ${formaQtd}<br/>
        <em>Uso ${usoTipo || "—"}</em>${farmacia ? ` · Farmácia ${farmacia}` : ""}<br/>
        ${posologia}
      </p>
    `
    setContent((prev) => `${prev}${block}`)
    setMedicamento("")
    setFormaQtd("")
    setPosologia("")
  }

  const handleAddExame = () => {
    if (!novoExame.trim()) return
    const next = [...exames, novoExame.trim()]
    setExames(next)
    setNovoExame("")
    const list = `<ul>${next.map((e) => `<li>${e}</li>`).join("")}</ul>`
    // Replace any existing list block at the end with the new one (simple append-replace)
    setContent(`${buildBaseHtml()}<p><strong>Exames solicitados:</strong></p>${list}`)
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast({ variant: "destructive", title: "Informe uma descrição" })
      return
    }
    setSaving(true)
    try {
      if (editingDoc) {
        // Update existing document
        await updateConsultationDocument(editingDoc.id, {
          title,
          type,
          content,
          templateId: templateId || undefined,
        })
        toast({ title: "Documento atualizado" })
      } else {
        // Create new document
        await createConsultationDocument({
          draftId,
          type,
          title,
          content,
          templateId: templateId || undefined,
        })
        toast({ title: "Documento salvo" })
      }
      onOpenChange(false)
      onSaved?.()
    } catch (error) {
      console.error("Save document error:", error)
      toast({ variant: "destructive", title: "Erro ao salvar documento" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingDoc ? (
              <span className="bg-primary/15 px-1">Editar</span>
            ) : (
              <span className="bg-primary/15 px-1">Receitas, Exames</span>
            )}{" "}
            &amp; Termos
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="doc-desc">Descrição</Label>
            <Input id="doc-desc" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Tipo</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TemplateType)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="receita">Receita</option>
                <option value="exame">Exame</option>
                <option value="termo">Termo</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Modelos</Label>
              <select
                value={templateId}
                onChange={(e) => handlePickTemplate(e.target.value)}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="">— sem modelo —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Cabeçalho</Label>
              <select
                value={includeHeader ? "sim" : "nao"}
                onChange={(e) => setIncludeHeader(e.target.value === "sim")}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              >
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
              </select>
            </div>
          </div>

          {type === "receita" && (
            <div className="grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/30 p-3 lg:grid-cols-6">
              <div className="grid gap-1.5">
                <Label>Uso</Label>
                <Input value={usoTipo} onChange={(e) => setUsoTipo(e.target.value)} placeholder="Ex.: Oral" />
              </div>
              <div className="grid gap-1.5 col-span-2">
                <Label>Medicamento</Label>
                <Input value={medicamento} onChange={(e) => setMedicamento(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Forma e Qtd</Label>
                <Input value={formaQtd} onChange={(e) => setFormaQtd(e.target.value)} placeholder="10 cp" />
              </div>
              <div className="grid gap-1.5">
                <Label>Posologia</Label>
                <Input value={posologia} onChange={(e) => setPosologia(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Farmácia</Label>
                <Input value={farmacia} onChange={(e) => setFarmacia(e.target.value)} />
              </div>
              <div className="col-span-full">
                <Button size="sm" onClick={handleAddMedicamento} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add. Medicamento
                </Button>
              </div>
            </div>
          )}

          {type === "exame" && (
            <div className="flex items-end gap-2 rounded-md border border-border bg-muted/30 p-3">
              <div className="grid flex-1 gap-1.5">
                <Label>Adicionar exame</Label>
                <Input
                  value={novoExame}
                  onChange={(e) => setNovoExame(e.target.value)}
                  placeholder="Ex.: Hemograma completo"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddExame()
                    }
                  }}
                />
              </div>
              <Button size="sm" onClick={handleAddExame} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>
          )}

          <RichTextEditor value={content} onChange={setContent} placeholder="Conteúdo do documento" />

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar documento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
