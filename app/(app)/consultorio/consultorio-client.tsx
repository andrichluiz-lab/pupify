"use client"

import { useState } from "react"
import { Search, X, Sparkles, PenLine } from "lucide-react"
import { ConsultationTable } from "@/components/consultorio/consultation-table"
import type { Consultation, ConsultationDraft } from "@/lib/types"

const STATUS_OPTIONS = [
  { value: "Todos",      countKey: "total" as const },
  { value: "Rascunhos",  countKey: "drafts" as const },
  { value: "Finalizados", countKey: "finalized" as const },
]

const MODE_OPTIONS = [
  { value: "all" as const,    label: "Todos",  icon: null },
  { value: "ai" as const,     label: "IA",     icon: Sparkles },
  { value: "manual" as const, label: "Manual", icon: PenLine },
]

type Props = {
  consultations: Consultation[]
  drafts: ConsultationDraft[]
  summary: { total: number; drafts: number; finalized: number }
}

export function ConsultorioClient({ consultations, drafts, summary }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [modeFilter, setModeFilter] = useState<"all" | "ai" | "manual">("all")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar paciente, veterinário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary sm:w-72"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {STATUS_OPTIONS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setStatusFilter(s.value)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {s.value}
                <span className="ml-1.5 text-[10px] tabular-nums text-muted-foreground">
                  {summary[s.countKey]}
                </span>
              </button>
            ))}
          </div>

          {/* Mode filter */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {MODE_OPTIONS.map(m => {
              const Icon = m.icon
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setModeFilter(m.value)}
                  className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    modeFilter === m.value
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <ConsultationTable
        consultations={consultations}
        drafts={drafts}
        search={search}
        statusFilter={statusFilter}
        modeFilter={modeFilter}
      />
    </div>
  )
}
