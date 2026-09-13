"use client"

import { useState, useMemo, Suspense } from "react"
import { Plus } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { AppTopbar } from "@/components/app-topbar"
import { DayTimeline } from "@/components/agenda/day-timeline"
import { WeekTimeline } from "@/components/agenda/week-timeline"
import { MonthCalendar } from "@/components/agenda/month-calendar"
import { AgendaControls } from "@/components/agenda/agenda-controls"
import { AppointmentFormDialog } from "@/components/agenda/appointment-form-dialog"
import { listAppointments, listVeterinarians, listTransactions, getTenantOperatingHours } from "@/lib/api"
import { calculateAgendaHourRange } from "@/lib/agenda-utils"
import { AppointmentDetailDialog } from "@/components/atendimentos/appointment-detail-dialog"
import type { Appointment, Veterinarian, AgendaEventType, FinancialTransaction } from "@/lib/types"
import { useEffect } from "react"

const TYPE_LEGEND = [
  { label: "Consulta", className: "bg-sky-500" },
  { label: "Retorno", className: "bg-teal-500" },
  { label: "Vacina", className: "bg-emerald-500" },
  { label: "Cirurgia", className: "bg-rose-500" },
  { label: "Exame", className: "bg-violet-500" },
  { label: "Banho & Tosa", className: "bg-amber-500" },
]

type ViewType = "day" | "week" | "month"

