"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { ChevronRight, Pencil, Trash2, Sparkles, PenLine } from "lucide-react"
import { PatientAvatar } from "@/components/patients/patient-avatar"
import type { Consultation, ConsultationStatus, ConsultationDraft } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { deleteDraft } from "@/lib/api"
import { deleteConsultationAction } from "../../app/(app)/consultorio/actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

const STATUS_META: Record<ConsultationStatus, { label: string; className: string }> = {
  gravando: { label: "Gravando", className: "text-destructive bg-destructive/10 border-destructive/20" },
  transcrevendo: { label: "Transcrevendo", className: "text-primary bg-primary/10 border-primary/20" },
  rascunho: { label: "Rascunho", className: "text-amber-700 bg-amber-500/10 border-amber-500/20" },
  finalizado: { label: "Finalizado", className: "text-muted-foreground bg-muted border-border" },
}

const DRAFT_META = { label: "Rascunho", className: "text-amber-700 bg-amber-500/10 border-amber-500/20" }

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDuration(sec?: number) {
  if (!sec) return "—"
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m${s.toString().padStart(2, "0")}s`
}

type Props = {
  consultations: Consultation[]
  drafts: ConsultationDraft[]
  search?: string
  statusFilter?: string
  modeFilter?: "all" | "ai" | "manual"
}

export function ConsultationTable({ consultations, drafts, search = "", statusFilter = "Todos", modeFilter = "all" }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; isDraft: boolean } | null>(null)

  const handleDeleteConsultation = async (id: string) => {
    setItemToDelete({ id, isDraft: false })
    setDeleteDialogOpen(true)
  }

  const handleDeleteDraft = async (id: string) => {
    setItemToDelete({ id, isDraft: true })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    try {
      if (itemToDelete.isDraft) {
        await deleteDraft(itemToDelete.id)
        toast({ title: "Rascunho excluído", description: "O rascunho foi excluído com sucesso." })
      } else {
        const result = await deleteConsultationAction(itemToDelete.id)
        if (!result.success) throw new Error(result.error)
        toast({ title: "Consulta excluída", description: "A consulta foi excluída com sucesso." })
      }
      router.refresh()
    } catch (error) {
      console.error("Error deleting item:", error)
      toast({ variant: "destructive", title: "Erro ao excluir", description: "Não foi possível excluir o item. Tente novamente." })
    } finally {
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    }
  }

  const allItems = useMemo(() => [
    ...drafts.map((d) => ({ ...d, isDraft: true as const })),
    ...consultations.map((c) => ({ ...c, isDraft: false as const })),
  ], [drafts, consultations])

  const filteredItems = useMemo(() => {
    let items = allItems

    if (statusFilter === "Rascunhos") {
      items = items.filter(item => item.isDraft || (!item.isDraft && item.status === "rascunho"))
    } else if (statusFilter === "Finalizados") {
      items = items.filter(item => !item.isDraft && item.status === "finalizado")
    }

    if (modeFilter !== "all") {
      items = items.filter(item => item.mode === modeFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(item => {
        const name = (item.patientName ?? "").toLowerCase()
        const complaint = (item.chiefComplaint ?? "").toLowerCase()
        const vet = (item.veterinarianName ?? "").toLowerCase()
        const tutor = (!item.isDraft ? (item.tutorName ?? "") : "").toLowerCase()
        return name.includes(q) || complaint.includes(q) || vet.includes(q) || tutor.includes(q)
      })
    }

    return items
  }, [allItems, statusFilter, modeFilter, search])

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Column headers */}
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_70px_100px_100px_80px_24px] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
          <div>Paciente / Queixa</div>
          <div>Data/Hora</div>
          <div>Veterinário</div>
          <div>Modo</div>
          <div>Duração</div>
          <div>Status</div>
          <div className="text-right">Ações</div>
          <div />
        </div>

        <ul className="divide-y divide-border">
          {filteredItems.map((item) => {
            const isDraft = item.isDraft
            const status = isDraft ? DRAFT_META : STATUS_META[item.status as ConsultationStatus]

            return (
              <li key={item.id}>
                <div className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_70px_100px_100px_80px_24px] md:gap-4">
                  {/* Patient/Complaint */}
                  <Link href={`/consultorio/${item.id}`} className="flex min-w-0 items-center gap-3">
                    {isDraft ? (
                      <PatientAvatar name={item.patientName || "?"} species="Cão" seed={item.id} size="md" />
                    ) : (
                      <PatientAvatar patient={item.patient!} size="md" />
                    )}
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-sm font-medium">{item.patientName || item.patient?.name}</span>
                      <span className="truncate text-[11px] text-muted-foreground md:hidden">
                        {item.finalReport || item.chiefComplaint || "Sem queixa"}
                      </span>
                    </div>
                  </Link>

                  {/* Date/Time */}
                  <div className="hidden min-w-0 flex-col leading-tight md:flex">
                    <span className="truncate text-sm">{formatDateTime(item.createdAt)}</span>
                  </div>

                  {/* Veterinarian */}
                  <div className="hidden min-w-0 flex-col leading-tight md:flex">
                    <span className="truncate text-sm">{item.veterinarianName || item.veterinarian?.name}</span>
                    {!isDraft && (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {item.tutorName || item.patient?.tutor?.name || "Sem tutor"}
                      </span>
                    )}
                  </div>

                  {/* Mode */}
                  <div className="hidden md:flex">
                    {item.mode === "ai" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        <Sparkles className="h-3 w-3" strokeWidth={2} /> IA
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        <PenLine className="h-3 w-3" strokeWidth={2} /> Manual
                      </span>
                    )}
                  </div>

                  {/* Duration */}
                  <div className="hidden min-w-0 flex-col leading-tight md:flex">
                    <span className="truncate text-sm">{formatDuration(item.durationSec || item.durationSeconds)}</span>
                  </div>

                  {/* Status */}
                  <div className="hidden md:block">
                    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${status.className}`}>
                      {status.label}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="hidden flex items-center justify-end gap-1 md:flex">
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8">
                      <Link href={isDraft ? "/consultorio/novo" : `/consultorio/${item.id}/editar`}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => isDraft ? handleDeleteDraft(item.id) : handleDeleteConsultation(item.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex shrink-0 items-center justify-end md:hidden">
                    <Link href={isDraft ? "/consultorio/novo" : `/consultorio/${item.id}`}>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.75} />
                    </Link>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {allItems.length === 0 ? "Nenhuma consulta encontrada." : "Nenhum resultado para os filtros aplicados."}
            </p>
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              {itemToDelete?.isDraft
                ? "Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita."
                : "Tem certeza que deseja excluir esta consulta? Esta ação não pode ser desfeita."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
