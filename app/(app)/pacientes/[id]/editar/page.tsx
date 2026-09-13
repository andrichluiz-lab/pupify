"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react"
import { AppTopbar } from "@/components/app-topbar"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { get, put } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import type { Patient } from "@/lib/types"

export default function EditPatientPage() {
  const router = useRouter()
  const params = useParams()
  const { id } = params
  const { toast } = useToast()
  const [neutered, setNeutered] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [patient, setPatient] = useState<Patient | null>(null)
  const [birthDate, setBirthDate] = useState('')

  useEffect(() => {
    async function fetchPatient() {
      try {
        const data = await get<Patient>(`/api/patients/${id}`)
        setPatient(data)
        setNeutered(data.neutered)
        setBirthDate(data.birthDate.split('T')[0])
      } catch (error: unknown) {
        console.error('Error fetching patient:', error)
        toast({
          title: "Erro ao carregar paciente",
          description: "Não foi possível carregar os dados do paciente.",
          variant: "destructive",
        })
        router.push('/pacientes')
      } finally {
        setIsLoading(false)
      }
    }
    if (id) {
      fetchPatient()
    }
  }, [id, router, toast])

  if (isLoading) {
    return (
      <>
        <AppTopbar
          title="Editar paciente"
          description="Carregando dados..."
        />
        <main className="flex items-center justify-center p-4 md:p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </>
    )
  }

  if (!patient) {
    return (
      <>
        <AppTopbar
          title="Editar paciente"
          description="Paciente não encontrado"
        />
        <main className="flex flex-col gap-4 p-4 md:p-6">
          <p className="text-muted-foreground">Paciente não encontrado.</p>
          <Button asChild>
            <Link href="/pacientes">Voltar</Link>
          </Button>
        </main>
      </>
    )
  }

  return (
    <>
      <AppTopbar
        title="Editar paciente"
        description={`Editando ${patient.name}`}
      />

      <main className="flex flex-col gap-4 p-4 md:p-6">
        <Link
          href="/pacientes"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para pacientes
        </Link>

        <form
          className="grid grid-cols-1 gap-4 lg:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setIsSubmitting(true)

            try {
              const formData = new FormData(e.currentTarget)
              
              // Parse allergies and chronic conditions as arrays
              const allergies = formData.get('allergies') as string
              const conditions = formData.get('conditions') as string
              
              const patientData = {
                name: formData.get('name') as string,
                species: formData.get('species') as string,
                breed: formData.get('breed') as string || '',
                sex: formData.get('sex') as string,
                birthDate: birthDate ? new Date(birthDate).toISOString() : new Date().toISOString(),
                weightKg: parseFloat(formData.get('weight') as string) || 0,
                color: formData.get('color') as string || undefined,
                microchip: formData.get('microchip') as string || undefined,
                neutered,
                allergies: allergies ? allergies.split(',').map(a => a.trim()).filter(a => a) : [],
                chronicConditions: conditions ? conditions.split(',').map(c => c.trim()).filter(c => c) : [],
              }

              await put(`/api/patients/${id}`, patientData)

              toast({
                title: "Paciente atualizado com sucesso!",
                description: `${patientData.name} foi atualizado no sistema.`,
              })

              router.push('/pacientes')
            } catch (error: unknown) {
              console.error('Error updating patient:', error)
              toast({
                title: "Erro ao atualizar paciente",
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
            {/* Patient info */}
            <section className="rounded-lg border border-border bg-card p-5">
              <FieldSet>
                <FieldLegend className="text-sm font-medium">Dados do paciente</FieldLegend>
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="name">Nome</FieldLabel>
                      <Input id="name" name="name" defaultValue={patient.name} placeholder="Ex: Thor" required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="species">Espécie</FieldLabel>
                      <Select name="species" defaultValue={patient.species}>
                        <SelectTrigger id="species">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cao">Cão</SelectItem>
                          <SelectItem value="Gato">Gato</SelectItem>
                          <SelectItem value="Ave">Ave</SelectItem>
                          <SelectItem value="Roedor">Roedor</SelectItem>
                          <SelectItem value="Reptil">Réptil</SelectItem>
                          <SelectItem value="Outro">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="breed">Raça</FieldLabel>
                      <Input id="breed" name="breed" defaultValue={patient.breed} placeholder="Ex: Golden Retriever" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="color">Pelagem / cor</FieldLabel>
                      <Input id="color" name="color" defaultValue={patient.color || ''} placeholder="Ex: Caramelo" />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="birthDate">Nascimento</FieldLabel>
                      <DatePicker
                        value={birthDate}
                        onChange={setBirthDate}
                        placeholder="Selecione a data de nascimento"
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="weight">Peso (kg)</FieldLabel>
                      <Input
                        id="weight"
                        name="weight"
                        type="number"
                        step="0.1"
                        min="0"
                        defaultValue={patient.weightKg}
                        placeholder="Ex: 12.5"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>Sexo</FieldLabel>
                      <RadioGroup defaultValue={patient.sex} name="sex" className="flex h-9 items-center gap-4">
                        <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                          <RadioGroupItem value="M" />
                          Macho
                        </Label>
                        <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                          <RadioGroupItem value="F" />
                          Fêmea
                        </Label>
                      </RadioGroup>
                    </Field>
                  </div>

                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldLabel htmlFor="neutered">Castrado</FieldLabel>
                      <FieldDescription>
                        Status reprodutivo do animal
                      </FieldDescription>
                    </FieldContent>
                    <Switch id="neutered" checked={neutered} onCheckedChange={setNeutered} />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="microchip">Microchip (opcional)</FieldLabel>
                    <Input id="microchip" name="microchip" defaultValue={patient.microchip || ''} placeholder="15 dígitos" />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </section>

            {/* Clinical */}
            <section className="rounded-lg border border-border bg-card p-5">
              <FieldSet>
                <FieldLegend className="text-sm font-medium">Informações clínicas</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="allergies">Alergias</FieldLabel>
                    <Input
                      id="allergies"
                      name="allergies"
                      defaultValue={patient.allergies?.join(', ') || ''}
                      placeholder="Ex: Frango, anti-inflamatórios..."
                    />
                    <FieldDescription>Separe por vírgulas</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="conditions">Condições crônicas</FieldLabel>
                    <Textarea
                      id="conditions"
                      name="conditions"
                      rows={3}
                      defaultValue={patient.chronicConditions?.join(', ') || ''}
                      placeholder="Ex: Doença renal crônica, artrose..."
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </section>
          </div>

          {/* Tutor column - read only for now */}
          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-border bg-card p-5">
              <FieldSet>
                <FieldLegend className="text-sm font-medium">Tutor</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Nome completo</FieldLabel>
                    <Input value={patient.tutor?.name || ''} disabled />
                  </Field>
                  <Field>
                    <FieldLabel>Telefone</FieldLabel>
                    <Input value={patient.tutor?.phone || ''} disabled />
                  </Field>
                  <Field>
                    <FieldLabel>E-mail</FieldLabel>
                    <Input value={patient.tutor?.email || ''} disabled />
                  </Field>
                </FieldGroup>
                <FieldDescription className="mt-2">
                  Para editar dados do tutor, acesse a página do tutor.
                </FieldDescription>
              </FieldSet>
            </section>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <Button type="submit" className="w-full gap-1.5" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <UserPlus className="h-3.5 w-3.5" />
                )}
                {isSubmitting ? "Atualizando..." : "Atualizar paciente"}
              </Button>
              <Button type="button" variant="ghost" asChild className="w-full" disabled={isSubmitting}>
                <Link href="/pacientes">Cancelar</Link>
              </Button>
            </div>
          </aside>
        </form>
      </main>
    </>
  )
}
