"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Scissors, Loader2 } from "lucide-react"
import { AppTopbar } from "@/components/app-topbar"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { post, get } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import type { Patient, Veterinarian, SurgeryRisk, SurgeryStatus } from "@/lib/types"

export default function NewSurgeryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [patientsData, vetsData] = await Promise.all([
          get<Patient[]>("/api/patients"),
          get<Veterinarian[]>("/api/veterinarians"),
        ])
        setPatients(patientsData)
        setVeterinarians(vetsData)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <>
      <AppTopbar
        title="Nova cirurgia"
        description="Agende um procedimento cirúrgico"
      />

      <main className="flex flex-col gap-4 p-4 md:p-6">
        <Link
          href="/cirurgias"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para cirurgias
        </Link>

        {loading ? (
          <div className="text-center text-muted-foreground">Carregando...</div>
        ) : (
          <form
            className="grid grid-cols-1 gap-4 lg:grid-cols-3"
            onSubmit={async (e) => {
              e.preventDefault()
              setIsSubmitting(true)

              try {
                const formData = new FormData(e.currentTarget)

                const surgeryData = {
                  patientId: formData.get('patientId') as string,
                  veterinarianId: formData.get('veterinarianId') as string,
                  procedure: formData.get('procedure') as string,
                  surgeon: formData.get('surgeon') as string,
                  anesthetist: formData.get('anesthetist') as string || undefined,
                  assistant: formData.get('assistant') as string || undefined,
                  scheduledFor: new Date(formData.get('scheduledFor') as string).toISOString(),
                  estimatedDurationMin: parseInt(formData.get('estimatedDurationMin') as string),
                  room: formData.get('room') as string,
                  risk: formData.get('risk') as SurgeryRisk,
                  status: formData.get('status') as SurgeryStatus,
                  notes: formData.get('notes') as string || undefined,
                }

                await post('/api/surgeries', surgeryData)

                toast({
                  title: "Cirurgia agendada com sucesso!",
                  description: `${surgeryData.procedure} foi agendada para ${new Date(surgeryData.scheduledFor).toLocaleDateString('pt-BR')}.`,
                })

                router.push('/cirurgias')
              } catch (error: unknown) {
                console.error('Error creating surgery:', error)
                toast({
                  title: "Erro ao agendar cirurgia",
                  description: error && typeof error === 'object' && error !== null && 'message' in error 
                    ? (error as { message: string }).message 
                    : "Tente novamente mais tarde.",
                  variant: "destructive",
                })
              } finally {
                setIsSubmitting(false)
              }
            }}
          >
            <div className="flex flex-col gap-4 lg:col-span-2">
              {/* Surgery info */}
              <section className="rounded-lg border border-border bg-card p-5">
                <FieldSet>
                  <FieldLegend className="text-sm font-medium">Dados da cirurgia</FieldLegend>
                  <FieldGroup>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="patientId">Paciente</FieldLabel>
                        <Select name="patientId" required>
                          <SelectTrigger id="patientId">
                            <SelectValue placeholder="Selecione o paciente" />
                          </SelectTrigger>
                          <SelectContent>
                            {patients.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} - {p.species}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="veterinarianId">Veterinário responsável</FieldLabel>
                        <Select name="veterinarianId" required>
                          <SelectTrigger id="veterinarianId">
                            <SelectValue placeholder="Selecione o veterinário" />
                          </SelectTrigger>
                          <SelectContent>
                            {veterinarians.map((v) => (
                              <SelectItem key={v.id} value={v.id}>
                                {v.name} - {v.specialty || 'Veterinário'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="procedure">Procedimento</FieldLabel>
                      <Input id="procedure" name="procedure" placeholder="Ex: Ovariossalpingohisterectomia" required />
                    </Field>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="surgeon">Cirurgião principal</FieldLabel>
                        <Input id="surgeon" name="surgeon" placeholder="Nome do cirurgião" required />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="anesthetist">Anestesista (opcional)</FieldLabel>
                        <Input id="anesthetist" name="anesthetist" placeholder="Nome do anestesista" />
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="assistant">Auxiliar (opcional)</FieldLabel>
                      <Input id="assistant" name="assistant" placeholder="Nome do auxiliar" />
                    </Field>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor="scheduledFor">Data e hora</FieldLabel>
                        <Input id="scheduledFor" name="scheduledFor" type="datetime-local" required />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="estimatedDurationMin">Duração estimada (min)</FieldLabel>
                        <Input
                          id="estimatedDurationMin"
                          name="estimatedDurationMin"
                          type="number"
                          min="1"
                          placeholder="Ex: 60"
                          required
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="room">Sala cirúrgica</FieldLabel>
                        <Input id="room" name="room" placeholder="Ex: Sala 1" required />
                      </Field>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="risk">Risco</FieldLabel>
                        <Select name="risk" defaultValue="baixo" required>
                          <SelectTrigger id="risk">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baixo">Baixo</SelectItem>
                            <SelectItem value="medio">Médio</SelectItem>
                            <SelectItem value="alto">Alto</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="status">Status inicial</FieldLabel>
                        <Select name="status" defaultValue="agendada" required>
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="agendada">Agendada</SelectItem>
                            <SelectItem value="pre_op">Pré-operatório</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="notes">Observações (opcional)</FieldLabel>
                      <Textarea
                        id="notes"
                        name="notes"
                        rows={3}
                        placeholder="Informações adicionais sobre o procedimento..."
                      />
                    </Field>
                  </FieldGroup>
                </FieldSet>
              </section>
            </div>

            {/* Actions column */}
            <aside className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                <Button type="submit" className="w-full gap-1.5" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Scissors className="h-3.5 w-3.5" />
                  )}
                  {isSubmitting ? "Agendando..." : "Agendar cirurgia"}
                </Button>
                <Button type="button" variant="ghost" asChild className="w-full" disabled={isSubmitting}>
                  <Link href="/cirurgias">Cancelar</Link>
                </Button>
              </div>
            </aside>
          </form>
        )}
      </main>
    </>
  )
}
