"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Cake,
  Weight,
  Mic,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  Scissors,
  CircleAlert,
  Phone,
  Mail,
  MapPin,
  Stethoscope,
  CalendarDays,
  ImageIcon,
  Syringe,
  HeartPulse,
  FolderOpen,
  Loader2,
  Search,
  X,
} from "lucide-react"
import { PatientAvatar } from "@/components/patients/patient-avatar"
import {
  getPatient,
  listConsultationsForPatient,
  listAppointmentsForPatient,
  listSurgeriesForPatient,
  listImageExams,
  listFichas,
  createFicha,
} from "@/lib/api"
import type { Patient, Consultation, Appointment, Surgery, ImageExam, Ficha } from "@/lib/types"
import { use, useEffect, useState, useMemo } from "react"

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric",
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
  if (months < 12) return `${months} meses`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem === 0 ? `${years} anos` : `${years} anos e ${rem} meses`
}

// ── Timeline ─────────────────────────────────────────────────────────────────

type TimelineEventType = "consulta" | "agendamento" | "cirurgia" | "exame"

interface TimelineEvent {
  id: string
  type: TimelineEventType
  date: string
  title: string
  subtitle?: string
  status?: string
  href?: string
  statusColor?: string
}

const APPOINTMENT_TYPE_LABEL: Record<string, string> = {
  consulta: "Consulta", retorno: "Retorno", vacina: "Vacina",
  cirurgia: "Cirurgia", exame: "Exame", banho_tosa: "Banho/Tosa", emergencia: "Emergência",
}

const APPOINTMENT_STATUS_COLOR: Record<string, string> = {
  agendado: "bg-blue-500/10 text-blue-700",
  confirmado: "bg-green-500/10 text-green-700",
  em_atendimento: "bg-amber-500/10 text-amber-700",
  concluido: "bg-primary/10 text-primary",
  cancelado: "bg-muted text-muted-foreground",
  falta: "bg-destructive/10 text-destructive",
}

const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  agendado: "Agendado", confirmado: "Confirmado",
  em_atendimento: "Em atend.", concluido: "Concluído",
  cancelado: "Cancelado", falta: "Falta",
}

const SURGERY_STATUS_LABEL: Record<string, string> = {
  agendada: "Agendada", pre_op: "Pré-op", em_andamento: "Em andamento",
  recuperacao: "Recuperação", concluida: "Concluída", cancelada: "Cancelada",
}

const EXAM_TYPE_LABEL: Record<string, string> = {
  radiografia: "Raio-X", ultrassom: "Ultrassom", tomografia: "Tomografia",
  ressonancia: "Ressonância", laboratorio: "Laboratório", outro: "Exame",
}

