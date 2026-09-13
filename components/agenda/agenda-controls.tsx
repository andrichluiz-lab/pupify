"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

type ViewType = "day" | "week" | "month"

type Props = {
  currentDate: Date
  filteredCount: number
  view: ViewType
  setView: (view: ViewType) => void
}

export function AgendaControls({ currentDate, filteredCount, view, setView }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const navigateDate = (direction: "prev" | "next") => {
    const params = new URLSearchParams(searchParams.toString())
    const newDate = new Date(currentDate)
    
    switch (view) {
      case "day":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1))
        break
      case "week":
        newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7))
        break
      case "month":
        newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1))
        break
    }
    
    params.set("date", newDate.toISOString())
    router.push(`/agenda?${params.toString()}`)
  }

  const goToToday = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("date", new Date().toISOString())
    router.push(`/agenda?${params.toString()}`)
  }

  const setViewParam = (newView: ViewType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("view", newView)
    setView(newView)
    router.push(`/agenda?${params.toString()}`)
  }

  const formatDisplayDate = () => {
    switch (view) {
      case "day":
        return currentDate.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      case "week":
        const weekStart = new Date(currentDate)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        return `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} - ${weekEnd.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`
      case "month":
        return currentDate.toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        })
    }
  }

  return (
    <section className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => navigateDate("prev")}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-medium capitalize">{formatDisplayDate()}</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {filteredCount} atendimentos agendados
          </span>
        </div>
        <button
          type="button"
          aria-label="Próximo"
          onClick={() => navigateDate("next")}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:bg-muted"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={goToToday}
          className="ml-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          Hoje
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
        <button
          type="button"
          onClick={() => setViewParam("day")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            view === "day" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          Dia
        </button>
        <button
          type="button"
          onClick={() => setViewParam("week")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            view === "week" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          Semana
        </button>
        <button
          type="button"
          onClick={() => setViewParam("month")}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            view === "month" ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          }`}
        >
          Mês
        </button>
      </div>
    </section>
  )
}
