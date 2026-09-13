import { cn } from "@/lib/utils"
import type { Appointment, AgendaEventType } from "@/lib/types"
import { PatientAvatar } from "@/components/patients/patient-avatar"
import { appointmentTypeLabel } from "@/components/shared/status-badge"
import { getLocalHour, getLocalMinutes } from "@/lib/agenda-utils"

const HOUR_HEIGHT = 48 // px (smaller for week view)

function minutesFromStart(iso: string, startHour: number) {
  const hours = getLocalHour(iso)
  const minutes = getLocalMinutes(iso)
  return (hours - startHour) * 60 + minutes
}

function hourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`
}

const TYPE_TINT: Record<Appointment["type"] | "financeiro", string> = {
  consulta: "border-sky-500/60 bg-sky-500/10",
  retorno: "border-teal-500/60 bg-teal-500/10",
  vacina: "border-emerald-500/60 bg-emerald-500/10",
  cirurgia: "border-rose-500/60 bg-rose-500/10",
  exame: "border-violet-500/60 bg-violet-500/10",
  banho_tosa: "border-amber-500/60 bg-amber-500/10",
  emergencia: "border-destructive bg-destructive/15",
  financeiro: "border-indigo-500/60 bg-indigo-500/10",
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

type Props = {
  appointments: AgendaEventType[]
  weekStart: Date
  startHour?: number
  endHour?: number
  onAppointmentClick?: (appointment: Appointment) => void
}

// Helper function to detect and calculate overlap positions
function calculateOverlapPositions(appointments: AgendaEventType[]) {
  const sorted = [...appointments].sort((a, b) => 
    new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  )

  type PositionedAppointment = AgendaEventType & { start: number; end: number; left?: number; width?: number }

  const positioned: PositionedAppointment[] = sorted.map((apt) => ({
    ...apt,
    start: new Date(apt.startsAt).getTime(),
    end: new Date(apt.endsAt).getTime(),
  }))

  const groups: PositionedAppointment[][] = []
  for (const apt of positioned) {
    let added = false
    for (const group of groups) {
      const overlaps = group.some(g => 
        apt.start < g.end && apt.end > g.start
      )
      if (overlaps) {
        group.push(apt)
        added = true
        break
      }
    }
    if (!added) {
      groups.push([apt])
    }
  }

  const result = positioned.map((apt) => {
    const group = groups.find(g => g.includes(apt))
    if (!group) return { ...apt, left: 0, width: 100 }
    
    const index = group.indexOf(apt)
    const columnWidth = 100 / group.length
    return {
      ...apt,
      left: index * columnWidth,
      width: columnWidth,
    }
  })

  return result
}

export function WeekTimeline({ appointments, weekStart, startHour = 7, endHour = 20, onAppointmentClick }: Props) {
  const totalMinutes = (endHour - startHour) * 60
  const totalHeight = (endHour - startHour) * HOUR_HEIGHT

  // Generate 7 days from weekStart
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + i)
    return date
  })

  // "Now" indicator — only if we're within the shown day range
  const now = new Date()
  const nowMinutes = (now.getHours() - startHour) * 60 + now.getMinutes()
  const showNow = nowMinutes >= 0 && nowMinutes <= totalMinutes

  return (
    <div className="flex flex-col gap-2">
      {/* Day headers */}
      <div className="grid grid-cols-8 gap-2">
        <div className="w-14 shrink-0" />
        {weekDays.map((date, i) => {
          const isToday = date.toDateString() === now.toDateString()
          const dayName = DAYS[date.getDay()]
          const dayNum = date.getDate()
          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center justify-center rounded-md py-2 text-center",
                isToday && "bg-primary text-primary-foreground"
              )}
            >
              <span className="text-xs font-medium">{dayName}</span>
              <span className="text-lg font-semibold">{dayNum}</span>
            </div>
          )
        })}
      </div>

      {/* Timeline */}
      <div className="relative flex gap-2" style={{ height: totalHeight }}>
        {/* Hour gutter */}
        <div className="flex w-14 shrink-0 flex-col">
          {Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i).map((h) => (
            <div
              key={h}
              className="flex items-start justify-end pr-2 text-[11px] tabular-nums text-muted-foreground"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="-translate-y-1.5">{hourLabel(h)}</span>
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="relative flex-1 grid grid-cols-7 gap-2">
          {weekDays.map((date, dayIndex) => {
            const isToday = date.toDateString() === now.toDateString()
            const dayAppointments = appointments.filter((a) => {
              const appointmentDate = new Date(a.startsAt)
              return appointmentDate.toDateString() === date.toDateString()
            })
            const positionedAppointments = calculateOverlapPositions(dayAppointments)

            return (
              <div
                key={dayIndex}
                className={cn(
                  "relative rounded-md border border-border bg-card",
                  isToday && "border-primary/50"
                )}
              >
                {/* Hour lines */}
                {Array.from({ length: endHour - startHour }, (_, i) => i).map((i) => (
                  <div
                    key={i}
                    className="absolute inset-x-0 border-t border-border/60 first:border-t-0"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}

                {/* Now indicator */}
                {isToday && showNow && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                    style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                  >
                    <div className="-ml-1 h-2 w-2 rounded-full bg-primary" />
                    <div className="h-px flex-1 bg-primary" />
                  </div>
                )}

                {/* Appointments */}
                <div className="absolute inset-0 p-1">
                  {positionedAppointments.map((a) => {
                    const start = minutesFromStart(a.startsAt, startHour)
                    const end = minutesFromStart(a.endsAt, startHour)
                    const top = (start / 60) * HOUR_HEIGHT
                    const height = Math.max(20, ((end - start) / 60) * HOUR_HEIGHT - 4)
                    const left = (a.left ?? 0) + 0.5
                    const width = (a.width ?? 100) - 1

                    if (start < 0 || start > totalMinutes) return null

                    const isTransaction = a.type === 'financeiro'
                    const handleClick = () => {
                      if (onAppointmentClick && !isTransaction) {
                        onAppointmentClick(a as Appointment)
                      }
                    }

                    return (
                      <div
                        key={a.id}
                        className={cn(
                          "group absolute overflow-hidden rounded-md border-l-2 px-1.5 py-1 text-[10px] transition-colors hover:brightness-95",
                          TYPE_TINT[a.type],
                          onAppointmentClick && !isTransaction && "cursor-pointer",
                        )}
                        style={{ top, height, left: `${left}%`, width: `${width}%` }}
                        onClick={handleClick}
                      >
                        <div className="flex items-center gap-1">
                          {a.patient && (
                            <PatientAvatar
                              name={a.patient.name}
                              species={a.patient.species}
                              seed={a.patient.id}
                              size="sm"
                              showIcon={false}
                            />
                          )}
                          <div className="flex min-w-0 flex-1 flex-col leading-tight">
                            <span className="truncate font-medium text-foreground">
                              {a.patient?.name || a.veterinarianName}
                            </span>
                            <span className="truncate text-[9px] text-muted-foreground">
                              {new Date(a.startsAt).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                              {a.type === 'financeiro' && ` · ${a.veterinarianName}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
