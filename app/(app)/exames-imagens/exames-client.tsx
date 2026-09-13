"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, X } from "lucide-react"
import { ExamActions } from "@/components/exames-imagens/exam-actions"
import type { ImageExam } from "@/lib/types"

const STATUS_OPTIONS = [
  { value: "all",       label: "Todos" },
  { value: "pendente",  label: "Pendente" },
  { value: "analisando", label: "Analisando" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
] as const

const TYPE_OPTIONS = [
  { value: "all",         label: "Todos" },
  { value: "radiografia", label: "Raio-X" },
  { value: "ultrassom",   label: "Ultrassom" },
  { value: "tomografia",  label: "Tomografia" },
  { value: "ressonancia", label: "Ressonância" },
  { value: "laboratorio", label: "Lab." },
  { value: "outro",       label: "Outro" },
] as const

const STATUS_CLASS: Record<string, string> = {
  concluido:  "bg-green-500/10 text-green-700",
  analisando: "bg-blue-500/10 text-blue-700",
  pendente:   "bg-amber-500/10 text-amber-700",
  cancelado:  "bg-destructive/10 text-destructive",
}

const STATUS_LABEL: Record<string, string> = {
  pendente:   "Pendente",
  analisando: "Analisando",
  concluido:  "Concluído",
  cancelado:  "Cancelado",
}

const TYPE_LABEL: Record<string, string> = {
  radiografia: "Raio-X",
  ultrassom:   "Ultrassom",
  tomografia:  "Tomografia",
  ressonancia: "Ressonância",
  laboratorio: "Laboratório",
  outro:       "Outro",
}

type Props = { exams: ImageExam[] }

export function ExamesClient({ exams: initialExams }: Props) {
  const [exams, setExams] = useState(initialExams)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  function handleDelete(id: string) {
    setExams(prev => prev.filter(e => e.id !== id))
  }

  const filtered = useMemo(() => {
    let items = exams

    if (statusFilter !== "all") {
      items = items.filter(e => e.status === statusFilter)
    }
    if (typeFilter !== "all") {
      items = items.filter(e => e.type === typeFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(e =>
        (e.patient?.name ?? "").toLowerCase().includes(q) ||
        (e.veterinarian?.name ?? "").toLowerCase().includes(q)
      )
    }

    return items
  }, [exams, statusFilter, typeFilter, search])

  return (
    <div className="flex flex-col gap-4">
      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar paciente ou veterinário..."
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
            {STATUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTypeFilter(opt.value)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  typeFilter === opt.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Column headers */}
        <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_120px_112px] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
          <div>Paciente / Tipo</div>
          <div>Veterinário / Data</div>
          <div>Status</div>
          <div className="text-right">Ações</div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {exams.length === 0 ? "Nenhum exame cadastrado." : "Nenhum resultado para os filtros aplicados."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map(exam => (
              <li key={exam.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_120px_112px] md:gap-4">
                  {/* Patient + type */}
                  <Link href={`/exames-imagens/novo?id=${exam.id}`} className="flex min-w-0 flex-col leading-tight">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{exam.patient?.name ?? "Paciente não informado"}</span>
                      <span className="hidden shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground md:inline">
                        {TYPE_LABEL[exam.type] ?? exam.type}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground md:hidden">
                      {TYPE_LABEL[exam.type] ?? exam.type} · {exam.veterinarian?.name ?? "Sem vet."} · {new Date(exam.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </Link>

                  {/* Vet + date */}
                  <div className="hidden min-w-0 flex-col leading-tight md:flex">
                    <span className="truncate text-sm">{exam.veterinarian?.name ?? "Sem veterinário"}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(exam.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="hidden md:block">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[exam.status] ?? "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABEL[exam.status] ?? exam.status}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end">
                    <ExamActions examId={exam.id} onDelete={() => handleDelete(exam.id)} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
