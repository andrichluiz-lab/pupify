import { cn } from "@/lib/utils"
import type { AppointmentStatus, AppointmentType } from "@/lib/types"

const STATUS_STYLES: Record<AppointmentStatus, { label: string; className: string; dot: string }> = {
  agendado: {
    label: "Agendado",
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
  },
  confirmado: {
    label: "Confirmado",
    className: "bg-sky-500/10 text-sky-700",
    dot: "bg-sky-500",
  },
  em_atendimento: {
    label: "Em atendimento",
    className: "bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  concluido: {
    label: "Concluído",
    className: "bg-muted text-muted-foreground line-through",
    dot: "bg-muted-foreground",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-destructive/10 text-destructive",
    dot: "bg-destructive",
  },
  falta: {
    label: "Não compareceu",
    className: "bg-amber-500/10 text-amber-700",
    dot: "bg-amber-500",
  },
}

const TYPE_LABELS: Record<AppointmentType, string> = {
  consulta: "Consulta",
  retorno: "Retorno",
  vacina: "Vacina",
  cirurgia: "Cirurgia",
  exame: "Exame",
  banho_tosa: "Banho & Tosa",
  emergencia: "Emergência",
}

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const s = STATUS_STYLES[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        s.className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  )
}

export function AppointmentTypeLabel({ type }: { type: AppointmentType }) {
  return <span className="text-xs text-muted-foreground">{TYPE_LABELS[type]}</span>
}

export function appointmentTypeLabel(type: AppointmentType): string {
  return TYPE_LABELS[type]
}

export function hospitalizationStatusStyle(status: "estavel" | "observacao" | "critico" | "recuperacao") {
  switch (status) {
    case "critico":
      return { label: "Crítico", className: "bg-destructive/10 text-destructive", dot: "bg-destructive" }
    case "observacao":
      return { label: "Observação", className: "bg-amber-500/10 text-amber-700", dot: "bg-amber-500" }
    case "recuperacao":
      return { label: "Recuperação", className: "bg-sky-500/10 text-sky-700", dot: "bg-sky-500" }
    case "estavel":
    default:
      return { label: "Estável", className: "bg-primary/10 text-primary", dot: "bg-primary" }
  }
}