function buildTimeline(
  consultations: Consultation[],
  appointments: Appointment[],
  surgeries: Surgery[],
  imageExams: ImageExam[],
): TimelineEvent[] {
  const events: TimelineEvent[] = []

  consultations.forEach(c => events.push({
    id: c.id,
    type: "consulta",
    date: c.createdAt,
    title: c.chiefComplaint || "Consulta",
    subtitle: `Dr(a). ${c.veterinarianName}`,
    status: c.status === "finalizado" ? "Finalizado" : "Rascunho",
    statusColor: c.status === "finalizado" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
    href: `/consultorio/${c.id}`,
  }))

  appointments.forEach(a => events.push({
    id: a.id,
    type: "agendamento",
    date: a.startsAt,
    title: APPOINTMENT_TYPE_LABEL[a.type] ?? a.type,
    subtitle: `${formatDateTime(a.startsAt)} · ${a.veterinarianName}`,
    status: APPOINTMENT_STATUS_LABEL[a.status] ?? a.status,
    statusColor: APPOINTMENT_STATUS_COLOR[a.status],
  }))

  surgeries.forEach(s => events.push({
    id: s.id,
    type: "cirurgia",
    date: s.scheduledFor,
    title: s.procedure,
    subtitle: `Cirurgião: ${s.surgeon}`,
    status: SURGERY_STATUS_LABEL[s.status] ?? s.status,
    statusColor: s.status === "concluida"
      ? "bg-primary/10 text-primary"
      : s.status === "cancelada"
      ? "bg-muted text-muted-foreground"
      : "bg-amber-500/10 text-amber-700",
    href: `/cirurgias/${s.id}`,
  }))

  imageExams.forEach(e => events.push({
    id: e.id,
    type: "exame",
    date: e.createdAt,
    title: EXAM_TYPE_LABEL[e.type] ?? e.type,
    subtitle: e.veterinarian ? `Dr(a). ${e.veterinarian.name}` : undefined,
    status: e.status === "concluido" ? "Concluído" : e.status === "analisando" ? "Analisando" : "Pendente",
    statusColor: e.status === "concluido"
      ? "bg-primary/10 text-primary"
      : "bg-amber-500/10 text-amber-700",
    href: `/exames-imagens/novo?id=${e.id}`,
  }))

  return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

function TimelineIcon({ type }: { type: TimelineEventType }) {
  const base = "flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
  if (type === "consulta")    return <div className={`${base} bg-sky-500/10 text-sky-700`}><Stethoscope className="h-3.5 w-3.5" /></div>
  if (type === "agendamento") return <div className={`${base} bg-violet-500/10 text-violet-700`}><CalendarDays className="h-3.5 w-3.5" /></div>
  if (type === "cirurgia")    return <div className={`${base} bg-rose-500/10 text-rose-700`}><Syringe className="h-3.5 w-3.5" /></div>
  return <div className={`${base} bg-emerald-500/10 text-emerald-700`}><ImageIcon className="h-3.5 w-3.5" /></div>
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [openFicha, setOpenFicha] = useState<Ficha | null>(null)
  const [fichaLoading, setFichaLoading] = useState(false)
  const [timelineSearch, setTimelineSearch] = useState("")
  const [timelineTypes, setTimelineTypes] = useState<Set<TimelineEventType>>(new Set())

  useEffect(() => {
    async function fetchData() {
      try {
        const [patientData, consultations, appointments, surgeries, imageExams, fichas] = await Promise.all([
          getPatient(id),
          listConsultationsForPatient(id).catch(() => [] as Consultation[]),
          listAppointmentsForPatient(id).catch(() => [] as Appointment[]),
          listSurgeriesForPatient(id).catch(() => [] as Surgery[]),
          listImageExams({ patientId: id }).catch(() => [] as ImageExam[]),
          listFichas({ patientId: id, status: "aberto" }).catch(() => [] as Ficha[]),
        ])
        setPatient(patientData)
        setTimeline(buildTimeline(consultations, appointments, surgeries, imageExams))
        setOpenFicha(fichas[0] ?? null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  const filteredTimeline = useMemo(() => {
    let result = timeline
    if (timelineTypes.size > 0) {
      result = result.filter(e => timelineTypes.has(e.type))
    }
    if (timelineSearch.trim()) {
      const q = timelineSearch.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.subtitle?.toLowerCase().includes(q) ||
        e.status?.toLowerCase().includes(q)
      )
    }
    return result
  }, [timeline, timelineTypes, timelineSearch])

  function toggleType(type: TimelineEventType) {
    setTimelineTypes(prev => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  async function handleAbrirFicha() {
    setFichaLoading(true)
    try {
      if (openFicha) {
        router.push(`/fichas/${openFicha.id}`)
        return
      }
      const ficha = await createFicha({ patientId: id })
      router.push(`/fichas/${ficha.id}`)
    } finally {
      setFichaLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col gap-4 p-4 md:p-6">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </main>
    )
  }

  if (!patient) {
    return (
      <main className="flex flex-col gap-4 p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Paciente não encontrado.</p>
      </main>
    )
  }

  const hasAlerts = (patient.allergies?.length ?? 0) > 0 || (patient.chronicConditions?.length ?? 0) > 0

  return (
    <>
      {/* Topbar */}
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">{patient.name}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {patient.species} · {patient.breed}
            </p>
          </div>
        </div>
      </div>

      <main className="flex flex-col gap-4 p-4 md:p-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/pacientes" className="hover:text-foreground">Pacientes</Link>
          <span>/</span>
          {patient.tutor && (
            <>
              <Link href={`/tutores/${patient.tutorId}`} className="hover:text-foreground">
                {patient.tutor.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-foreground">{patient.name}</span>
        </div>

        {/* Header card */}
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 md:flex-row md:items-center">
          <PatientAvatar name={patient.name} species={patient.species} seed={patient.id} size="xl" />

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{patient.name}</h1>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {patient.sex === "M" ? "Macho" : "Fêmea"}
              </span>
              {patient.neutered && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Scissors className="h-3 w-3" strokeWidth={2} />
                  Castrado
                </span>
              )}
              {(patient.chronicConditions?.length ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                  <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                  Condição crônica
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Cake className="h-3.5 w-3.5" strokeWidth={1.75} />
                {ageFromBirthDate(patient.birthDate)}
                <span className="text-xs">({formatDate(patient.birthDate)})</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Weight className="h-3.5 w-3.5" strokeWidth={1.75} />
                {patient.weightKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
              </span>
              {patient.microchip && (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
                  {patient.microchip}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            <Link
              href={`/consultorio/novo?patientId=${id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-xs transition-opacity hover:opacity-90"
            >
              <Mic className="h-3.5 w-3.5" />
              Iniciar consulta com IA
            </Link>
            <button
              type="button"
              onClick={handleAbrirFicha}
              disabled={fichaLoading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 text-xs font-medium text-primary shadow-xs transition-colors hover:bg-primary/10 disabled:opacity-60"
            >
              {fichaLoading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <FolderOpen className="h-3.5 w-3.5" />
              }
              {openFicha ? "Ver ficha aberta" : "Abrir ficha"}
            </button>
            <Link
              href={`/exames-imagens/novo?patientId=${id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground shadow-xs transition-colors hover:bg-muted"
            >
              <ImageIcon className="h-3.5 w-3.5" />
              Novo exame de imagem
            </Link>
          </div>
        </section>

        {/* Clinical alerts banner — shown only if there are alerts */}
        {hasAlerts && (
          <section className="flex flex-wrap gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
            {(patient.allergies?.length ?? 0) > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                  Alergias
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies!.map(a => (
                    <span key={a} className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                      <CircleAlert className="h-3 w-3" strokeWidth={2} />
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {(patient.chronicConditions?.length ?? 0) > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                  Condições crônicas
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {patient.chronicConditions!.map(c => (
                    <span key={c} className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                      <HeartPulse className="h-3 w-3" strokeWidth={2} />
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* AI record prompt */}
        <section className="flex items-start gap-3 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <h3 className="text-sm font-medium">Prontuário inteligente</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ative a gravação durante a consulta e receba a estrutura SOAP automaticamente — sem perder tempo digitando.
            </p>
          </div>
        </section>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

          {/* Left: Medical timeline */}
          <div className="lg:col-span-2">
            <section className="overflow-hidden rounded-lg border border-border bg-card">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-medium">Linha do tempo médica</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                  {filteredTimeline.length}{filteredTimeline.length !== timeline.length && `/${timeline.length}`}
                </span>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                {(
                  [
                    { type: "consulta" as const,    label: "Consultas",    color: "bg-sky-500/10 text-sky-700 ring-sky-400" },
                    { type: "agendamento" as const, label: "Agendamentos", color: "bg-violet-500/10 text-violet-700 ring-violet-400" },
                    { type: "cirurgia" as const,    label: "Cirurgias",    color: "bg-rose-500/10 text-rose-700 ring-rose-400" },
                    { type: "exame" as const,       label: "Exames",       color: "bg-emerald-500/10 text-emerald-700 ring-emerald-400" },
                  ] as const
                ).map(({ type, label, color }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleType(type)}
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all ${color} ${
                      timelineTypes.has(type) ? "ring-2" : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    {label}
                  </button>
                ))}

                <div className="relative ml-auto">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={timelineSearch}
                    onChange={e => setTimelineSearch(e.target.value)}
                    className="h-7 rounded-md border border-border bg-background pl-6 pr-6 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
                  />
                  {timelineSearch && (
                    <button
                      type="button"
                      onClick={() => setTimelineSearch("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              {filteredTimeline.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {timeline.length === 0 ? "Nenhum registro médico encontrado." : "Nenhum resultado para os filtros aplicados."}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {filteredTimeline.map(event => {
                    const inner = (
                      <div className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50">
                        <TimelineIcon type={event.type} />
                        <div className="flex min-w-0 flex-1 flex-col leading-tight">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{event.title}</span>
                            {event.status && (
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${event.statusColor ?? "bg-muted text-muted-foreground"}`}>
                                {event.status}
                              </span>
                            )}
                          </div>
                          <span className="mt-0.5 text-xs text-muted-foreground">
                            {event.subtitle || formatDateTime(event.date)}
                          </span>
                          {event.subtitle && (
                            <span className="text-[11px] text-muted-foreground/70">
                              {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                        <ArrowLeft className="mt-1 h-3.5 w-3.5 shrink-0 rotate-180 text-muted-foreground/40" strokeWidth={1.75} />
                      </div>
                    )
                    return (
                      <li key={`${event.type}-${event.id}`}>
                        {event.href
                          ? <Link href={event.href}>{inner}</Link>
                          : inner
                        }
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          {/* Right: Tutor + clinical details */}
          <div className="flex flex-col gap-4">
            {/* Tutor card */}
            <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tutor</h2>
                {patient.tutor && (
                  <Link href={`/tutores/${patient.tutorId}`} className="text-[11px] text-primary hover:underline">
                    Ver ficha completa
                  </Link>
                )}
              </div>
              <Link href={`/tutores/${patient.tutorId}`} className="flex items-center gap-3 hover:opacity-80">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {patient.tutor?.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{patient.tutor?.name}</span>
                  {patient.tutor?.cpf && (
                    <span className="truncate text-[11px] text-muted-foreground">CPF {patient.tutor.cpf}</span>
                  )}
                </div>
              </Link>
              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                {patient.tutor?.phone && (
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {patient.tutor.phone}
                  </span>
                )}
                {patient.tutor?.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
                    {patient.tutor.email}
                  </span>
                )}
                {patient.tutor?.address && (
                  <span className="inline-flex items-start gap-1.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5" strokeWidth={1.75} />
                    {patient.tutor.address}
                  </span>
                )}
              </div>
            </section>

            {/* Clinical alerts detail (if no banner shown above) */}
            {!hasAlerts && (
              <section className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
                <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Alertas clínicos</h2>
                <p className="text-xs text-muted-foreground">Nenhuma alergia ou condição crônica registrada.</p>
              </section>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
