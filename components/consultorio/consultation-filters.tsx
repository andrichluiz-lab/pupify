"use client"

import { useRouter, useSearchParams } from "next/navigation"

const STATUS_FILTERS = ["Todos", "Rascunhos", "Finalizados"] as const

type Props = {
  summary: {
    total: number
    drafts: number
    finalized: number
  }
}

export function ConsultationFilters({ summary }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const statusFilter = searchParams.get("status") || "Todos"

  const setFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === "Todos") {
      params.delete("status")
    } else {
      params.set("status", status)
    }
    router.push(`/consultorio?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-card p-1">
      {STATUS_FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => setFilter(f)}
          className={
            statusFilter === f
              ? "rounded px-2.5 py-1 text-xs font-medium bg-muted text-foreground"
              : "rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }
        >
          {f}
          {f === "Todos" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.total}
            </span>
          )}
          {f === "Rascunhos" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.drafts}
            </span>
          )}
          {f === "Finalizados" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.finalized}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
