"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { Clock, User, Stethoscope, FileText, CheckCircle2, XCircle, Mic, CalendarPlus } from "lucide-react"
import { format, addDays } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { Appointment } from "@/lib/types"
import { updateAppointmentStatus, createAppointment } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface AppointmentDetailDialogProps {
  appointment: Appointment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRefresh: () => void
}

const TYPE_COLORS = {
  consulta:   "bg-sky-500",
  retorno:    "bg-teal-500",
  vacina:     "bg-emerald-500",
  cirurgia:   "bg-rose-500",
  exame:      "bg-violet-500",
  banho_tosa: "bg-amber-500",
  emergencia: "bg-red-600",
}

const TYPE_LABELS = {
  consulta:   "Consulta",
  retorno:    "Retorno",
  vacina:     "Vacina",
  cirurgia:   "Cirurgia",
  exame:      "Exame",
  banho_tosa: "Banho & Tosa",
  emergencia: "Emergência",
}

const STATUS_LABELS = {
  agendado:       "Agendado",
  confirmado:     "Confirmado",
  em_atendimento: "Em Atendimento",
  concluido:      "Concluído",
  cancelado:      "Cancelado",
  falta:          "Falta",
}

const RETURN_PRESETS = [
  { label: "7 dias",  days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
  { label: "60 dias", days: 60 },
]

function isoDate(d: Date) {
  return d.toISOString().split("T")[0]
}

export function AppointmentDetailDialog({
  appointment,
  open,
  onOpenChange,
  onRefresh,
}: AppointmentDetailDialogProps) {
  const { toast } = useToast()
  const router = useRouter()

  const [scheduleReturn, setScheduleReturn] = useState(false)
  const [returnDate, setReturnDate] = useState("")
  const [returnStartTime, setReturnStartTime] = useState("09:00")
  const [returnEndTime, setReturnEndTime] = useState("10:00")
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!appointment) return null

  const startTime = format(new Date(appointment.startsAt), "HH:mm", { locale: ptBR })
  const endTime   = format(new Date(appointment.endsAt),   "HH:mm", { locale: ptBR })
  const date      = format(new Date(appointment.startsAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  function applyPreset(days: number) {
    setReturnDate(isoDate(addDays(new Date(), days)))
    setReturnStartTime(startTime)
    setReturnEndTime(endTime)
  }

  const handleOpenConsultorio = () => {
    const url = appointment.patientId
      ? `/consultorio/novo?patientId=${appointment.patientId}`
      : "/consultorio/novo"
    onOpenChange(false)
    router.push(url)
  }

  const handleStatusChange = async (newStatus: Appointment["status"]) => {
    setIsSubmitting(true)
    try {
      await updateAppointmentStatus(appointment.id, newStatus)

      if (newStatus === "concluido" && scheduleReturn && returnDate) {
        if (returnStartTime >= returnEndTime) {
          toast({ title: "Horário de retorno inválido", variant: "destructive" })
          setIsSubmitting(false)
          return
        }
        await createAppointment({
          type:           "retorno",
          status:         "agendado",
          patientId:      appointment.patientId,
          tutorId:        appointment.tutorId,
          veterinarianId: appointment.veterinarianId,
          startsAt:       new Date(`${returnDate}T${returnStartTime}:00`).toISOString(),
          endsAt:         new Date(`${returnDate}T${returnEndTime}:00`).toISOString(),
          room:           appointment.room,
        })
        toast({ title: "Retorno agendado", description: `Consulta de retorno agendada para ${returnDate.split("-").reverse().join("/")}` })
      } else {
        toast({
          title:       "Status atualizado",
          description: `Atendimento marcado como ${STATUS_LABELS[newStatus]}`,
        })
      }

      setScheduleReturn(false)
      setReturnDate("")
      onRefresh()
      onOpenChange(false)
    } catch {
      toast({
        title:       "Erro ao atualizar status",
        description: "Não foi possível atualizar o atendimento.",
        variant:     "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Detalhes do Atendimento</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Type + Status */}
          <div className="flex items-center justify-between">
            <Badge className={`${TYPE_COLORS[appointment.type]} border-0 text-white`}>
              {TYPE_LABELS[appointment.type]}
            </Badge>
            <Badge variant="outline">{STATUS_LABELS[appointment.status]}</Badge>
          </div>

          {/* Patient / Tutor */}
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <span className="font-medium">{appointment.patient?.name}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Tutor: {appointment.tutor?.name}
            </div>
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <span>{date}</span>
            <span className="text-muted-foreground">·</span>
            <span className="tabular-nums">{startTime} – {endTime}</span>
          </div>

          {/* Vet */}
          <div className="flex items-center gap-2 text-sm">
            <Stethoscope className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
            <span>{appointment.veterinarianName}</span>
          </div>

          {/* Room */}
          {appointment.room && (
            <div className="text-sm">
              <span className="rounded bg-muted px-2 py-1 text-xs">Sala {appointment.room}</span>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                <span>Observações</span>
              </div>
              <p className="text-sm text-muted-foreground">{appointment.notes}</p>
            </div>
          )}

          {/* "Agendar retorno" — shown when status is em_atendimento */}
          {appointment.status === "em_atendimento" && (
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={scheduleReturn}
                  onChange={e => {
                    setScheduleReturn(e.target.checked)
                    if (e.target.checked && !returnDate) applyPreset(30)
                  }}
                  className="h-4 w-4 rounded border-border accent-primary"
                />
                <CalendarPlus className="h-4 w-4 text-primary" strokeWidth={1.75} />
                Agendar retorno ao concluir
              </label>

              {scheduleReturn && (
                <div className="flex flex-col gap-3">
                  {/* Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {RETURN_PRESETS.map(p => (
                      <button
                        key={p.days}
                        type="button"
                        onClick={() => applyPreset(p.days)}
                        className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium transition-colors hover:bg-muted"
                      >
                        +{p.label}
                      </button>
                    ))}
                  </div>

                  {/* Date & times */}
                  <div className="flex flex-col gap-2">
                    <DatePicker value={returnDate} onChange={setReturnDate} placeholder="Data do retorno" />
                    <div className="grid grid-cols-2 gap-2">
                      <TimePicker value={returnStartTime} onChange={setReturnStartTime} placeholder="Início" />
                      <TimePicker value={returnEndTime}   onChange={setReturnEndTime}   placeholder="Fim" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {appointment.status !== "cancelado" && appointment.status !== "concluido" && appointment.status !== "falta" && (
              <Button onClick={handleOpenConsultorio} className="w-full gap-1.5">
                <Mic className="h-4 w-4" strokeWidth={1.75} />
                Iniciar no Consultório
              </Button>
            )}

            {appointment.status === "em_atendimento" && (
              <Button
                variant="outline"
                disabled={isSubmitting}
                onClick={() => handleStatusChange("concluido")}
                className="w-full gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
                {isSubmitting ? "Salvando..." : scheduleReturn ? "Concluir e Agendar Retorno" : "Marcar como Concluído"}
              </Button>
            )}

            {appointment.status !== "cancelado" && appointment.status !== "falta" && appointment.status !== "concluido" && (
              <Button
                variant="outline"
                onClick={() => handleStatusChange("cancelado")}
                className="w-full gap-1.5 text-destructive hover:text-destructive"
              >
                <XCircle className="h-4 w-4" strokeWidth={1.75} />
                Cancelar Atendimento
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
