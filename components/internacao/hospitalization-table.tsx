"use client"

import Link from "next/link"
import { ChevronRight, Pencil, Trash2 } from "lucide-react"
import { PatientAvatar } from "@/components/patients/patient-avatar"
import type { HospitalizationDetail } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { DischargeReportButton } from "@/components/internacao/discharge-report-button"

const STATUS_META: Record<string, { label: string; className: string }> = {
  estavel: { label: "Estável", className: "text-primary bg-primary/10 border-primary/20" },
  observacao: { label: "Observação", className: "text-amber-700 bg-amber-500/10 border-amber-500/20" },
  critico: { label: "Crítico", className: "text-destructive bg-destructive/10 border-destructive/20" },
  recuperacao: { label: "Recuperação", className: "text-primary bg-primary/10 border-primary/20" },
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
  hospitalizations: HospitalizationDetail[]
  onRefresh: () => Promise<void>
}

export function HospitalizationTable({ hospitalizations, onRefresh }: Props) {
  const router = useRouter()

  const handleToggleOrder = async (orderId: string, done: boolean) => {
    const { toggleTreatmentOrderDoneAction } = await import("../../app/(app)/internacao/actions")
    const result = await toggleTreatmentOrderDoneAction(orderId, done)
    if (result.success) {
      await onRefresh()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta internação?")) {
      return
    }

    const { deleteHospitalizationAction } = await import("../../app/(app)/internacao/actions")
    const result = await deleteHospitalizationAction(id)

    if (result.success) {
      await onRefresh()
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_100px_80px_24px] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <div>Paciente / Motivo</div>
        <div>Veterinário</div>
        <div>Baia / Admissão</div>
        <div>Sinais Vitais</div>
        <div>Status</div>
        <div className="text-right">Ações</div>
        <div />
      </div>

      <ul className="divide-y divide-border">
        {hospitalizations.map((h) => {
          const status = STATUS_META[h.status]
          const doneOrders = h.orders?.filter((o) => o.done).length ?? 0
          const totalOrders = h.orders?.length ?? 0

          return (
            <li key={h.id}>
              <div className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_100px_80px_24px] md:gap-4">
                {/* Patient/Reason cell */}
                <Link href={`/internacao/${h.id}`} className="flex min-w-0 items-center gap-3">
                  <PatientAvatar patient={h.patient!} size="md" />
                  <div className="flex min-w-0 flex-col leading-tight">
                    <span className="truncate text-sm font-medium">{h.patient?.name}</span>
                    <span className="truncate text-[11px] text-muted-foreground md:hidden">
                      {h.reason} · {h.kennel}
                    </span>
                  </div>
                </Link>

                {/* Veterinarian */}
                <div className="hidden min-w-0 flex-col leading-tight md:flex">
                  <span className="truncate text-sm">{h.veterinarian?.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{h.veterinarian?.crmv}</span>
                </div>

                {/* Kennel/Admission */}
                <div className="hidden min-w-0 flex-col leading-tight md:flex">
                  <span className="truncate text-sm">Baia {h.kennel}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{formatDate(h.admittedAt)}</span>
                </div>

                {/* Vitals */}
                <div className="hidden min-w-0 flex-col leading-tight md:flex">
                  {h.vitals ? (
                    <>
                      <span className="truncate text-sm">{h.vitals.temperature?.toFixed(1)}°C</span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        FC: {h.vitals.heartRate} · FR: {h.vitals.respiratoryRate}
                      </span>
                    </>
                  ) : (
                    <span className="truncate text-[11px] text-muted-foreground">Sem registros</span>
                  )}
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
                  <DischargeReportButton
                    hospitalizationId={h.id}
                    patientName={h.patient?.name ?? "Paciente"}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-8 w-8"
                  >
                    <Link href={`/internacao/${h.id}/editar`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(h.id)}
                    className="h-8 w-8 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex shrink-0 items-center justify-end md:hidden">
                  <Link href={`/internacao/${h.id}`}>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                  </Link>
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      {hospitalizations.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma internação encontrada.</p>
        </div>
      )}
    </div>
  )
}
