import { cn } from "@/lib/utils"
import type { Appointment, AgendaEventType } from "@/lib/types"
import { appointmentTypeLabel } from "@/components/shared/status-badge"

const TYPE_TINT: Record<Appointment["type"] | "financeiro", string> = {
  consulta: "bg-sky-500",
  retorno: "bg-teal-500",
  vacina: "bg-emerald-500",
  cirurgia: "bg-rose-500",
  exame: "bg-violet-500",
  banho_tosa: "bg-amber-500",
  emergencia: "bg-destructive",
  financeiro: "bg-indigo-500",
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

type Props = {
  appointments: AgendaEventType[]
  month: Date
}

export function MonthCalendar({ appointments, month }: Props) {
  const now = new Date()
  const year = month.getFullYear()
  const monthNum = month.getMonth()

  // Get first day of month and total days
  const firstDay = new Date(year, monthNum, 1)
  const lastDay = new Date(year, monthNum + 1, 0)
  const totalDays = lastDay.getDate()
  const startDayOfWeek = firstDay.getDay()

  // Get days from previous month to fill first week
  const prevMonthDays = startDayOfWeek

  // Get days from next month to fill last week
  const totalCells = Math.ceil((prevMonthDays + totalDays) / 7) * 7
  const nextMonthDays = totalCells - prevMonthDays - totalDays

  // Generate calendar days
  const calendarDays: Array<{ date: Date; isCurrentMonth: boolean }> = []

  // Previous month days
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const date = new Date(year, monthNum, -i)
    calendarDays.push({ date, isCurrentMonth: false })
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const date = new Date(year, monthNum, i)
    calendarDays.push({ date, isCurrentMonth: true })
  }

  // Next month days
  for (let i = 1; i <= nextMonthDays; i++) {
    const date = new Date(year, monthNum + 1, i)
    calendarDays.push({ date, isCurrentMonth: false })
  }

  // Get appointments for each day
  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((a) => {
      const appointmentDate = new Date(a.startsAt)
      return appointmentDate.toDateString() === date.toDateString()
    })
  }

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium capitalize">{formatMonthYear(month)}</h2>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, i) => {
          const isToday = day.date.toDateString() === now.toDateString()
          const dayAppointments = getAppointmentsForDay(day.date)
          const displayAppointments = dayAppointments.slice(0, 3)
          const hasMore = dayAppointments.length > 3

          return (
            <div
              key={i}
              className={cn(
                "min-h-[80px] rounded-md border border-border bg-card p-1 transition-colors hover:bg-muted/50",
                !day.isCurrentMonth && "bg-muted/30 opacity-50",
                isToday && "border-primary/50"
              )}
            >
              <div
                className={cn(
                  "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                  isToday && "bg-primary text-primary-foreground"
                )}
              >
                {day.date.getDate()}
              </div>
              <div className="flex flex-col gap-0.5">
                {displayAppointments.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "truncate rounded px-1 py-0.5 text-[10px] text-white",
                      TYPE_TINT[a.type]
                    )}
                    title={`${a.patient?.name || a.veterinarianName} - ${a.type === 'financeiro' ? 'Financeiro' : appointmentTypeLabel(a.type)}`}
                  >
                    {a.patient?.name || a.veterinarianName}
                  </div>
                ))}
                {hasMore && (
                  <div className="px-1 py-0.5 text-[10px] text-muted-foreground">
                    +{dayAppointments.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
