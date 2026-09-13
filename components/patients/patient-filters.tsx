"use client"

import { useRouter, useSearchParams } from "next/navigation"

const SPECIES_FILTERS = ["Todos", "Cão", "Gato", "Outros"] as const

type Props = {
  summary: {
    total: number
    dogs: number
    cats: number
    others: number
  }
}

export function PatientFilters({ summary }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const speciesFilter = searchParams.get("species") || "Todos"

  const setFilter = (species: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (species === "Todos") {
      params.delete("species")
    } else {
      params.set("species", species)
    }
    router.push(`/pacientes?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
      {SPECIES_FILTERS.map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => setFilter(f)}
          className={
            speciesFilter === f
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
          {f === "Cão" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.dogs}
            </span>
          )}
          {f === "Gato" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.cats}
            </span>
          )}
          {f === "Outros" && (
            <span className="ml-1.5 text-[10px] text-muted-foreground tabular-nums">
              {summary.others}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
