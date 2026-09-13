"use client"

import { useState } from "react"
import { Sparkles, Loader2, MessageSquare, Copy, Check, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { generateTutorInstructions, sendWhatsAppMessage, listConversations, startWhatsAppConversation } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Patient } from "@/lib/types"

interface Props {
  draftId: string | null
  hasSoap: boolean
  patient: Patient | null
}

export function TutorInstructionsButton({ draftId, hasSoap, patient }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const [result, setResult] = useState<{ greeting: string; instructions: string[]; followUp: string | null } | null>(null)
  const { toast } = useToast()

  const handleOpen = async () => {
    if (!draftId || !hasSoap) {
      toast({ variant: "destructive", title: "Gere o SOAP antes de criar orientações." })
      return
    }
    setOpen(true)
    if (result) return
    setLoading(true)
    try {
      const data = await generateTutorInstructions(draftId)
      setResult(data)
    } catch {
      toast({ variant: "destructive", title: "Erro ao gerar orientações" })
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  const fullText = result
    ? [
        result.greeting,
        '',
        ...result.instructions.map((i) => `• ${i}`),
        result.followUp ? `\n📅 ${result.followUp}` : null,
      ]
        .filter((l) => l !== null)
        .join('\n')
    : ''

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendWhatsApp = async () => {
    if (!patient?.tutor) {
      toast({ variant: "destructive", title: "Tutor sem telefone cadastrado" })
      return
    }
    setSending(true)
    try {
      const contacts = await listConversations({ tutorId: patient.tutorId })
      let contact = contacts[0]
      if (!contact) {
        contact = await startWhatsAppConversation({ phone: patient.tutor.phone, name: patient.tutor.name })
      }
      await sendWhatsAppMessage(contact.id, fullText)
      toast({ title: "Orientações enviadas via WhatsApp" })
      setOpen(false)
    } catch {
      toast({ variant: "destructive", title: "Erro ao enviar via WhatsApp" })
    } finally {
      setSending(false)
    }
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
        <MessageSquare className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
        Orientações ao tutor
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Orientações ao Tutor
            </DialogTitle>
            <DialogDescription>
              Mensagem personalizada com base na consulta. Envie via WhatsApp ou copie.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Gerando orientações com IA…
            </div>
          )}

          {result && !loading && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                {fullText}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCopy} className="gap-1.5">
                  {copied ? (
                    <><Check className="h-3.5 w-3.5 text-primary" /> Copiado</>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /> Copiar</>
                  )}
                </Button>
                {patient?.tutor?.phone && (
                  <Button onClick={handleSendWhatsApp} disabled={sending} className="gap-1.5">
                    {sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Enviar WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
