"use client"

import { useRouter, useSearchParams } from "next/navigation"

const STATUS_FILTERS = ["Todos", "Agendada", "Pré-operatório", "Em andamento", "Recuperação", "Concluída", "Cancelada"] as const

const STATUS_MAP: Record<string, string> = {
  "Agendada": "agendada",
  "Pré-operatório": "pre_op",
  "Em andamento": "em_andamento",
  "Recuperação": "recuperacao",
  "Concluída": "concluida",
  "Cancelada": "cancelada",
}

type Props = {
  summary: {
    total: number
    agendada: number
    pre_op: number
    em_andamento: number
    recuperacao: number
    concluida: number
    cancelada: number
  }
}

export function SurgeryFilters({ summary }: Props) {
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
    router.push(`/cirurgias?${params.toString()}`)
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
          {f === "Agendada" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.agendada}
            </span>
          )}
          {f === "Pré-operatório" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.pre_op}
            </span>
          )}
          {f === "Em andamento" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.em_andamento}
            </span>
          )}
          {f === "Recuperação" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.recuperacao}
            </span>
          )}
          {f === "Concluída" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.concluida}
            </span>
          )}
          {f === "Cancelada" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.cancelada}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
