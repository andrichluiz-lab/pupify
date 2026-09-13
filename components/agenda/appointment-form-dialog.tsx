"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { ExternalLink, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker } from "@/components/ui/time-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Combobox } from "@/components/ui/combobox"
import type { Appointment, AppointmentType, AppointmentStatus, TutorWithDetails, Veterinarian } from "@/lib/types"
import { listTutors, listVeterinarians, classifyAppointmentUrgency } from "@/lib/api"

const SPECIES_EMOJI: Record<string, string> = {
  Cao: "🐕", Gato: "🐈", Ave: "🦜", Roedor: "🐹", Reptil: "🦎", Outro: "🐾",
}

const TYPE_OPTIONS = [
  { value: "consulta",   label: "Consulta" },
  { value: "retorno",    label: "Retorno" },
  { value: "vacina",     label: "Vacina" },
  { value: "cirurgia",   label: "Cirurgia" },
  { value: "exame",      label: "Exame" },
  { value: "banho_tosa", label: "Banho & Tosa" },
  { value: "emergencia", label: "Emergência" },
] as const

const STATUS_OPTIONS = [
  { value: "agendado",   label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
] as const

function todayISO() {
  return new Date().toISOString().split("T")[0]
}

interface AppointmentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<Appointment>) => Promise<void>
  initialData?: Partial<Appointment>
}

