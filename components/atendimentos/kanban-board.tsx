"use client"

import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable } from "@dnd-kit/core"
import { useState } from "react"
import type { Appointment, AppointmentStatus } from "@/lib/types"
import { KanbanCard } from "./kanban-card"
import { updateAppointmentStatus } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const COLUMNS: { status: AppointmentStatus; label: string }[] = [
  { status: "agendado", label: "Agendado" },
  { status: "confirmado", label: "Confirmado" },
  { status: "em_atendimento", label: "Em Atendimento" },
  { status: "concluido", label: "Concluído" },
  { status: "cancelado", label: "Cancelado" },
  { status: "falta", label: "Falta" },
]

interface KanbanBoardProps {
  appointments: Appointment[]
  onRefresh: () => void
  onCardClick: (appointment: Appointment) => void
}

function KanbanColumn({ status, label, appointments, onCardClick }: {
  status: AppointmentStatus
  label: string
  appointments: Appointment[]
  onCardClick: (appointment: Appointment) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-w-[280px] flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3 transition-colors",
        isOver && "bg-muted/50"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{label}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
          {appointments.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex flex-col gap-2">
        {appointments.map((appointment) => (
          <KanbanCard
            key={appointment.id}
            appointment={appointment}
            onClick={() => onCardClick(appointment)}
          />
        ))}

        {appointments.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">
            Vazio
          </div>
        )}
      </div>
    </div>
  )
}

export function KanbanBoard({ appointments, onRefresh, onCardClick }: KanbanBoardProps) {
  const { toast } = useToast()
  const [activeId, setActiveId] = useState<string | null>(null)
  const activeAppointment = appointments.find((a) => a.id === activeId)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const getAppointmentsByStatus = (status: AppointmentStatus) => {
    return appointments.filter((a) => a.status === status)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const appointmentId = active.id as string
    const newStatus = over.id as AppointmentStatus

    // Get current status of the appointment
    const currentAppointment = appointments.find(a => a.id === appointmentId)
    if (!currentAppointment) return

    // Don't update if status hasn't changed
    if (currentAppointment.status === newStatus) return

    try {
      await updateAppointmentStatus(appointmentId, newStatus)
      onRefresh()
    } catch (error) {
      console.error("Error updating appointment status:", error)
      toast({
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status do atendimento. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.status}
            status={column.status}
            label={column.label}
            appointments={getAppointmentsByStatus(column.status)}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeAppointment ? (
          <div className="rotate-3 transform opacity-90">
            <KanbanCard appointment={activeAppointment} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
