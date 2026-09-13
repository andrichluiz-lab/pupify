"use client"

import { useState, useEffect, useCallback } from "react"
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, Loader2, Clock, RefreshCw } from "lucide-react"
import { getHistorySummary } from "@/lib/api"
import { cn } from "@/lib/utils"

interface Props {
  patientId: string
}

type Summary = { bullets: string[]; alerts: string[]; lastVisit: string | null }

const cacheKey = (id: string) => `history_summary_${id}`

export function HistorySummaryPanel({ patientId }: Props) {
  const [open, setOpen] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)

  const fetchSummary = useCallback((force = false) => {
    if (!force) {
      try {
        const cached = sessionStorage.getItem(cacheKey(patientId))
        if (cached) {
          setSummary(JSON.parse(cached))
          return
        }
      } catch {}
    }
    setLoading(true)
    setError(false)
    setSummary(null)
    getHistorySummary(patientId)
      .then(data => {
        setSummary(data)
        try { sessionStorage.setItem(cacheKey(patientId), JSON.stringify(data)) } catch {}
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [patientId])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  function handleRefresh() {
    try { sessionStorage.removeItem(cacheKey(patientId)) } catch {}
    fetchSummary(true)
  }

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Resumo do Histórico</span>
          {summary?.lastVisit && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary/80">
              <Clock className="h-3 w-3" />
              Última visita: {summary.lastVisit}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleRefresh() }}
            className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:text-primary"
            title="Atualizar resumo"
            disabled={loading}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </button>
          {open ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-primary/10 px-4 pb-4 pt-3">
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analisando histórico com IA…
            </div>
          )}

          {error && (
            <p className="text-sm text-muted-foreground">
              Não foi possível gerar o resumo. O histórico pode ser consultado manualmente.
            </p>
          )}

          {summary && !loading && (
            <div className="space-y-3">
              {summary.alerts.length > 0 && (
                <div className="flex flex-col gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  {summary.alerts.map((a, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {a}
                    </div>
                  ))}
                </div>
              )}

              {summary.bullets.length > 0 ? (
                <ul className="space-y-1.5">
                  {summary.bullets.map((b, i) => (
                    <li key={i} className={cn("flex items-start gap-2 text-sm text-foreground/80")}>
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {b}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma consulta anterior registrada.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