export function AppointmentFormDialog({ open, onOpenChange, onSave, initialData }: AppointmentFormDialogProps) {
  const [tutors, setTutors] = useState<TutorWithDetails[]>([])
  const [veterinarians, setVeterinarians] = useState<Veterinarian[]>([])

  const [selectedTutorId, setSelectedTutorId] = useState<string | undefined>()
  const [patientId, setPatientId] = useState<string | undefined>()
  const [veterinarianId, setVeterinarianId] = useState<string | undefined>()
  const [type, setType] = useState<AppointmentType>("consulta")
  const [status, setStatus] = useState<AppointmentStatus>("agendado")
  const [appointmentDate, setAppointmentDate] = useState(todayISO())
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("10:00")
  const [notes, setNotes] = useState("")
  const [room, setRoom] = useState("")

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urgency, setUrgency] = useState<{ level: 'eletiva' | 'urgente' | 'emergencia'; reason: string } | null>(null)
  const urgencyTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sync form from initialData whenever dialog opens
  useEffect(() => {
    if (!open) return
    if (initialData?.id) {
      setSelectedTutorId(initialData.tutorId)
      setPatientId(initialData.patientId)
      setVeterinarianId(initialData.veterinarianId)
      setType(initialData.type ?? "consulta")
      setStatus(initialData.status ?? "agendado")
      setNotes(initialData.notes ?? "")
      setRoom(initialData.room ?? "")
      if (initialData.startsAt) {
        const d = new Date(initialData.startsAt)
        setAppointmentDate(d.toISOString().split("T")[0])
        setStartTime(d.toTimeString().slice(0, 5))
      }
      if (initialData.endsAt) {
        setEndTime(new Date(initialData.endsAt).toTimeString().slice(0, 5))
      }
    } else {
      setSelectedTutorId(initialData?.tutorId)
      setPatientId(initialData?.patientId)
      setVeterinarianId(undefined)
      setType("consulta")
      setStatus("agendado")
      setAppointmentDate(todayISO())
      setStartTime("09:00")
      setEndTime("10:00")
      setNotes("")
      setRoom("")
    }
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function loadData() {
    setIsLoading(true)
    setError(null)
    try {
      const [tutorsData, vetsData] = await Promise.all([listTutors(), listVeterinarians()])
      setTutors(tutorsData)
      setVeterinarians(vetsData)
    } catch {
      setError("Erro ao carregar dados. Tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const selectedTutor = tutors.find(t => t.id === selectedTutorId)
  const tutorAnimals = selectedTutor?.patients ?? []

  function handleTutorChange(tutorId: string) {
    setSelectedTutorId(tutorId)
    setPatientId(undefined)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!selectedTutorId)  { setError("Selecione um cliente"); return }
    if (!patientId)         { setError("Selecione o animal"); return }
    if (!veterinarianId)    { setError("Selecione um veterinário"); return }
    if (!appointmentDate)   { setError("Selecione a data"); return }
    if (!startTime || !endTime) { setError("Defina o horário"); return }
    if (startTime >= endTime)   { setError("O horário de fim deve ser após o início"); return }

    setIsSubmitting(true)
    try {
      await onSave({
        type,
        status,
        patientId,
        veterinarianId,
        tutorId: selectedTutorId,
        startsAt: new Date(`${appointmentDate}T${startTime}:00`).toISOString(),
        endsAt:   new Date(`${appointmentDate}T${endTime}:00`).toISOString(),
        notes:    notes || undefined,
        room:     room  || undefined,
      })
      onOpenChange(false)
    } catch {
      setError("Erro ao salvar agendamento. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-dvh overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData?.id ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
          <DialogDescription>Preencha os campos abaixo para agendar.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <>
              {/* ── Step 1: Cliente ─────────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <Label>Cliente (Tutor)</Label>
                <Combobox
                  options={tutors.map(t => ({
                    value: t.id,
                    label: `${t.name}${t.phone ? ` · ${t.phone}` : ""}`,
                  }))}
                  value={selectedTutorId}
                  onChange={handleTutorChange}
                  placeholder="Buscar cliente por nome ou telefone..."
                  emptyMessage="Nenhum cliente encontrado"
                />
                {!selectedTutorId && (
                  <Link
                    href="/pacientes/novo"
                    className="inline-flex w-fit items-center gap-1 text-[11px] text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Cadastrar novo cliente
                  </Link>
                )}
              </div>

              {/* ── Step 2: Animal (conditional) ────────────────────── */}
              {selectedTutorId && (
                <div className="flex flex-col gap-2">
                  <Label>Animal</Label>
                  {tutorAnimals.length === 0 ? (
                    <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                      <span className="text-sm text-muted-foreground">
                        Nenhum animal cadastrado para este cliente
                      </span>
                      <Link
                        href={`/pacientes/novo?tutorId=${selectedTutorId}`}
                        className="text-[11px] text-primary hover:underline"
                      >
                        Cadastrar animal
                      </Link>
                    </div>
                  ) : (
                    <Select value={patientId} onValueChange={setPatientId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o animal" />
                      </SelectTrigger>
                      <SelectContent>
                        {tutorAnimals.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {SPECIES_EMOJI[p.species as string] ?? "🐾"} {p.name}
                            {p.breed ? ` · ${p.breed}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* ── Veterinário ──────────────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <Label>Veterinário</Label>
                <Combobox
                  options={veterinarians.map(v => ({
                    value: v.id,
                    label: v.specialty ? `${v.name} (${v.specialty})` : v.name,
                  }))}
                  value={veterinarianId}
                  onChange={setVeterinarianId}
                  placeholder="Selecionar veterinário..."
                  emptyMessage="Nenhum veterinário encontrado"
                />
              </div>

              {/* ── Tipo + Status ────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={(v: AppointmentType) => setType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v: AppointmentStatus) => setStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* ── Data ─────────────────────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <Label>Data</Label>
                <DatePicker value={appointmentDate} onChange={setAppointmentDate} placeholder="Selecione a data" />
              </div>

              {/* ── Horários ─────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label>Início</Label>
                  <TimePicker value={startTime} onChange={setStartTime} placeholder="Início" />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Fim</Label>
                  <TimePicker value={endTime} onChange={setEndTime} placeholder="Fim" />
                </div>
              </div>

              {/* ── Sala ─────────────────────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <Label>Sala (opcional)</Label>
                <Input value={room} onChange={e => setRoom(e.target.value)} placeholder="Ex: Consultório 1" />
              </div>

              {/* ── Notas ────────────────────────────────────────────── */}
              <div className="flex flex-col gap-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={e => {
                    const val = e.target.value
                    setNotes(val)
                    if (urgencyTimerRef.current) clearTimeout(urgencyTimerRef.current)
                    if (val.trim().length < 10) { setUrgency(null); return }
                    urgencyTimerRef.current = setTimeout(async () => {
                      try {
                        const selected = tutors.find(t => t.id === selectedTutorId)
                        const pet = selected?.patients.find(p => p.id === patientId)
                        const result = await classifyAppointmentUrgency(val, type, pet?.species)
                        setUrgency(result)
                      } catch { /* silently fail */ }
                    }, 1500)
                  }}
                  placeholder="Descreva o motivo da consulta para receber classificação de urgência automática..."
                  rows={3}
                />
                {urgency && (
                  <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                    urgency.level === 'emergencia'
                      ? 'border-destructive/30 bg-destructive/5 text-destructive'
                      : urgency.level === 'urgente'
                      ? 'border-amber-500/30 bg-amber-500/5 text-amber-700'
                      : 'border-primary/20 bg-primary/5 text-primary'
                  }`}>
                    {urgency.level === 'emergencia' ? (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : urgency.level === 'urgente' ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium capitalize">{urgency.level}</span>
                      <span className="text-xs ml-1 opacity-80">— {urgency.reason}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : initialData?.id ? "Atualizar" : "Agendar"}
                </Button>
              </div>
            </>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}
