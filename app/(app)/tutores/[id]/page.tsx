"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Pencil,
  Plus,
  AlertTriangle,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  MessageCircle,
  Loader2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getTutorDetail, listQuotes, approveQuote, rejectQuote, deleteQuote, sendQuoteViaWhatsApp, getWhatsAppInstance, createAppointment } from "@/lib/api"
import { post } from "@/lib/api-client"
import type { TutorDetail, Quote, Appointment } from "@/lib/types"
import { QuoteFormDialog } from "@/components/financeiro/quote-form-dialog"
import { AppointmentFormDialog } from "@/components/agenda/appointment-form-dialog"

const SPECIES_EMOJI: Record<string, string> = {
  Cao:    "🐕",
  Gato:   "🐈",
  Ave:    "🦜",
  Roedor: "🐹",
  Reptil: "🦎",
  Outro:  "🐾",
}

const SPECIES_LABEL: Record<string, string> = {
  Cao:    "Cão",
  Gato:   "Gato",
  Ave:    "Ave",
  Roedor: "Roedor",
  Reptil: "Réptil",
  Outro:  "Outro",
}

const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  consulta:   "Consulta",
  retorno:    "Retorno",
  vacina:     "Vacina",
  cirurgia:   "Cirurgia",
  exame:      "Exame",
  banho_tosa: "Banho/Tosa",
  emergencia: "Emergência",
}

const STATUS_LABEL: Record<string, string> = {
  agendado:       "Agendado",
  confirmado:     "Confirmado",
  em_atendimento: "Em atendimento",
  concluido:      "Concluído",
  cancelado:      "Cancelado",
  falta:          "Falta",
}

const STATUS_CLASS: Record<string, string> = {
  agendado:       "bg-blue-500/10 text-blue-700",
  confirmado:     "bg-green-500/10 text-green-700",
  em_atendimento: "bg-amber-500/10 text-amber-700",
  concluido:      "bg-primary/10 text-primary",
  cancelado:      "bg-muted text-muted-foreground",
  falta:          "bg-destructive/10 text-destructive",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) +
    " · " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  )
}

function ageFromBirthDate(birthDate: string) {
  const b = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (months < 12) return `${months}m`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem === 0 ? `${years}a` : `${years}a ${rem}m`
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function TutorInitials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2)
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
      {initials.toUpperCase()}
    </div>
  )
}

const QUOTE_STATUS_LABEL: Record<string, string> = {
  pendente:  "Pendente",
  aprovado:  "Aprovado",
  recusado:  "Recusado",
  expirado:  "Expirado",
}

const QUOTE_STATUS_CLASS: Record<string, string> = {
  pendente:  "bg-amber-500/10 text-amber-700",
  aprovado:  "bg-green-500/10 text-green-700",
  recusado:  "bg-destructive/10 text-destructive",
  expirado:  "bg-muted text-muted-foreground",
}

