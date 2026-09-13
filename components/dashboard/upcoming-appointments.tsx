import Link from "next/link"
import { Clock, MapPin, ChevronRight } from "lucide-react"
import { PatientAvatar } from "@/components/patients/patient-avatar"
import { AppointmentStatusBadge, appointmentTypeLabel } from "@/components/shared/status-badge"
import type { Appointment } from "@/lib/types"

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

type Props = {
  appointments: Appointment[]
}

export function UpcomingAppointments({ appointments }: Props) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
        <p className="text-sm text-muted-foreground">Nenhum atendimento para hoje.</p>
        <Link href="/agenda" className="text-xs font-medium text-primary hover:underline">
          Abrir agenda
        </Link>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {appointments.map((a) => (
        <li key={a.id} className="group">
          <Link
            href={`/pacientes/${a.patientId}`}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
          >
            {/* Time column */}
            <div className="flex w-14 shrink-0 flex-col items-start leading-tight">
              <span className="text-sm font-medium tabular-nums">{formatTime(a.startsAt)}</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {formatTime(a.endsAt)}
              </span>
            </div>

            {/* Vertical divider */}
            <div className="h-10 w-px bg-border" aria-hidden />

            {/* Patient */}
            {a.patient && (
              <PatientAvatar name={a.patient.name} species={a.patient.species} seed={a.patient.id} size="md" />
            )}

            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{a.patient?.name}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="truncate text-xs text-muted-foreground">
                  {appointmentTypeLabel(a.type)}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2.5 text-[11px] text-muted-foreground">
                <span className="truncate">{a.tutor?.name}</span>
                {a.room && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" strokeWidth={1.75} />
                      {a.room}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="hidden shrink-0 items-center gap-3 sm:flex">
              <AppointmentStatusBadge status={a.status} />
              <ChevronRight
                className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground"
                strokeWidth={1.75}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export function UpcomingAppointmentsHeader({ count, today }: { count: number; today: Date }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
        <h2 className="text-sm font-medium">Agenda de hoje</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {today.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </span>
      </div>
      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
        {count}
      </span>
    </div>
  )
}
