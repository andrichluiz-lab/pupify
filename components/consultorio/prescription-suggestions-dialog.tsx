"use client"

import { useState } from "react"
import { Sparkles, Loader2, Trash2, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { suggestPrescriptions, type PrescriptionSuggestion } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface Props {
  draftId: string | null
  hasSoap: boolean
  onConfirm: (prescriptions: PrescriptionSuggestion[]) => void
}

export function PrescriptionSuggestionsButton({ draftId, hasSoap, onConfirm }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<PrescriptionSuggestion[]>([])
  const { toast } = useToast()

  const handleOpen = async () => {
    if (!draftId || !hasSoap) {
      toast({ variant: "destructive", title: "Gere o SOAP antes de sugerir prescrições." })
      return
    }
    setOpen(true)
    setLoading(true)
    try {
      const result = await suggestPrescriptions(draftId)
      setSuggestions(result)
    } catch {
      toast({ variant: "destructive", title: "Erro ao gerar sugestões", description: "Tente novamente." })
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const update = (index: number, field: keyof PrescriptionSuggestion, value: string) => {
    setSuggestions((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    )
  }

  const remove = (index: number) => {
    setSuggestions((prev) => prev.filter((_, i) => i !== index))
  }

  const handleConfirm = () => {
    onConfirm(suggestions)
    setOpen(false)
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpen}
        disabled={!hasSoap || !draftId}
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
        Sugerir prescrição
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Sugestões de Prescrição
            </DialogTitle>
            <DialogDescription>
              Geradas com base no SOAP da consulta. Revise e edite antes de confirmar.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Analisando SOAP com IA…
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhuma prescrição sugerida para este SOAP.
            </p>
          )}

          {!loading && suggestions.length > 0 && (
            <div className="flex flex-col gap-4">
              {suggestions.map((s, i) => (
                <div key={i} className="rounded-lg border border-border p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Prescrição {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="text-xs text-muted-foreground">Medicamento</label>
                      <Input
                        value={s.drug}
                        onChange={(e) => update(i, "drug", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Dose</label>
                      <Input
                        value={s.dose}
                        onChange={(e) => update(i, "dose", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Via</label>
                      <Input
                        value={s.route}
                        onChange={(e) => update(i, "route", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Frequência</label>
                      <Input
                        value={s.frequency}
                        onChange={(e) => update(i, "frequency", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Duração</label>
                      <Input
                        value={s.duration}
                        onChange={(e) => update(i, "duration", e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    {s.notes && (
                      <div className="col-span-2">
                        <label className="text-xs text-muted-foreground">Observações</label>
                        <Input
                          value={s.notes}
                          onChange={(e) => update(i, "notes", e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleConfirm} className="gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Confirmar {suggestions.length} prescrição{suggestions.length !== 1 ? "ões" : ""}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
