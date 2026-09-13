"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
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
import { get, put } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import type { Patient, Veterinarian, Surgery, SurgeryRisk, SurgeryStatus } from "@/lib/types"

export default function EditSurgeryPage() {
  const router = useRouter()
  const params = useParams()
  const { id } = params
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [surgery, setSurgery] = useState<Surgery | null>(null)
  const [patients, setPatients] = useState<Patient[]>([])
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        const [surgeryData, patientsData, vetsData] = await Promise.all([
          get<Surgery>(`/api/surgeries/${id}`),
          get<Patient[]>("/api/patients"),
          get<Veterinarian[]>("/api/veterinarians"),
        ])
        setSurgery(surgeryData)
        setPatients(patientsData)
        setVeterinarians(vetsData)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: "Erro ao carregar cirurgia",
          description: "Não foi possível carregar os dados da cirurgia.",
          variant: "destructive",
        })
        router.push('/cirurgias')
      } finally {
        setIsLoading(false)
      }
    }
    if (id) {
      fetchData()
    }
  }, [id, router, toast])

  if (isLoading) {
    return (
      <>
        <AppTopbar
          title="Editar cirurgia"
          description="Carregando dados..."
        />
        <main className="flex items-center justify-center p-4 md:p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </>
    )
  }

  if (!surgery) {
    return (
      <>
        <AppTopbar
          title="Editar cirurgia"
          description="Cirurgia não encontrada"
        />
        <main className="flex flex-col gap-4 p-4 md:p-6">
          <p className="text-muted-foreground">Cirurgia não encontrada.</p>
          <Button asChild>
            <Link href="/cirurgias">Voltar</Link>
          </Button>
        </main>
      </>
    )
  }

  // Format datetime-local input value from ISO string
  const formatDateTimeLocal = (isoString: string) => {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  return (
    <>
      <AppTopbar
        title="Editar cirurgia"
        description={`Editando ${surgery.procedure}`}
      />

      <main className="flex flex-col gap-4 p-4 md:p-6">
        <Link
          href="/cirurgias"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para cirurgias
        </Link>

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

              await put(`/api/surgeries/${id}`, surgeryData)

              toast({
                title: "Cirurgia atualizada com sucesso!",
                description: `${surgeryData.procedure} foi atualizada.`,
              })

              router.push('/cirurgias')
            } catch (error: unknown) {
              console.error('Error updating surgery:', error)
              toast({
                title: "Erro ao atualizar cirurgia",
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
                      <Select name="patientId" defaultValue={surgery.patientId} required>
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
                      <Select name="veterinarianId" defaultValue={surgery.veterinarianId} required>
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
                    <Input id="procedure" name="procedure" defaultValue={surgery.procedure} placeholder="Ex: Ovariossalpingohisterectomia" required />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="surgeon">Cirurgião principal</FieldLabel>
                      <Input id="surgeon" name="surgeon" defaultValue={surgery.surgeon} placeholder="Nome do cirurgião" required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="anesthetist">Anestesista (opcional)</FieldLabel>
                      <Input id="anesthetist" name="anesthetist" defaultValue={surgery.anesthetist || ''} placeholder="Nome do anestesista" />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="assistant">Auxiliar (opcional)</FieldLabel>
                    <Input id="assistant" name="assistant" defaultValue={surgery.assistant || ''} placeholder="Nome do auxiliar" />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="scheduledFor">Data e hora</FieldLabel>
                      <Input id="scheduledFor" name="scheduledFor" type="datetime-local" defaultValue={formatDateTimeLocal(surgery.scheduledFor)} required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="estimatedDurationMin">Duração estimada (min)</FieldLabel>
                      <Input
                        id="estimatedDurationMin"
                        name="estimatedDurationMin"
                        type="number"
                        min="1"
                        defaultValue={surgery.estimatedDurationMin}
                        placeholder="Ex: 60"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="room">Sala cirúrgica</FieldLabel>
                      <Input id="room" name="room" defaultValue={surgery.room} placeholder="Ex: Sala 1" required />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="risk">Risco</FieldLabel>
                      <Select name="risk" defaultValue={surgery.risk} required>
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
                      <FieldLabel htmlFor="status">Status</FieldLabel>
                      <Select name="status" defaultValue={surgery.status} required>
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agendada">Agendada</SelectItem>
                          <SelectItem value="pre_op">Pré-operatório</SelectItem>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="recuperacao">Recuperação</SelectItem>
                          <SelectItem value="concluida">Concluída</SelectItem>
                          <SelectItem value="cancelada">Cancelada</SelectItem>
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
                      defaultValue={surgery.notes || ''}
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
                {isSubmitting ? "Atualizando..." : "Atualizar cirurgia"}
              </Button>
              <Button type="button" variant="ghost" asChild className="w-full" disabled={isSubmitting}>
                <Link href="/cirurgias">Cancelar</Link>
              </Button>
            </div>
          </aside>
        </form>
      </main>
    </>
  )
}
