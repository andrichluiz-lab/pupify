"use client"

import { useState } from "react"
import { Sparkles, Loader2, ClipboardList, Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { generateDischargeReport } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Props {
  hospitalizationId: string
  patientName: string
}

export function DischargeReportButton({ hospitalizationId, patientName }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ report: string; instructions: string[] } | null>(null)
  const { toast } = useToast()

  const handleGenerate = async () => {
    setOpen(true)
    if (result) return // já gerado
    setLoading(true)
    try {
      const data = await generateDischargeReport(hospitalizationId)
      setResult(data)
    } catch {
      toast({ variant: "destructive", title: "Erro ao gerar relatório de alta" })
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!result) return
    const text = [result.report, '', 'Orientações ao tutor:', ...result.instructions.map(i => `• ${i}`)].join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleGenerate}
        className="h-8 w-8"
        title="Gerar relatório de alta com IA"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Relatório de Alta — {patientName}
            </DialogTitle>
            <DialogDescription>
              Gerado com IA com base nos dados da internação. Revise antes de usar.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Gerando relatório com IA…
            </div>
          )}

          {result && !loading && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Relatório</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{result.report}</p>
              </div>

              {result.instructions.length > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-primary mb-2">Orientações ao tutor</p>
                  <ul className="flex flex-col gap-1.5">
                    {result.instructions.map((inst, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        {inst}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCopy} className="gap-1.5">
                  {copied ? (
                    <><Check className="h-3.5 w-3.5 text-primary" /> Copiado</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copiar</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
