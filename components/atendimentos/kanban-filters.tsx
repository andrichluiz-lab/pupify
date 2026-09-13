"use client"

import { Calendar, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Veterinarian } from "@/lib/types"
import type { AppointmentType } from "@/lib/types"

interface KanbanFiltersProps {
  date: string
  onDateChange: (date: string) => void
  veterinarianId: string
  onVeterinarianChange: (id: string) => void
  type: string
  onTypeChange: (type: string) => void
  veterinarians: Veterinarian[]
  onReset: () => void
}

const APPOINTMENT_TYPES: { value: AppointmentType; label: string }[] = [
  { value: "consulta", label: "Consulta" },
  { value: "retorno", label: "Retorno" },
  { value: "vacina", label: "Vacina" },
  { value: "cirurgia", label: "Cirurgia" },
  { value: "exame", label: "Exame" },
  { value: "banho_tosa", label: "Banho & Tosa" },
  { value: "emergencia", label: "Emergência" },
]

export function KanbanFilters({
  date,
  onDateChange,
  veterinarianId,
  onVeterinarianChange,
  type,
  onTypeChange,
  veterinarians,
  onReset,
}: KanbanFiltersProps) {
  const hasActiveFilters = date || veterinarianId || type

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center">
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
        <span className="text-sm font-medium">Filtros</span>
      </div>

      <div className="flex flex-1 flex-col gap-2 md:flex-row">
        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
          <DatePicker
            value={date}
            onChange={onDateChange}
            placeholder="Filtrar por data"
            className="h-9 w-full md:w-auto"
          />
        </div>

        {/* Veterinarian Filter */}
        <Select value={veterinarianId || undefined} onValueChange={onVeterinarianChange}>
          <SelectTrigger className="h-9 w-full md:w-[200px]">
            <SelectValue placeholder="Todos veterinários" />
          </SelectTrigger>
          <SelectContent>
            {veterinarians.map((vet) => (
              <SelectItem key={vet.id} value={vet.id}>
                {vet.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Type Filter */}
        <Select value={type || undefined} onValueChange={onTypeChange}>
          <SelectTrigger className="h-9 w-full md:w-[180px]">
            <SelectValue placeholder="Todos tipos" />
          </SelectTrigger>
          <SelectContent>
            {APPOINTMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-9 gap-1.5"
        >
          <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          Limpar
        </Button>
      )}
    </div>
  )
}
