"use client"

import { useRouter, useSearchParams } from "next/navigation"

const STATUS_FILTERS = ["Todos", "Estável", "Observação", "Crítico", "Recuperação"] as const

const STATUS_MAP: Record<string, string> = {
  "Estável": "estavel",
  "Observação": "observacao",
  "Crítico": "critico",
  "Recuperação": "recuperacao",
}

type Props = {
  summary: {
    total: number
    estavel: number
    observacao: number
    critico: number
    recuperacao: number
  }
}

export function HospitalizationFilters({ summary }: Props) {
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
    router.push(`/internacao?${params.toString()}`)
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
          {f === "Estável" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.estavel}
            </span>
          )}
          {f === "Observação" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.observacao}
            </span>
          )}
          {f === "Crítico" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.critico}
            </span>
          )}
          {f === "Recuperação" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.recuperacao}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