export default function TutorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { id } = use(params)
  const [tutor, setTutor] = useState<TutorDetail | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false)
  const [sendingQuoteId, setSendingQuoteId] = useState<string | null>(null)
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false)
  const [animalDialogOpen, setAnimalDialogOpen] = useState(false)
  const [animalSaving, setAnimalSaving] = useState(false)
  const [animalForm, setAnimalForm] = useState({
    name: '', species: 'Cao', breed: '', sex: 'M',
    birthDate: '', weightKg: '', neutered: false,
  })

  useEffect(() => {
    async function load() {
      try {
        const [data, q, wa] = await Promise.all([
          getTutorDetail(id),
          listQuotes({ tutorId: id }),
          getWhatsAppInstance(),
        ])
        setTutor(data)
        setQuotes(q)
        setWhatsappConnected(wa?.status === 'connected')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  async function refreshQuotes() {
    if (!id) return
    const q = await listQuotes({ tutorId: id })
    setQuotes(q)
  }

  async function handleApprove(quoteId: string) {
    await approveQuote(quoteId)
    refreshQuotes()
  }

  async function handleReject(quoteId: string) {
    await rejectQuote(quoteId)
    refreshQuotes()
  }

  async function handleDelete(quoteId: string) {
    await deleteQuote(quoteId)
    refreshQuotes()
  }

  async function handleSaveAppointment(data: Partial<Appointment>) {
    await createAppointment(data)
    const updated = await getTutorDetail(id)
    if (updated) setTutor(updated)
  }

  async function handleSaveAnimal() {
    if (!animalForm.name.trim()) return
    setAnimalSaving(true)
    try {
      await post('/api/patients', {
        patient: {
          name: animalForm.name,
          species: animalForm.species,
          breed: animalForm.breed || animalForm.species,
          sex: animalForm.sex,
          birthDate: animalForm.birthDate
            ? new Date(animalForm.birthDate).toISOString()
            : new Date().toISOString(),
          weightKg: parseFloat(animalForm.weightKg) || 0,
          neutered: animalForm.neutered,
          tutorId: id,
        },
      })
      const updated = await getTutorDetail(id)
      if (updated) setTutor(updated)
      setAnimalDialogOpen(false)
      setAnimalForm({ name: '', species: 'Cao', breed: '', sex: 'M', birthDate: '', weightKg: '', neutered: false })
    } catch (err) {
      alert((err as Error).message || 'Erro ao cadastrar animal')
    } finally {
      setAnimalSaving(false)
    }
  }

  async function handleSendWhatsApp(quote: Quote) {
    if (!tutor) return
    setSendingQuoteId(quote.id)
    try {
      await sendQuoteViaWhatsApp(quote, { id: tutor.id, name: tutor.name, phone: tutor.phone })
      router.push('/whatsapp')
    } catch (err) {
      alert((err as Error).message || 'Erro ao enviar pelo WhatsApp')
    } finally {
      setSendingQuoteId(null)
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col gap-4 p-4 md:p-6">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </main>
    )
  }

  if (!tutor) {
    return (
      <main className="flex flex-col gap-4 p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Cliente não encontrado.</p>
        <Link href="/pacientes" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
      </main>
    )
  }

  const pendingBalance = tutor.transactions
    .filter(t => t.direction === "entrada" && (t.status === "pendente" || t.status === "atrasado"))
    .reduce((sum, t) => sum + t.amount, 0)

  const fullAddress = [
    tutor.addressStreet,
    tutor.addressNumber,
    tutor.addressComplement,
    tutor.addressNeighborhood,
    tutor.addressCity && tutor.addressState
      ? `${tutor.addressCity}/${tutor.addressState}`
      : tutor.addressCity ?? tutor.addressState,
  ].filter(Boolean).join(", ")

  const privacyChannels = [
    tutor.acceptEmail !== false && "E-mail",
    tutor.acceptSms !== false && "SMS",
    tutor.acceptCampaignSms !== false && "Campanha SMS",
    tutor.acceptWhatsapp !== false && "Whatsapp",
  ].filter(Boolean).join(", ")

  const contactsList = (tutor.contacts as Array<{ type: string; phone: string }> | null) ?? []

  return (
    <>
      {/* Topbar */}
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <Link href="/pacientes" className="shrink-0 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">{tutor.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {tutor.patients.length} {tutor.patients.length === 1 ? "animal" : "animais"}
              {tutor.phone && ` · ${tutor.phone}`}
            </p>
          </div>
        </div>
        {pendingBalance > 0 && (
          <div className="hidden shrink-0 items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 sm:flex">
            <span className="text-xs font-semibold text-amber-700">{formatCurrency(pendingBalance)}</span>
            <span className="text-[10px] text-amber-600">pendente</span>
          </div>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href={`/tutores/${id}/editar`}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Editar
          </Link>
        </Button>
      </div>

      <main className="grid grid-cols-1 gap-4 p-4 md:p-6 lg:grid-cols-3">

        {/* ── Coluna esquerda ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Dados do responsável */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-primary">Dados do responsável</h2>
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <p className="text-[11px] text-muted-foreground">Nome:</p>
                <p className="font-medium">{tutor.name}</p>
              </div>
              {tutor.cpf && (
                <div>
                  <p className="text-[11px] text-muted-foreground">CPF:</p>
                  <p>{tutor.cpf}</p>
                </div>
              )}
              {tutor.rg && (
                <div>
                  <p className="text-[11px] text-muted-foreground">RG:</p>
                  <p>{tutor.rg}</p>
                </div>
              )}
              {tutor.profession && (
                <div>
                  <p className="text-[11px] text-muted-foreground">Profissão:</p>
                  <p>{tutor.profession}</p>
                </div>
              )}
              {tutor.notes && (
                <div>
                  <p className="text-[11px] text-muted-foreground">Observações:</p>
                  <p className="text-muted-foreground">{tutor.notes}</p>
                </div>
              )}
              {(tutor.tags ?? []).length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground">Marcações:</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(tutor.tags ?? []).map(t => (
                      <span key={t} className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-700">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link href={`/tutores/${id}/editar`} className="mt-3 inline-block text-xs font-medium text-primary hover:underline">
              Ver mais
            </Link>
          </section>

          {/* Contatos */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-primary">Contatos</h2>
            {contactsList.length > 0 ? (
              <div className="flex flex-col gap-2">
                {contactsList.map((c, i) => (
                  <div key={i} className="text-sm">
                    <p className="text-[11px] text-muted-foreground">{c.type}:</p>
                    <p className="font-medium">{c.phone}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm">
                {tutor.phone && (
                  <div>
                    <p className="text-[11px] text-muted-foreground">Celular:</p>
                    <p className="font-medium">{tutor.phone}</p>
                  </div>
                )}
                {tutor.email && (
                  <div className="mt-2">
                    <p className="text-[11px] text-muted-foreground">E-mail:</p>
                    <p className="font-medium">{tutor.email}</p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Endereço */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-primary">Endereço</h2>
            {tutor.cep || fullAddress ? (
              <div className="flex flex-col gap-2 text-sm">
                {tutor.cep && (
                  <div>
                    <p className="text-[11px] text-muted-foreground">CEP:</p>
                    <p className="font-medium">{tutor.cep}</p>
                  </div>
                )}
                {fullAddress && (
                  <div>
                    <p className="text-[11px] text-muted-foreground">Endereço:</p>
                    <p>{fullAddress}</p>
                  </div>
                )}
                {tutor.addressComplement && (
                  <div>
                    <p className="text-[11px] text-muted-foreground">Complemento:</p>
                    <p>{tutor.addressComplement}</p>
                  </div>
                )}
                {tutor.addressReference && (
                  <div>
                    <p className="text-[11px] text-muted-foreground">Referência:</p>
                    <p className="text-muted-foreground">{tutor.addressReference}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Endereço não cadastrado.</p>
            )}
          </section>
        </div>

        {/* ── Coluna central ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Orçamentos */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-primary">Orçamentos</h2>
              <Button size="sm" variant="outline" onClick={() => setQuoteDialogOpen(true)}>
                <Plus className="mr-1 h-3 w-3" /> Novo
              </Button>
            </div>
            {quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum orçamento. Clique em "Novo" para criar.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {quotes.map((q) => (
                  <li key={q.id} className="flex items-center gap-2 py-2.5">
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{formatCurrency(q.total)}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${QUOTE_STATUS_CLASS[q.status] ?? "bg-muted text-muted-foreground"}`}>
                          {QUOTE_STATUS_LABEL[q.status]}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {q.items.length} {q.items.length === 1 ? "item" : "itens"} · {formatDate(q.createdAt)}
                        {q.patient?.name && ` · ${q.patient.name}`}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-0.5">
                      {whatsappConnected && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:bg-green-500/10"
                          title="Enviar por WhatsApp" disabled={sendingQuoteId === q.id}
                          onClick={() => handleSendWhatsApp(q)}>
                          {sendingQuoteId === q.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3 w-3" />}
                        </Button>
                      )}
                      {q.status === "pendente" && (
                        <>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-green-700 hover:bg-green-500/10"
                            title="Aprovar" onClick={() => handleApprove(q.id)}>
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive hover:bg-destructive/10"
                            title="Recusar" onClick={() => handleReject(q.id)}>
                            <XCircle className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      {(q.status === "recusado" || q.status === "expirado") && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          title="Excluir" onClick={() => handleDelete(q.id)}>
                          <Clock className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Financeiro */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-primary">Financeiro</h2>
              {pendingBalance > 0 && (
                <span className="text-xs font-semibold text-amber-700">{formatCurrency(pendingBalance)} pendente</span>
              )}
            </div>
            {tutor.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma transação registrada.</p>
            ) : (
              <ul className="divide-y divide-border">
                {tutor.transactions.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center gap-2 py-2.5">
                    <span className={`text-xs font-bold ${t.direction === "entrada" ? "text-green-700" : "text-red-700"}`}>
                      {t.direction === "entrada" ? "+" : "–"}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <span className="truncate text-sm">{t.description}</span>
                      <span className="text-[11px] text-muted-foreground">{formatDate(t.dueDate)}</span>
                    </div>
                    <span className={`shrink-0 text-sm font-semibold tabular-nums ${t.direction === "entrada" ? "text-green-700" : "text-red-700"}`}>
                      {formatCurrency(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Privacidade */}
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-primary">Privacidade</h2>
            <div className="text-sm">
              <p className="text-[11px] text-muted-foreground">Canais de comunicação:</p>
              <p className="mt-0.5">{privacyChannels || "Nenhum canal aceito"}</p>
            </div>
          </section>
        </div>

        {/* ── Coluna direita ───────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Animais */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-primary">
                Animais
                {tutor.patients.length > 0 && (
                  <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {tutor.patients.length}
                  </span>
                )}
              </h2>
              <Button size="sm" variant="outline" onClick={() => setAnimalDialogOpen(true)}>
                <Plus className="mr-1 h-3 w-3" /> Novo
              </Button>
            </div>
            {tutor.patients.length === 0 ? (
              <button type="button" onClick={() => setAnimalDialogOpen(true)} className="block text-sm text-muted-foreground hover:text-primary">
                Não há animais cadastrados. Clique aqui para adicionar.
              </button>
            ) : (
              <ul className="flex flex-col gap-2">
                {tutor.patients.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/pacientes/${p.id}`}
                      className="flex items-center gap-2.5 rounded-md transition-colors hover:bg-muted/40 py-1"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-base">
                        {SPECIES_EMOJI[p.species as string] ?? "🐾"}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col leading-tight">
                        <div className="flex items-center gap-1">
                          <span className="truncate text-sm font-medium">{p.name}</span>
                          {(p.chronicConditions?.length ?? 0) > 0 && (
                            <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-amber-500" />
                          )}
                        </div>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {SPECIES_LABEL[p.species as string] ?? p.species} · {p.breed}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Agendamentos */}
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-primary">Agendamentos</h2>
              <Button size="sm" variant="outline" onClick={() => setAppointmentDialogOpen(true)}>
                <Plus className="mr-1 h-3 w-3" /> Novo
              </Button>
            </div>
            {tutor.appointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum agendamento. Clique em "Novo" para criar.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {tutor.appointments.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center gap-2 py-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-sm">
                      {SPECIES_EMOJI[(a.patient as { species: string })?.species] ?? "🐾"}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col leading-tight">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium">{APPOINTMENT_TYPE_LABEL[a.type] ?? a.type}</span>
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${STATUS_CLASS[a.status] ?? "bg-muted text-muted-foreground"}`}>
                          {STATUS_LABEL[a.status]}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {(a.patient as { name: string })?.name} · {formatDateTime(a.startsAt)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      {tutor && (
        <QuoteFormDialog
          open={quoteDialogOpen}
          onOpenChange={setQuoteDialogOpen}
          tutor={tutor}
          patients={tutor.patients}
          onCreated={refreshQuotes}
          whatsappConnected={whatsappConnected}
        />
      )}

      <AppointmentFormDialog
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        onSave={handleSaveAppointment}
        initialData={{ tutorId: id }}
      />

      <Dialog open={animalDialogOpen} onOpenChange={setAnimalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo animal</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Label>Nome *</Label>
              <Input
                placeholder="Ex: Thor"
                value={animalForm.name}
                onChange={e => setAnimalForm(f => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Espécie *</Label>
                <Select value={animalForm.species} onValueChange={v => setAnimalForm(f => ({ ...f, species: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SPECIES_LABEL).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{SPECIES_EMOJI[val]} {label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Raça</Label>
                <Input
                  placeholder="Ex: Golden"
                  value={animalForm.breed}
                  onChange={e => setAnimalForm(f => ({ ...f, breed: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Sexo *</Label>
              <RadioGroup
                value={animalForm.sex}
                onValueChange={v => setAnimalForm(f => ({ ...f, sex: v }))}
                className="flex gap-4"
              >
                <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <RadioGroupItem value="M" /> Macho
                </Label>
                <Label className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                  <RadioGroupItem value="F" /> Fêmea
                </Label>
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Nascimento</Label>
                <Input
                  type="date"
                  value={animalForm.birthDate}
                  onChange={e => setAnimalForm(f => ({ ...f, birthDate: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label>Peso (kg)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="Ex: 12.5"
                  value={animalForm.weightKg}
                  onChange={e => setAnimalForm(f => ({ ...f, weightKg: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2.5">
              <span className="text-sm">Castrado</span>
              <Switch
                checked={animalForm.neutered}
                onCheckedChange={v => setAnimalForm(f => ({ ...f, neutered: v }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setAnimalDialogOpen(false)} disabled={animalSaving}>
                Cancelar
              </Button>
              <Button onClick={handleSaveAnimal} disabled={!animalForm.name.trim() || animalSaving}>
                {animalSaving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1.5 h-3.5 w-3.5" />}
                Adicionar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
