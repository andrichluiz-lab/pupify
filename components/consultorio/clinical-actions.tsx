"use client"

import { useEffect, useState } from "react"
import {
  Bed,
  Syringe,
  FileText,
  Paperclip,
  Loader2,
  Trash2,
  ExternalLink,
  Eye,
  Pencil,
} from "lucide-react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createHospitalizationAction } from "@/app/(app)/internacao/actions"
import {
  listConsultationDocuments,
  createConsultationDocument,
  deleteConsultationDocument,
} from "@/lib/api"
import type { ConsultationDocument, Patient } from "@/lib/types"
import { DocumentModal } from "./document-modal"
import { AttachmentsPanel } from "./attachments-panel"

interface Props {
  draftId: string
  patientId: string
  patient: Patient | null
}

export function ClinicalActions({ draftId, patientId, patient }: Props) {
  const { toast } = useToast()
  const [openDialog, setOpenDialog] = useState<null | "internar" | "vacinar" | "anexos">(null)
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [viewDocOpen, setViewDocOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<ConsultationDocument | null>(null)
  const [viewingDoc, setViewingDoc] = useState<ConsultationDocument | null>(null)
  const [documents, setDocuments] = useState<ConsultationDocument[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)

  const refreshDocs = async () => {
    try {
      const list = await listConsultationDocuments({ draftId })
      setDocuments(list)
    } catch (error) {
      console.error("Error loading documents:", error)
    } finally {
      setLoadingDocs(false)
    }
  }

  useEffect(() => {
    refreshDocs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId])

  const guardPatient = (): boolean => {
    if (!patientId) {
      toast({
        variant: "destructive",
        title: "Selecione um paciente",
        description: "É necessário selecionar um paciente antes desta ação.",
      })
      return false
    }
    return true
  }

  const handleDeleteDoc = async (id: string) => {
    if (!confirm("Excluir documento?")) return
    try {
      await deleteConsultationDocument(id)
      await refreshDocs()
    } catch (error) {
      console.error("Delete document error:", error)
      toast({ variant: "destructive", title: "Erro ao excluir documento" })
    }
  }

  const handleViewDoc = (doc: ConsultationDocument) => {
    setViewingDoc(doc)
    setViewDocOpen(true)
  }

  const handleEditDoc = (doc: ConsultationDocument) => {
    setEditingDoc(doc)
    setDocModalOpen(true)
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Ações clínicas</h3>

      <div className="grid grid-cols-2 gap-2">
        {/* Internar */}
        <Dialog
          open={openDialog === "internar"}
          onOpenChange={(o) => setOpenDialog(o ? "internar" : null)}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={(e) => {
                if (!guardPatient()) e.preventDefault()
              }}
            >
              <Bed className="h-3.5 w-3.5" strokeWidth={1.75} />
              Internar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Internar paciente</DialogTitle>
              <DialogDescription>
                Crie uma internação vinculada ao paciente desta consulta.
              </DialogDescription>
            </DialogHeader>
            <HospitalizationForm
              patientId={patientId}
              onDone={() => setOpenDialog(null)}
            />
          </DialogContent>
        </Dialog>

        {/* Vacinas */}
        <Dialog
          open={openDialog === "vacinar"}
          onOpenChange={(o) => setOpenDialog(o ? "vacinar" : null)}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-9"
              onClick={(e) => {
                if (!guardPatient()) e.preventDefault()
              }}
            >
              <Syringe className="h-3.5 w-3.5" strokeWidth={1.75} />
              Vacinas
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar vacina</DialogTitle>
            </DialogHeader>
            <VaccineForm
              draftId={draftId}
              onDone={() => {
                setOpenDialog(null)
                refreshDocs()
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Documentos */}
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-9"
          onClick={() => {
            if (!guardPatient()) return
            setDocModalOpen(true)
          }}
        >
          <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
          Documentos
        </Button>

        {/* Anexos */}
        <Dialog
          open={openDialog === "anexos"}
          onOpenChange={(o) => setOpenDialog(o ? "anexos" : null)}
        >
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <Paperclip className="h-3.5 w-3.5" strokeWidth={1.75} />
              Anexos
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Anexos da consulta</DialogTitle>
            </DialogHeader>
            <AttachmentsPanel draftId={draftId} />
          </DialogContent>
        </Dialog>
      </div>

      <DocumentModal
        open={docModalOpen}
        onOpenChange={(open) => {
          setDocModalOpen(open)
          if (!open) setEditingDoc(null)
        }}
        draftId={draftId}
        patient={patient}
        onSaved={() => {
          refreshDocs()
          setEditingDoc(null)
        }}
        editingDoc={editingDoc}
      />

      {/* Document view modal */}
      <Dialog open={viewDocOpen} onOpenChange={setViewDocOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewingDoc?.title}</DialogTitle>
            <DialogDescription className="capitalize">{viewingDoc?.type}</DialogDescription>
          </DialogHeader>
          {viewingDoc && (
            <div
              className="prose prose-sm max-w-none border border-border rounded-lg p-4"
              dangerouslySetInnerHTML={{ __html: viewingDoc.content }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Documents list */}
      <div className="flex flex-col gap-1.5">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Documentos
        </h4>
        {loadingDocs ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : documents.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum documento.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium">{d.title}</span>
                  <span className="text-muted-foreground capitalize">{d.type}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleViewDoc(d)}
                    className="rounded p-1 text-muted-foreground hover:text-primary"
                    aria-label="Visualizar"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditDoc(d)}
                    className="rounded p-1 text-muted-foreground hover:text-primary"
                    aria-label="Editar"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDoc(d.id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function HospitalizationForm({
  patientId,
  onDone,
}: {
  patientId: string
  onDone: () => void
}) {
  const { toast } = useToast()
  const [reason, setReason] = useState("")
  const [kennel, setKennel] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim()) return
    setLoading(true)
    try {
      const result = await createHospitalizationAction({
        patientId,
        reason,
        kennel: kennel || "—",
        admittedAt: new Date().toISOString(),
        status: "observacao",
      })
      if (!result.success) {
        toast({
          variant: "destructive",
          title: "Erro ao internar",
          description: result.error,
        })
        return
      }
      toast({
        title: "Paciente internado",
        description: (
          <Link href="/internacao" className="inline-flex items-center gap-1 underline">
            Ver internação <ExternalLink className="h-3 w-3" />
          </Link>
        ) as unknown as string,
      })
      onDone()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="reason">Motivo</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Descreva o motivo da internação"
          className="min-h-[80px]"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="kennel">Box / Canil</Label>
        <Input id="kennel" value={kennel} onChange={(e) => setKennel(e.target.value)} placeholder="Ex.: Box 3" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!reason.trim() || loading} className="gap-1.5">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Internar
        </Button>
      </div>
    </form>
  )
}

function VaccineForm({ draftId, onDone }: { draftId: string; onDone: () => void }) {
  const { toast } = useToast()
  const [name, setName] = useState("")
  const [batch, setBatch] = useState("")
  const [nextDose, setNextDose] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const content = `
        <p><strong>Vacina aplicada:</strong> ${name}</p>
        ${batch ? `<p><strong>Lote:</strong> ${batch}</p>` : ""}
        ${nextDose ? `<p><strong>Próxima dose:</strong> ${nextDose}</p>` : ""}
        <p><strong>Aplicada em:</strong> ${new Date().toLocaleDateString("pt-BR")}</p>
      `
      await createConsultationDocument({
        draftId,
        type: "termo",
        title: `Vacina — ${name}`,
        content,
      })
      toast({ title: "Vacina registrada" })
      onDone()
    } catch (error) {
      console.error("Error registering vaccine:", error)
      toast({ variant: "destructive", title: "Erro ao registrar vacina" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="vac-name">Nome da vacina</Label>
        <Input id="vac-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: V8" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="vac-batch">Lote (opcional)</Label>
        <Input id="vac-batch" value={batch} onChange={(e) => setBatch(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="vac-next">Próxima dose</Label>
        <Input id="vac-next" type="date" value={nextDose} onChange={(e) => setNextDose(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!name.trim() || loading} className="gap-1.5">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Registrar
        </Button>
      </div>
    </form>
  )
}
