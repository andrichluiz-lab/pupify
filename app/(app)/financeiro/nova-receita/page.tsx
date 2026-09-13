"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, TrendingUp, Loader2, Calendar as CalendarIcon } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MaskedInput, masks } from "@/components/ui/masked-input"
import { Combobox, type ComboboxOption } from "@/components/ui/combobox"
import { post } from "@/lib/api-client"
import { listPatients, listTutors, listAppointments } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ptBR as ptBRDayPicker } from "react-day-picker/locale"
import type { TxCategory, TxMethod, TxStatus } from "@/lib/types"
import type { Patient, Tutor, Appointment } from "@/lib/types"

export default function NewRevenuePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [selectedTutorId, setSelectedTutorId] = useState<string>('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('')
  const [loadingOptions, setLoadingOptions] = useState(true)

  useEffect(() => {
    async function loadOptions() {
      try {
        const [patientsData, tutorsData, appointmentsData] = await Promise.all([
          listPatients(),
          listTutors(),
          listAppointments(),
        ])
        setPatients(patientsData)
        setTutors(tutorsData)
        setAppointments(appointmentsData)
      } catch (error) {
        console.error('Error loading options:', error)
      } finally {
        setLoadingOptions(false)
      }
    }
    loadOptions()
  }, [])

  const patientOptions: ComboboxOption[] = patients.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.species})`,
  }))

  const tutorOptions: ComboboxOption[] = tutors.map((t) => ({
    value: t.id,
    label: t.name,
  }))

  const appointmentOptions: ComboboxOption[] = appointments.map((a) => ({
    value: a.id,
    label: `${format(new Date(a.startsAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })} - ${a.type}`,
  }))

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      const transactionData = {
        direction: 'entrada' as const,
        category: formData.get('category') as TxCategory,
        description: formData.get('description') as string,
        amount: parseFloat(amount.replace(/[^\d.,]/g, '').replace(',', '.').replace('.', '').replace(',', '.')) || 0,
        status: formData.get('status') as TxStatus,
        dueDate: dueDate ? dueDate.toISOString() : new Date().toISOString(),
        counterparty: formData.get('counterparty') as string,
        method: formData.get('method') as TxMethod || undefined,
        patientId: selectedPatientId || undefined,
        tutorId: selectedTutorId || undefined,
        appointmentId: selectedAppointmentId || undefined,
      }

      await post('/api/financial/transactions', transactionData)

      toast({
        title: "Receita cadastrada com sucesso!",
        description: `${transactionData.description} foi adicionada ao sistema.`,
      })

      router.push('/financeiro')
    } catch (error: unknown) {
      console.error('Error creating revenue:', error)
      toast({
        title: "Erro ao cadastrar receita",
        description: error && typeof error === 'object' && error !== null && 'message' in error 
          ? (error as { message: string }).message 
          : "Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AppTopbar
        title="Nova receita"
        description="Cadastre uma entrada financeira"
      />

      <main className="flex flex-col gap-4 p-4 md:p-6">
        <Link
          href="/financeiro"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para financeiro
        </Link>

        <form
          className="grid grid-cols-1 gap-4 lg:grid-cols-3"
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Basic info */}
            <section className="rounded-lg border border-border bg-card p-5">
              <FieldSet>
                <FieldLegend className="text-sm font-medium">Dados da receita</FieldLegend>
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="category">Categoria *</FieldLabel>
                      <Select name="category" defaultValue="consulta">
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consulta">Consulta</SelectItem>
                          <SelectItem value="cirurgia">Cirurgia</SelectItem>
                          <SelectItem value="exame">Exame</SelectItem>
                          <SelectItem value="produto">Produto</SelectItem>
                          <SelectItem value="outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="status">Status *</FieldLabel>
                      <Select name="status" defaultValue="pago">
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="atrasado">Atrasado</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="description">Descrição *</FieldLabel>
                    <Input id="description" name="description" placeholder="Ex: Consulta veterinária" required />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="amount">Valor (R$) *</FieldLabel>
                      <MaskedInput
                        id="amount"
                        name="amount"
                        mask={masks.currency}
                        value={amount}
                        onChange={setAmount}
                        placeholder="R$ 0,00"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="dueDate">Data de vencimento *</FieldLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" strokeWidth={1.75} />
                            {dueDate ? format(dueDate, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione a data'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={(date) => {
                              setDueDate(date)
                              setIsCalendarOpen(false)
                            }}
                            initialFocus
                            locale={ptBRDayPicker}
                          />
                        </PopoverContent>
                      </Popover>
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </section>

            {/* Payment details */}
            <section className="rounded-lg border border-border bg-card p-5">
              <FieldSet>
                <FieldLegend className="text-sm font-medium">Detalhes do pagamento</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="method">Método de pagamento</FieldLabel>
                    <Select name="method" defaultValue="pix">
                      <SelectTrigger id="method">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="credito">Crédito</SelectItem>
                        <SelectItem value="debito">Débito</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="counterparty">Contraparte *</FieldLabel>
                    <Input
                      id="counterparty"
                      name="counterparty"
                      placeholder="Ex: João Silva, Fornecedor XYZ"
                      required
                    />
                    <FieldDescription>Nome do cliente ou responsável</FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </section>
          </div>

          {/* Additional info column */}
          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-border bg-card p-5">
              <FieldSet>
                <FieldLegend className="text-sm font-medium">Informações opcionais</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Paciente</FieldLabel>
                    {loadingOptions ? (
                      <Input disabled placeholder="Carregando..." />
                    ) : (
                      <Combobox
                        options={patientOptions}
                        value={selectedPatientId}
                        onChange={setSelectedPatientId}
                        placeholder="Selecione um paciente"
                        emptyMessage="Nenhum paciente encontrado"
                      />
                    )}
                    <FieldDescription>Vincular a um paciente</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel>Tutor</FieldLabel>
                    {loadingOptions ? (
                      <Input disabled placeholder="Carregando..." />
                    ) : (
                      <Combobox
                        options={tutorOptions}
                        value={selectedTutorId}
                        onChange={setSelectedTutorId}
                        placeholder="Selecione um tutor"
                        emptyMessage="Nenhum tutor encontrado"
                      />
                    )}
                    <FieldDescription>Vincular a um tutor</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel>Agendamento (opcional)</FieldLabel>
                    {loadingOptions ? (
                      <Input disabled placeholder="Carregando..." />
                    ) : (
                      <Combobox
                        options={appointmentOptions}
                        value={selectedAppointmentId}
                        onChange={setSelectedAppointmentId}
                        placeholder="Selecione um agendamento"
                        emptyMessage="Nenhum agendamento encontrado"
                      />
                    )}
                    <FieldDescription>Vincular a um agendamento do calendário</FieldDescription>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </section>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <Button type="submit" className="w-full gap-1.5" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5" />
                )}
                {isSubmitting ? "Cadastrando..." : "Cadastrar receita"}
              </Button>
              <Button type="button" variant="ghost" asChild className="w-full" disabled={isSubmitting}>
                <Link href="/financeiro">Cancelar</Link>
              </Button>
            </div>
          </aside>
        </form>
      </main>
    </>
  )
}
