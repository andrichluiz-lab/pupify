"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"
import { AppTopbar } from "@/components/app-topbar"
import { KanbanBoard } from "@/components/atendimentos/kanban-board"
import { KanbanFilters } from "@/components/atendimentos/kanban-filters"
import { AppointmentDetailDialog } from "@/components/atendimentos/appointment-detail-dialog"
import { AppointmentFormDialog } from "@/components/agenda/appointment-form-dialog"
import { DailyReportButton } from "@/components/atendimentos/daily-report-button"
import { listKanbanAppointments, listVeterinarians } from "@/lib/api"
import type { Appointment, Veterinarian, KanbanFilters as KanbanFiltersType } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function AtendimentosPage() {
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [preselectedPatientId, setPreselectedPatientId] = useState<string | undefined>()

  // Filters
  const [filters, setFilters] = useState<KanbanFiltersType>({
    date: (() => {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    })(), // Default to today (local time)
  })

  const fetchData = useCallback(async () => {
    try {
      const [appointmentsData, vetsData] = await Promise.all([
        listKanbanAppointments(filters),
        listVeterinarians(),
      ])
      setAppointments(appointmentsData)
      setVeterinarians(vetsData)
    } catch (error: unknown) {
      console.error("Error fetching kanban data:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os atendimentos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [filters, toast])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Auto-open create dialog when redirected from patient registration
  useEffect(() => {
    if (searchParams.get('newAppointment') === 'true') {
      const pid = searchParams.get('patientId') || undefined
      setPreselectedPatientId(pid)
      setIsCreateDialogOpen(true)
    }
  }, [searchParams])

  const handleRefresh = () => {
    setLoading(true)
    listKanbanAppointments(filters)
      .then(setAppointments)
      .catch((error) => {
        console.error("Error refreshing appointments:", error)
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível atualizar os atendimentos.",
          variant: "destructive",
        })
      })
      .finally(() => setLoading(false))
  }

  const handleCardClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setIsDetailDialogOpen(true)
  }

  const handleDateChange = (date: string) => {
    setFilters((prev) => ({ ...prev, date }))
  }

  const handleVeterinarianChange = (veterinarianId: string) => {
    setFilters((prev) => ({ ...prev, veterinarianId: veterinarianId || undefined }))
  }

  const handleTypeChange = (type: string) => {
    setFilters((prev) => ({ ...prev, type: (type as AppointmentType) || undefined }))
  }

  const handleResetFilters = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setFilters({
      date: `${year}-${month}-${day}`,
    })
  }

  const handleCreateAppointment = async (data: Partial<Appointment>) => {
    const { createAppointmentAction } = await import("./actions")
    const result = await createAppointmentAction(data)

    if (result.success) {
      toast({
        title: "Atendimento criado",
        description: "O atendimento foi agendado com sucesso.",
      })
      handleRefresh()
      setIsCreateDialogOpen(false)
    } else {
      toast({
        title: "Erro ao criar atendimento",
        description: result.error || "Não foi possível criar o atendimento.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <>
        <AppTopbar
          title="Atendimentos"
          description="Gerencie os atendimentos da clínica em tempo real"
          action={{ label: "Novo Atendimento", onClick: () => setIsCreateDialogOpen(true) }}
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
        title="Atendimentos"
        description="Gerencie os atendimentos da clínica em tempo real"
        action={{ label: "Novo Atendimento", onClick: () => setIsCreateDialogOpen(true) }}
      />

      <main className="flex flex-col gap-4 p-4 md:p-6">
        {/* Filters + AI Report */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-end">
            <DailyReportButton date={filters.date || new Date().toISOString().split("T")[0]} />
          </div>
          <KanbanFilters
            date={filters.date || ""}
            onDateChange={handleDateChange}
            veterinarianId={filters.veterinarianId || ""}
            onVeterinarianChange={handleVeterinarianChange}
            type={filters.type || ""}
            onTypeChange={handleTypeChange}
            veterinarians={veterinarians}
            onReset={handleResetFilters}
          />
        </div>

        {/* Kanban Board */}
        <KanbanBoard
          appointments={appointments}
          onRefresh={handleRefresh}
          onCardClick={handleCardClick}
        />
      </main>

      {/* Detail Dialog */}
      <AppointmentDetailDialog
        appointment={selectedAppointment}
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        onRefresh={handleRefresh}
      />

      {/* Create Dialog */}
      <AppointmentFormDialog
        open={isCreateDialogOpen}
        onOpenChange={(open) => {
          setIsCreateDialogOpen(open)
          if (!open) setPreselectedPatientId(undefined)
        }}
        onSave={handleCreateAppointment}
        initialData={preselectedPatientId ? { patientId: preselectedPatientId } : undefined}
      />
    </>
  )
}
