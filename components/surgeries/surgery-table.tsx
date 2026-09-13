"use client"

import Link from "next/link"
import { ChevronRight, Pencil, Trash2 } from "lucide-react"
import { PatientAvatar } from "@/components/patients/patient-avatar"
import type { Surgery, SurgeryStatus, SurgeryRisk } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

const STATUS_META: Record<SurgeryStatus, { label: string; className: string }> = {
  agendada: { label: "Agendada", className: "text-muted-foreground bg-muted border-border" },
  pre_op: {
    label: "Pré-operatório",
    className: "text-amber-700 bg-amber-500/10 border-amber-500/20",
  },
  em_andamento: {
    label: "Em andamento",
    className: "text-destructive bg-destructive/10 border-destructive/20",
  },
  recuperacao: {
    label: "Recuperação",
    className: "text-primary bg-primary/10 border-primary/20",
  },
  concluida: {
    label: "Concluída",
    className: "text-muted-foreground bg-muted border-border",
  },
  cancelada: {
    label: "Cancelada",
    className: "text-muted-foreground bg-muted border-border opacity-70",
  },
}

const RISK_META: Record<SurgeryRisk, { label: string; className: string }> = {
  baixo: { label: "Baixo", className: "text-primary" },
  medio: { label: "Médio", className: "text-amber-600" },
  alto: { label: "Alto", className: "text-destructive" },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

type Props = {
  surgeries: Surgery[]
}

export function SurgeryTable({ surgeries }: Props) {
  const router = useRouter()

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta cirurgia?")) {
      return
    }

    const { deleteSurgeryAction } = await import("../../app/(app)/cirurgias/actions")
    const result = await deleteSurgeryAction(id)

    if (result.success) {
      router.refresh()
    }
  }
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_100px_100px_80px_24px] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <div>Paciente / Procedimento</div>
        <div>Agendamento</div>
        <div>Cirurgião</div>
        <div>Sala / Risco</div>
        <div>Status</div>
        <div className="text-right">Ações</div>
        <div />
      </div>

      <ul className="divide-y divide-border">
        {surgeries.map((s) => {
          const status = STATUS_META[s.status]
          const risk = RISK_META[s.risk]

          return (
            <li key={s.id}>
              <div className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_100px_100px_80px_24px] md:gap-4">
                {/* Patient/Procedure cell */}
                <Link href={`/cirurgias/${s.id}`} className="flex min-w-0 items-center gap-3">
                  <PatientAvatar patient={s.patient!} size="md" />
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium">{s.procedure}</span>
                    <span className="truncate text-[11px] text-muted-foreground md:hidden">
                      {s.patient?.name} · {formatDate(s.scheduledFor)}
                    </span>
                  </div>
                </Link>

                {/* Schedule */}
                <div className="hidden min-w-0 flex-col leading-tight md:flex">
                  <span className="truncate text-sm">{formatDate(s.scheduledFor)}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{formatTime(s.scheduledFor)}</span>
                </div>

                {/* Surgeon */}
                <div className="hidden min-w-0 flex-col leading-tight md:flex">
                  <span className="truncate text-sm">{s.surgeon}</span>
                  {s.anesthetist && (
                    <span className="truncate text-[11px] text-muted-foreground">Anestesista: {s.anesthetist}</span>
                  )}
                </div>

                {/* Room/Risk */}
                <div className="hidden min-w-0 flex-col leading-tight md:flex">
                  <span className="truncate text-sm">{s.room}</span>
                  <span className={`truncate text-[11px] ${risk.className}`}>Risco: {risk.label}</span>
                </div>

                {/* Status */}
                <div className="hidden md:block">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${status.className}`}
                  >
                    {status.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="hidden flex items-center justify-end gap-1 md:flex">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-8 w-8"
                  >
                    <Link href={`/cirurgias/${s.id}/editar`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(s.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex shrink-0 items-center justify-end md:hidden">
                  <Link href={`/cirurgias/${s.id}`}>
                    <ChevronRight
                      className="h-4 w-4 text-muted-foreground/50"
                      strokeWidth={1.75}
                    />
                  </Link>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {surgeries.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma cirurgia encontrada.</p>
        </div>
      )}
    </div>
  )
}