function AgendaContent() {
  const searchParams = useSearchParams()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [vets, setVets] = useState<Veterinarian[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewType>("day")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hourRange, setHourRange] = useState({ startHour: 7, endHour: 20 })
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)

  // Sync view and date with URL search params
  useEffect(() => {
    const viewParam = searchParams.get("view") as ViewType
    if (viewParam && ["day", "week", "month"].includes(viewParam)) {
      setView(viewParam)
    }
    const dateParam = searchParams.get("date")
    if (dateParam) {
      setCurrentDate(new Date(dateParam))
    }
  }, [searchParams])

  useEffect(() => {
    async function fetchData() {
      try {
        const [appointmentsData, transactionsData, vetsData, operatingHours] = await Promise.all([
          listAppointments(),
          listTransactions(),
          listVeterinarians(),
          getTenantOperatingHours(),
        ])
        setAppointments(appointmentsData)
        setTransactions(transactionsData)
        setVets(vetsData)
        setHourRange(calculateAgendaHourRange(operatingHours))
      } catch (error: unknown) {
        console.error("Error fetching agenda data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleCreateAppointment = async (data: Partial<Appointment>) => {
    try {
      const { createAppointmentAction } = await import("../agenda/actions")
      const result = await createAppointmentAction(data)

      if (result.success) {
        const [appointmentsData, transactionsData, vetsData] = await Promise.all([
          listAppointments(),
          listTransactions(),
          listVeterinarians(),
        ])
        setAppointments(appointmentsData)
        setTransactions(transactionsData)
        setVets(vetsData)
        setIsDialogOpen(false)
      } else {
        console.error("Failed to create appointment:", result.error)
      }
    } catch (error: unknown) {
      console.error("Error creating appointment:", error)
    }
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setIsDetailDialogOpen(true)
  }

  const handleRefresh = async () => {
    const [appointmentsData, transactionsData, vetsData] = await Promise.all([
      listAppointments(),
      listTransactions(),
      listVeterinarians(),
    ])
    setAppointments(appointmentsData)
    setTransactions(transactionsData)
    setVets(vetsData)
  }

  // Convert transactions to appointment-like format for display
  const convertTransactionsToEvents = (txs: FinancialTransaction[]): AgendaEventType[] => {
    return txs
      .filter(tx => tx.dueDate)
      .map(tx => ({
        id: `tx-${tx.id}`,
        type: 'financeiro' as const,
        startsAt: tx.dueDate,
        endsAt: tx.dueDate,
        patient: null,
        veterinarianName: tx.counterparty || 'Financeiro',
        description: tx.description,
        amount: tx.amount,
        direction: tx.direction,
        isTransaction: true as const,
      }))
  }

  // Filter events based on view
  const filteredEvents = useMemo(() => {
    const transactionEvents = convertTransactionsToEvents(transactions)
    const allEvents = [...appointments, ...transactionEvents]

    switch (view) {
      case "day": {
        const dayStart = new Date(currentDate)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(currentDate)
        dayEnd.setHours(23, 59, 59, 999)
        return allEvents.filter((a) => {
          const eventDate = new Date(a.startsAt)
          return eventDate >= dayStart && eventDate <= dayEnd
        })
      }
      case "week": {
        const weekStart = new Date(currentDate)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        weekStart.setHours(0, 0, 0, 0)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)
        return allEvents.filter((a) => {
          const eventDate = new Date(a.startsAt)
          return eventDate >= weekStart && eventDate <= weekEnd
        })
      }
      case "month": {
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)
        return allEvents.filter((a) => {
          const eventDate = new Date(a.startsAt)
          return eventDate >= monthStart && eventDate <= monthEnd
        })
      }
    }
  }, [appointments, transactions, view, currentDate])

  if (loading) {
    return (
      <>
        <AppTopbar
          title="Agenda"
          description="Visualize e organize os atendimentos da clínica"
          action={{ label: "Novo agendamento", onClick: () => setIsDialogOpen(true) }}
        />
        <main className="flex flex-col gap-4 p-4 md:p-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </main>
      </>
    )
  }

  return (
    <>
      <AppTopbar
        title="Agenda"
        description="Visualize e organize os atendimentos da clínica"
        action={{ label: "Novo agendamento", onClick: () => setIsDialogOpen(true) }}
      />

      <main className="flex flex-col gap-4 p-4 md:p-6">
        <AgendaControls
          currentDate={currentDate}
          filteredCount={filteredEvents.length}
          view={view}
          setView={setView}
        />

        {/* Main content */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_260px]">
          {/* Timeline/Calendar */}
          <div className="overflow-hidden rounded-lg border border-border bg-background p-3">
            {view === "day" && (
              <DayTimeline
                appointments={filteredEvents}
                startHour={hourRange.startHour}
                endHour={hourRange.endHour}
                onAppointmentClick={handleAppointmentClick}
              />
            )}
            {view === "week" && (
              <WeekTimeline
                appointments={filteredEvents}
                weekStart={new Date(currentDate)}
                startHour={hourRange.startHour}
                endHour={hourRange.endHour}
                onAppointmentClick={handleAppointmentClick}
              />
            )}
            {view === "month" && <MonthCalendar appointments={filteredEvents} month={currentDate} />}
          </div>

          {/* Side panel */}
          <aside className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Legenda
              </h3>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {TYPE_LEGEND.map((t) => (
                  <div key={t.label} className="flex items-center gap-2 text-xs">
                    <span className={`h-2 w-2 rounded-full ${t.className}`} />
                    {t.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Veterinários
              </h3>
              <ul className="flex flex-col gap-2">
                {vets.map((v) => {
                  const initials = v.name
                    .replace(/^Dra?\. /, "")
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                  return (
                    <li key={v.id} className="flex items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
                        {initials}
                      </div>
                      <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-xs font-medium">{v.name}</span>
                        <span className="truncate text-[10px] text-muted-foreground">
                          {v.specialty}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            <button
              type="button"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-dashed border-border bg-card text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Bloquear horário
            </button>
          </aside>
        </section>
      </main>

      <AppointmentFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleCreateAppointment}
      />

      <AppointmentDetailDialog
        appointment={selectedAppointment}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onRefresh={handleRefresh}
      />
    </>
  )
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-4 md:p-6">Carregando...</div>}>
      <AgendaContent />
    </Suspense>
  )
}
