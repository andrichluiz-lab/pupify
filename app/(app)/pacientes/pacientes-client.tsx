"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Search, X } from "lucide-react"
import { TutorTable } from "@/components/tutors/tutor-table"
import type { TutorWithDetails } from "@/lib/types"

const SPECIES_OPTIONS = [
  { value: "Cao",    label: "Cães",     emoji: "🐕" },
  { value: "Gato",   label: "Gatos",    emoji: "🐈" },
  { value: "Ave",    label: "Aves",     emoji: "🦜" },
  { value: "Roedor", label: "Roedores", emoji: "🐹" },
  { value: "Reptil", label: "Répteis",  emoji: "🦎" },
]

const SORT_OPTIONS = [
  { value: "name",    label: "Nome" },
  { value: "recent",  label: "Recentes" },
  { value: "animals", label: "Animais" },
]

type Props = {
  tutors: TutorWithDetails[]
  sortOrder: string
}

export function PacientesClient({ tutors, sortOrder }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [speciesFilter, setSpeciesFilter] = useState<string | null>(null)

  function setSort(sort: string) {
    router.push(`/pacientes?sort=${sort}`)
  }

  const filtered = useMemo(() => {
    let items = tutors

    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.phone?.toLowerCase().includes(q) ?? false) ||
        (t.cpf?.toLowerCase().includes(q) ?? false) ||
        (t.email?.toLowerCase().includes(q) ?? false)
      )
    }

    if (speciesFilter) {
      items = items.filter(t => t.patients.some(p => p.species === speciesFilter))
    }

    return items
  }, [tutors, search, speciesFilter])

  const isFiltered = search.trim() !== "" || speciesFilter !== null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone, CPF..."
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
          {/* Species filter */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setSpeciesFilter(null)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                speciesFilter === null
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              Todos
            </button>
            {SPECIES_OPTIONS.map(s => (
              <button
                key={s.value}
                type="button"
                title={s.label}
                onClick={() => setSpeciesFilter(speciesFilter === s.value ? null : s.value)}
                className={`rounded px-2 py-1 text-sm transition-colors ${
                  speciesFilter === s.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {s.emoji}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {SORT_OPTIONS.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSort(s.value)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  sortOrder === s.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {isFiltered && filtered.length !== tutors.length && (
        <p className="text-xs text-muted-foreground">
          Mostrando {filtered.length} de {tutors.length} clientes
          <button
            type="button"
            onClick={() => { setSearch(""); setSpeciesFilter(null) }}
            className="ml-2 text-primary hover:underline"
          >
            Limpar filtros
          </button>
        </p>
      )}

      <TutorTable tutors={filtered} />
    </div>
  )
}
