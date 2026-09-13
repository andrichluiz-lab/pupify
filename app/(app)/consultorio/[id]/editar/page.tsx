"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getConsultation, updateConsultation } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Consultation } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

export default function EditarConsultaPage({ params }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { id } = use(params)
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const data = await getConsultation(id)
        if (!data) {
          toast({ variant: "destructive", title: "Erro", description: "Consulta não encontrada." })
          router.push("/consultorio")
          return
        }
        setConsultation(data)
      } catch (error) {
        console.error("Error fetching consultation:", error)
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar a consulta." })
        router.push("/consultorio")
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [id])

  const handleSave = async () => {
    if (!consultation) return

    setIsSaving(true)
    try {
      await updateConsultation(id, consultation)
      toast({ title: "Consulta atualizada", description: "As alterações foram salvas com sucesso." })
      router.push(`/consultorio/${id}`)
    } catch (error) {
      console.error("Error updating consultation:", error)
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Tente novamente." })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!consultation) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </button>
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">Editar consulta</h1>
            <p className="truncate text-xs text-muted-foreground">
              {consultation.patient?.name} — {new Date(consultation.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            Cancelar
          </Button>
          <Button size="sm" className="gap-1.5" disabled={isSaving} onClick={handleSave}>
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" strokeWidth={2} />
            )}
            {isSaving ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </div>

      <main className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-medium">Detalhes da consulta</h2>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium">Queixa principal</label>
            <input
              type="text"
              value={consultation.chiefComplaint || ""}
              onChange={(e) => setConsultation({ ...consultation, chiefComplaint: e.target.value })}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {consultation.soap && (
          <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-medium">SOAP</h2>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium">Subjetivo</label>
                <textarea
                  value={consultation.soap.subjective || ""}
                  onChange={(e) => setConsultation({
                    ...consultation,
                    soap: { ...consultation.soap, subjective: e.target.value }
                  })}
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium">Objetivo</label>
                <textarea
                  value={consultation.soap.objective || ""}
                  onChange={(e) => setConsultation({
                    ...consultation,
                    soap: { ...consultation.soap, objective: e.target.value }
                  })}
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium">Avaliação</label>
                <textarea
                  value={consultation.soap.assessment || ""}
                  onChange={(e) => setConsultation({
                    ...consultation,
                    soap: { ...consultation.soap, assessment: e.target.value }
                  })}
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium">Plano</label>
                <textarea
                  value={consultation.soap.plan || ""}
                  onChange={(e) => setConsultation({
                    ...consultation,
                    soap: { ...consultation.soap, plan: e.target.value }
                  })}
                  rows={3}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
