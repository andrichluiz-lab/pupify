"use client"

import { useDraggable } from "@dnd-kit/core"
import { Clock, User, Stethoscope, Smile, AlertTriangle, Timer, FolderOpen, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Appointment } from "@/lib/types"
import { cn } from "@/lib/utils"
import { listFichas, createFicha, updateAppointmentStatus } from "@/lib/api"

interface KanbanCardProps {
  appointment: Appointment
  onClick: () => void
}

const TYPE_COLORS = {
  consulta: "bg-sky-500",
  retorno: "bg-teal-500",
  vacina: "bg-emerald-500",
  cirurgia: "bg-rose-500",
  exame: "bg-violet-500",
  banho_tosa: "bg-amber-500",
  emergencia: "bg-red-600",
}

const TYPE_LABELS = {
  consulta: "Consulta",
  retorno: "Retorno",
  vacina: "Vacina",
  cirurgia: "Cirurgia",
  exame: "Exame",
  banho_tosa: "Banho & Tosa",
  emergencia: "Emergência",
}

function useMinutesUntil(startsAt: string) {
  const [minutes, setMinutes] = useState<number>(() => {
    const diff = new Date(startsAt).getTime() - Date.now()
    return Math.floor(diff / 60000)
  })

  useEffect(() => {
    const tick = () => {
      const diff = new Date(startsAt).getTime() - Date.now()
      setMinutes(Math.floor(diff / 60000))
    }
    const id = setInterval(tick, 60000)
    return () => clearInterval(id)
  }, [startsAt])

  return minutes
}

function ElapsedBadge({ minutesUntil, status }: { minutesUntil: number; status: string }) {
  if (status !== "em_atendimento") return null
  const elapsed = Math.max(0, -minutesUntil)
  const hrs = Math.floor(elapsed / 60)
  const mins = elapsed % 60
  const label = hrs > 0 ? `${hrs}h${mins > 0 ? `${mins}m` : ""}` : `${elapsed}min`
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
      elapsed > 60 ? "animate-pulse bg-orange-500/10 text-orange-600" : "bg-amber-500/10 text-amber-600",
    )}>
      <Timer className="h-3 w-3" />
      {label}
    </span>
  )
}

function ProximityBadge({ minutesUntil, status }: { minutesUntil: number; status: string }) {
  const isActive = ["agendado", "confirmado"].includes(status)
  if (!isActive) return null
  // Only show indicator when appointment is within 2hrs
  if (minutesUntil > 120 || minutesUntil < -30) return null

  if (minutesUntil > 60) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
        <Smile className="h-3 w-3" />
        {minutesUntil}min
      </span>
    )
  }
  if (minutesUntil > 15) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
        <Timer className="h-3 w-3" />
        {minutesUntil}min
      </span>
    )
  }
  return (
    <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
      <AlertTriangle className="h-3 w-3" />
      {minutesUntil <= 0 ? "Atrasado" : `${minutesUntil}min`}
    </span>
  )
}

export function KanbanCard({ appointment, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: appointment.id,
  })
  const minutesUntil = useMinutesUntil(appointment.startsAt)
  const router = useRouter()
  const [fichaLoading, setFichaLoading] = useState(false)

  async function handleAbrirFicha(e: React.MouseEvent) {
    e.stopPropagation()
    setFichaLoading(true)
    try {
      if (["agendado", "confirmado"].includes(appointment.status)) {
        updateAppointmentStatus(appointment.id, "em_atendimento").catch(() => {})
      }
      const fichas = await listFichas({ patientId: appointment.patientId, status: "aberto" })
      const existing = fichas[0]
      if (existing) {
        router.push(`/fichas/${existing.id}`)
      } else {
        const ficha = await createFicha({ patientId: appointment.patientId, tutorId: appointment.tutorId })
        router.push(`/fichas/${ficha.id}`)
      }
    } finally {
      setFichaLoading(false)
    }
  }

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const startTime = format(new Date(appointment.startsAt), "HH:mm", { locale: ptBR })
  const endTime = format(new Date(appointment.endsAt), "HH:mm", { locale: ptBR })

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "cursor-pointer rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:shadow-md",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Header with type and time */}
      <div className="mb-2 flex items-center justify-between gap-1.5">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium text-white",
            TYPE_COLORS[appointment.type]
          )}
        >
          {TYPE_LABELS[appointment.type]}
        </span>
        <div className="flex items-center gap-1.5">
          <ProximityBadge minutesUntil={minutesUntil} status={appointment.status} />
          <ElapsedBadge minutesUntil={minutesUntil} status={appointment.status} />
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" strokeWidth={1.75} />
            <span className="tabular-nums">
              {startTime} - {endTime}
            </span>
          </div>
        </div>
      </div>

      {/* Patient name */}
      <h3 className="mb-1 text-sm font-medium text-foreground">
        {appointment.patient?.name}
      </h3>

      {/* Tutor */}
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <User className="h-3 w-3" strokeWidth={1.75} />
        <span className="truncate">{appointment.tutor?.name}</span>
      </div>

      {/* Veterinarian */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Stethoscope className="h-3 w-3" strokeWidth={1.75} />
        <span className="truncate">{appointment.veterinarianName}</span>
      </div>

      {/* Room if available */}
      {appointment.room && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5">Sala {appointment.room}</span>
        </div>
      )}

      {/* Abrir Ficha — só para atendimentos ativos */}
      {["agendado", "confirmado", "em_atendimento"].includes(appointment.status) && (
        <button
          type="button"
          onClick={handleAbrirFicha}
          disabled={fichaLoading}
          className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
        >
          {fichaLoading
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : <FolderOpen className="h-3 w-3" />
          }
          Abrir ficha
        </button>
      )}
    </div>
  )
}
