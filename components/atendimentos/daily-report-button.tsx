"use client"

import { useState } from "react"
import { Sparkles, Loader2, TrendingUp, AlertTriangle, BarChart3, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { generateDailyReport, type DailyReportResult } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

const TYPE_LABEL: Record<string, string> = {
  consulta: "Consulta",
  retorno: "Retorno",
  vacina: "Vacina",
  cirurgia: "Cirurgia",
  exame: "Exame",
  banho_tosa: "Banho & Tosa",
  emergencia: "Emergência",
}

interface DailyReportButtonProps {
  date: string
}

export function DailyReportButton({ date }: DailyReportButtonProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<DailyReportResult | null>(null)

  async function handleGenerate() {
    setLoading(true)
    try {
      const result = await generateDailyReport(date)
      setReport(result)
      setOpen(true)
    } catch {
      toast({
        title: "Erro ao gerar relatório",
        description: "Não foi possível gerar o relatório do dia.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formattedDate = (() => {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  })()

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleGenerate}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        {loading ? "Gerando..." : "Relatório do Dia"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Relatório do Dia
            </DialogTitle>
            <DialogDescription>{formattedDate}</DialogDescription>
          </DialogHeader>

          {report && (
            <div className="flex flex-col gap-5">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <div className="text-2xl font-bold">{report.stats.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
                <div className="rounded-lg border bg-green-500/5 border-green-500/20 p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">{report.stats.completed}</div>
                  <div className="text-xs text-muted-foreground">Concluídos</div>
                </div>
                <div className="rounded-lg border bg-destructive/5 border-destructive/20 p-3 text-center">
                  <div className="text-2xl font-bold text-destructive">{report.stats.cancelled}</div>
                  <div className="text-xs text-muted-foreground">Cancelados/Faltas</div>
                </div>
              </div>

              {/* Types breakdown */}
              {Object.keys(report.stats.byType).length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    Por tipo
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(report.stats.byType).map(([type, count]) => (
                      <span
                        key={type}
                        className="rounded-full border px-2.5 py-0.5 text-xs font-medium bg-muted/40"
                      >
                        {TYPE_LABEL[type] ?? type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              {report.summary && (
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm leading-relaxed">{report.summary}</p>
                </div>
              )}

              {/* Highlights */}
              {report.highlights.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
                    <TrendingUp className="h-4 w-4" />
                    Destaques
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {report.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Alerts */}
              {report.alerts.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    Pontos de atenção
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {report.alerts.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                      >
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Feedback */}
              {report.feedback && (
                <div className="flex gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-sm leading-relaxed text-primary/90">{report.feedback}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
