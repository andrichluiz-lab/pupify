import Link from "next/link"
import {
  ChevronLeft,
  Sparkles,
  Clock,
  User,
  Download,
  Share2,
  Pencil,
  FileText,
  Pill,
  Volume2,
  PenLine,
  DollarSign,
} from "lucide-react"
import { getConsultation, getDraftById } from "@/lib/api"
import { PatientAvatar } from "@/components/patients/patient-avatar"
import { Button } from "@/components/ui/button"
import { ConsultaEditor } from "@/components/consultorio/consulta-editor"
import { notFound } from "next/navigation"
import { formatCurrency } from "@/lib/utils"

interface Props {
  params: Promise<{ id: string }>
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDuration(sec?: number) {
  if (!sec) return "—"
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m${s.toString().padStart(2, "0")}s`
}

function stripHtml(html: string): string {
  if (!html) return ""
  return html.replace(/<[^>]*>/g, "")
}

export default async function ConsultorioDetailPage({ params }: Props) {
  const { id } = await params

  // Try to load as draft first — drafts use the editor.
  try {
    const draftResp = await getDraftById(id)
    if (draftResp?.draft) {
      return <ConsultaEditor initialDraftId={id} />
    }
  } catch {
    // Not a draft — fall through to medical record viewer.
  }

  const record = await getConsultation(id)
  if (!record) notFound()

  const soap = record.soap
  const isAI = record.mode === "ai"

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-8 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/consultorio"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Voltar"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Consulta</h1>
            <p className="text-xs text-muted-foreground">{formatDateTime(record.createdAt)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Share2 className="h-3.5 w-3.5" strokeWidth={2} />
            Compartilhar
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            PDF
          </Button>
          <Button size="sm" className="gap-1.5" asChild>
            <Link href={`/consultorio/${id}/editar`}>
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-5">
        <PatientAvatar patient={record.patient!} size={56} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{record.patient?.name}</h2>
            <span className="text-xs text-muted-foreground">
              {record.patient?.breed} · {record.patient?.species}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{record.chiefComplaint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" strokeWidth={2} />
            {record.veterinarianName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" strokeWidth={2} />
            {formatDuration(record.durationSec)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm">
          {isAI ? (
            <>
              <Sparkles className="h-4 w-4 text-primary" strokeWidth={2} />
              <span className="font-medium text-primary">Gerado por IA</span>
            </>
          ) : (
            <>
              <PenLine className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              <span className="font-medium text-muted-foreground">Modo Manual</span>
            </>
          )}
          <span className="text-muted-foreground">· Revisado por {record.veterinarianName}</span>
        </div>
        {isAI && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-background px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/5"
          >
            <Volume2 className="h-3.5 w-3.5" strokeWidth={2} />
            Ouvir áudio original
          </button>
        )}
      </div>

      {/* Modo Manual - Campos estruturados */}
      {!isAI && (
        <>
          {record.anamnesis && (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold">Anotações</h3>
              <div 
                className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: record.anamnesis }}
              />
            </div>
          )}

          {record.symptoms && Array.isArray(record.symptoms) && record.symptoms.length > 0 && (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold">Sintomas</h3>
              <ul className="flex flex-col gap-2">
                {record.symptoms.map((symptom: any, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
                    <div className="flex-1">
                      <span className="font-medium">{stripHtml(symptom.name || symptom)}</span>
                      {symptom.severity && (
                        <span className="ml-2 text-xs text-muted-foreground">({symptom.severity})</span>
                      )}
                      {symptom.duration && (
                        <span className="ml-2 text-xs text-muted-foreground">· {symptom.duration}</span>
                      )}
                      {symptom.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{stripHtml(symptom.notes)}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {record.diagnosis && (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold">Diagnóstico</h3>
              <div 
                className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: record.diagnosis }}
              />
            </div>
          )}

          {record.pdvItems && Array.isArray(record.pdvItems) && record.pdvItems.length > 0 && (
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" strokeWidth={2} />
                <h3 className="text-sm font-semibold">Itens Selecionados</h3>
              </div>
              <ul className="flex flex-col gap-2">
                {record.pdvItems.map((item: any, i: number) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{item.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.type === 'service' ? 'Serviço' : 'Produto'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">x{item.quantity}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Modo AI - SOAP */}
      {isAI && soap && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
          <h3 className="text-sm font-semibold">SOAP</h3>
          <SoapSection letter="S" label="Subjetivo" content={soap.subjective} />
          <SoapSection letter="O" label="Objetivo" content={soap.objective} />
          <SoapSection letter="A" label="Avaliação" content={soap.assessment} />
          <SoapSection letter="P" label="Plano" content={soap.plan} />
        </div>
      )}

      {record.prescriptions && record.prescriptions.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Pill className="h-4 w-4 text-primary" strokeWidth={2} />
            <h3 className="text-sm font-semibold">Prescrições</h3>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {record.prescriptions.map((p, i) => (
              <li key={i} className="grid grid-cols-4 gap-4 py-3 text-sm first:pt-0 last:pb-0">
                <div className="col-span-2 font-medium">{p.drug}</div>
                <div className="text-muted-foreground">{p.dosage}</div>
                <div className="text-muted-foreground">
                  {p.frequency} · {p.duration}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isAI && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={2} />
              <h3 className="text-sm font-semibold">Transcrição completa</h3>
            </div>
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
              Expandir
            </button>
          </div>
          <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">
            Transcrição não disponível para esta consulta.
          </p>
        </div>
      )}

      {record.consultationDocuments && record.consultationDocuments.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" strokeWidth={2} />
            <h3 className="text-sm font-semibold">Documentos</h3>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {record.consultationDocuments.map((doc: { id: string; title: string; type: string }) => (
              <li key={doc.id} className="grid grid-cols-[1fr_auto] items-center gap-4 py-3 text-sm first:pt-0 last:pb-0">
                <div className="flex flex-col">
                  <span className="font-medium">{doc.title}</span>
                  <span className="text-xs text-muted-foreground capitalize">{doc.type}</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1.5">
                  <Download className="h-3.5 w-3.5" strokeWidth={2} />
                  Baixar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function SoapSection({ letter, label, content }: { letter: string; label: string; content: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
        {letter}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</h4>
        <p className="text-sm leading-relaxed text-foreground">{content}</p>
      </div>
    </div>
  )
}
