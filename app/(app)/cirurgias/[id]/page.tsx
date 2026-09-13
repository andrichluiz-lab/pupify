"use client"

import React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import {
  ArrowLeft,
  Calendar,
  Clock,
  Scissors,
  User,
  AlertTriangle,
  Stethoscope,
  Pencil,
  Loader2,
  Mic,
  Pause,
  Square,
  Save,
  FlaskConical,
  Plus,
  DollarSign,
  Sparkles,
} from "lucide-react"
import { AppTopbar } from "@/components/app-topbar"
import { PatientAvatar } from "@/components/patients/patient-avatar"
import { Button } from "@/components/ui/button"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Waveform } from "@/components/consultorio/waveform"
import { RecordingTimer } from "@/components/consultorio/recording-timer"
import { Combobox } from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { get, put } from "@/lib/api-client"
import { transcribeAudio as transcribeAudioAPI, listServices, listInventory, generateSurgeryReport, type Service } from "@/lib/api"
import { useAudioRecorder } from "@/hooks/use-audio-recorder"
import { useToast } from "@/hooks/use-toast"
import type { Surgery, SurgeryStatus, SurgeryRisk, InventoryItem } from "@/lib/types"
import { formatCurrency } from "@/lib/utils"

const STATUS_META: Record<SurgeryStatus, { label: string; className: string }> = {
  agendada: { label: "Agendada", className: "text-muted-foreground bg-muted border-border" },
  pre_op: { label: "Pré-operatório", className: "text-amber-700 bg-amber-500/10 border-amber-500/20" },
  em_andamento: { label: "Em andamento", className: "text-destructive bg-destructive/10 border-destructive/20" },
  recuperacao: { label: "Recuperação", className: "text-primary bg-primary/10 border-primary/20" },
  concluida: { label: "Concluída", className: "text-muted-foreground bg-muted border-border" },
  cancelada: { label: "Cancelada", className: "text-muted-foreground bg-muted border-border opacity-70" },
}

const RISK_META: Record<SurgeryRisk, { label: string; className: string }> = {
  baixo: { label: "Baixo", className: "text-primary" },
  medio: { label: "Médio", className: "text-amber-600" },
  alto: { label: "Alto", className: "text-destructive" },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

type RecordingTarget = "surgery" | "anesthesia" | null

export default function SurgeryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [surgery, setSurgery] = useState<Surgery | null>(null)
  const [surgeryNotes, setSurgeryNotes] = useState("")
  const [anesthesiaNotes, setAnesthesiaNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  // PDV state
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<InventoryItem[]>([])
  const [selectedItems, setSelectedItems] = useState<
    Array<{ id: string; type: "service" | "product"; name: string; price: number; quantity: number }>
  >([])

  // Recording state
  const [recordingTarget, setRecordingTarget] = useState<RecordingTarget>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const transcribingRef = useRef(false)

  const {
    isRecording,
    isPaused,
    elapsedSeconds,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    getFullAudioBase64,
  } = useAudioRecorder()

  useEffect(() => {
    async function fetchSurgery() {
      try {
        const data = await get<Surgery>(`/api/surgeries/${params.id}`)
        setSurgery(data)
        setSurgeryNotes(data.surgeryNotes || "")
        setAnesthesiaNotes(data.anesthesiaNotes || "")
        // Load existing PDV items
        if (data.pdvItems && Array.isArray(data.pdvItems)) {
          setSelectedItems(data.pdvItems)
        }
      } catch (error) {
        console.error("Error fetching surgery:", error)
        toast({ title: "Erro ao carregar cirurgia", variant: "destructive" })
        router.push("/cirurgias")
      } finally {
        setIsLoading(false)
      }
    }
    if (params.id) fetchSurgery()
  }, [params.id, router, toast])

  // Load services and products for PDV
  useEffect(() => {
    Promise.all([listServices(), listInventory()])
      .then(([servicesData, productsData]) => {
        setServices(servicesData)
        setProducts(productsData)
      })
      .catch((err) => console.error("Error loading reference data:", err))
  }, [])

  const handleGenerateReport = async () => {
    if (!surgery) return
    setGeneratingReport(true)
    try {
      const { report } = await generateSurgeryReport(surgery.id)
      setSurgeryNotes(report)
      toast({ title: "Laudo gerado com IA", description: "Revise e salve quando estiver pronto." })
    } catch (error) {
      console.error("Generate report error:", error)
      toast({ title: "Erro ao gerar laudo", variant: "destructive" })
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleSave = async () => {
    if (!surgery) return
    setSaving(true)
    try {
      const updated = await put<Surgery>(`/api/surgeries/${surgery.id}`, {
        ...surgery,
        surgeryNotes,
        anesthesiaNotes,
        pdvItems: selectedItems.length > 0 ? selectedItems : undefined,
      })
      setSurgery(updated)
      toast({ title: "Cirurgia salva com sucesso" })
    } catch (error) {
      console.error("Save surgery error:", error)
      toast({ title: "Erro ao salvar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const addItemToCart = (item: Service | InventoryItem, type: "service" | "product") => {
    const existing = selectedItems.find((i) => i.id === item.id)
    if (existing) {
      setSelectedItems(selectedItems.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)))
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          id: item.id,
          type,
          name: item.name,
          price: type === "service" ? (item as Service).price : (item as InventoryItem).salePrice,
          quantity: 1,
        },
      ])
    }
  }

  const removeItemFromCart = (id: string) => setSelectedItems(selectedItems.filter((i) => i.id !== id))

  const totalAmount = selectedItems.reduce((s, i) => s + i.price * i.quantity, 0)

  const handleStartRecording = async (target: RecordingTarget) => {
    try {
      await startRecording()
      setRecordingTarget(target)
    } catch {
      toast({ title: "Erro ao iniciar gravação", description: "Verifique permissões do microfone.", variant: "destructive" })
    }
  }

  const handleStopRecording = async () => {
    if (transcribingRef.current) return
    transcribingRef.current = true
    setIsProcessing(true)
    try {
      await stopRecording()
      const audioBase64 = await getFullAudioBase64()
      const result = await transcribeAudioAPI(audioBase64, elapsedSeconds, [], "")
      const text = (result.segments || []).map((s: { text: string }) => s.text).join(" ")
      if (!text.trim()) {
        toast({ title: "Sem transcrição", description: "Não foi possível transcrever o áudio.", variant: "destructive" })
        return
      }
      if (recordingTarget === "surgery") {
        setSurgeryNotes((prev) => prev ? `${prev}\n\n${text}` : text)
      } else if (recordingTarget === "anesthesia") {
        setAnesthesiaNotes((prev) => prev ? `${prev}\n\n${text}` : text)
      }
      toast({ title: "Transcrição concluída" })
    } catch (error) {
      console.error("Recording error:", error)
      toast({ title: "Erro ao processar gravação", variant: "destructive" })
    } finally {
      transcribingRef.current = false
      setIsProcessing(false)
      setRecordingTarget(null)
    }
  }

  if (isLoading) {
    return (
      <>
        <AppTopbar title="Detalhes da cirurgia" description="Carregando..." />
        <main className="flex items-center justify-center p-4 md:p-6">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
      </>
    )
  }

  if (!surgery) {
    return (
      <>
        <AppTopbar title="Detalhes da cirurgia" description="Cirurgia não encontrada" />
        <main className="flex flex-col gap-4 p-4 md:p-6">
          <p className="text-muted-foreground">Cirurgia não encontrada.</p>
          <Button asChild><Link href="/cirurgias">Voltar</Link></Button>
        </main>
      </>
    )
  }

  const status = STATUS_META[surgery.status]
  const risk = RISK_META[surgery.risk]
  const isActiveRecording = isRecording || isPaused

  return (
    <>
      <AppTopbar title="Detalhes da cirurgia" description={surgery.procedure} />

      <main className="flex flex-col gap-4 p-4 md:p-6">
        <Link href="/cirurgias" className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para cirurgias
        </Link>

        {/* Header */}
        <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Scissors className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <h1 className="truncate text-lg font-semibold tracking-tight">{surgery.procedure}</h1>
              <p className="truncate text-sm text-muted-foreground">
                {surgery.patient?.name} · {surgery.patient?.species}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
            <Button size="sm" className="h-8 gap-1.5" asChild>
              <Link href={`/cirurgias/${surgery.id}/editar`}>
                <Pencil className="h-3.5 w-3.5" />
                Editar
              </Link>
            </Button>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Patient */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Paciente
              </h2>
              <div className="flex items-start gap-4">
                <PatientAvatar patient={surgery.patient!} size="lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-sm font-medium">{surgery.patient?.name}</p>
                  <p className="text-xs text-muted-foreground">{surgery.patient?.breed}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>{surgery.patient?.species}</span>
                    <span>·</span>
                    <span>{surgery.patient?.sex === "M" ? "Macho" : "Fêmea"}</span>
                    <span>·</span>
                    <span>{surgery.patient?.weightKg} kg</span>
                  </div>
                  {surgery.patient?.tutor && (
                    <p className="text-xs text-muted-foreground">Tutor: {surgery.patient.tutor.name}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Surgery report */}
            <NoteSection
              title="Relatório cirúrgico"
              icon={<Scissors className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
              placeholder="Descreva o procedimento cirúrgico, técnica utilizada, achados intraoperatórios..."
              value={surgeryNotes}
              onChange={setSurgeryNotes}
              isRecordingThis={isActiveRecording && recordingTarget === "surgery"}
              isProcessingThis={isProcessing && recordingTarget === "surgery"}
              otherRecordingActive={isActiveRecording && recordingTarget !== "surgery"}
              onStartRecording={() => handleStartRecording("surgery")}
              onPauseRecording={pauseRecording}
              onResumeRecording={resumeRecording}
              onStopRecording={handleStopRecording}
              elapsedSeconds={elapsedSeconds}
              isPaused={isPaused}
            />

            {/* Anesthesia */}
            <NoteSection
              title="Anestesia"
              icon={<FlaskConical className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
              placeholder="Protocolo anestésico, fármacos utilizados, doses, monitoramento, intercorrências..."
              value={anesthesiaNotes}
              onChange={setAnesthesiaNotes}
              isRecordingThis={isActiveRecording && recordingTarget === "anesthesia"}
              isProcessingThis={isProcessing && recordingTarget === "anesthesia"}
              otherRecordingActive={isActiveRecording && recordingTarget !== "anesthesia"}
              onStartRecording={() => handleStartRecording("anesthesia")}
              onPauseRecording={pauseRecording}
              onResumeRecording={resumeRecording}
              onStopRecording={handleStopRecording}
              elapsedSeconds={elapsedSeconds}
              isPaused={isPaused}
            />

            {/* Details */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
                <Scissors className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Detalhes do procedimento
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Procedimento</p>
                  <p className="text-sm font-medium">{surgery.procedure}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Risco</p>
                  <p className={`text-sm font-medium ${risk.className}`}>{risk.label}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Duração estimada</p>
                  <p className="text-sm font-medium">{surgery.estimatedDurationMin} minutos</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Sala cirúrgica</p>
                  <p className="text-sm font-medium">{surgery.room}</p>
                </div>
              </div>
              {surgery.notes && (
                <div className="mt-4 flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Observações</p>
                  <p className="text-sm text-muted-foreground">{surgery.notes}</p>
                </div>
              )}
            </section>

            {/* Team */}
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
                <Stethoscope className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Equipe
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Cirurgião principal</p>
                  <p className="text-sm font-medium">{surgery.surgeon}</p>
                </div>
                {surgery.anesthetist && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Anestesista</p>
                    <p className="text-sm font-medium">{surgery.anesthetist}</p>
                  </div>
                )}
                {surgery.assistant && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Auxiliar</p>
                    <p className="text-sm font-medium">{surgery.assistant}</p>
                  </div>
                )}
                {surgery.veterinarian && (
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Veterinário responsável</p>
                    <p className="text-sm font-medium">{surgery.veterinarian.name}</p>
                    {surgery.veterinarian.specialty && (
                      <p className="text-xs text-muted-foreground">{surgery.veterinarian.specialty}</p>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* Save button */}
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleGenerateReport}
                disabled={generatingReport || saving}
                className="gap-1.5"
              >
                {generatingReport ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-primary" strokeWidth={2} />
                )}
                {generatingReport ? "Gerando laudo…" : "Gerar laudo com IA"}
              </Button>
              <Button onClick={handleSave} disabled={saving || generatingReport} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" strokeWidth={2} />}
                Salvar relatório
              </Button>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="flex flex-col gap-4">
            {/* Mini PDV */}
            <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Mini PDV</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      Adicionar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Adicionar item</DialogTitle>
                    </DialogHeader>
                    <Tabs defaultValue="services">
                      <TabsList className="w-full">
                        <TabsTrigger value="services" className="flex-1">Serviços</TabsTrigger>
                        <TabsTrigger value="products" className="flex-1">Produtos</TabsTrigger>
                      </TabsList>
                      <TabsContent value="services" className="mt-3">
                        <Combobox
                          options={services.map((s) => ({
                            value: s.id,
                            label: `${s.name} — R$ ${s.price.toFixed(2)}`,
                          }))}
                          onChange={(id) => {
                            const svc = services.find((s) => s.id === id)
                            if (svc) addItemToCart(svc, "service")
                          }}
                          placeholder="Buscar serviço..."
                          emptyMessage="Nenhum serviço encontrado"
                        />
                      </TabsContent>
                      <TabsContent value="products" className="mt-3">
                        <Combobox
                          options={products.map((p) => ({
                            value: p.id,
                            label: `${p.name} — R$ ${p.salePrice.toFixed(2)}`,
                          }))}
                          onChange={(id) => {
                            const prod = products.find((p) => p.id === id)
                            if (prod) addItemToCart(prod, "product")
                          }}
                          placeholder="Buscar produto..."
                          emptyMessage="Nenhum produto encontrado"
                        />
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>

              {selectedItems.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum item adicionado.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.quantity}x R$ {item.price.toFixed(2)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItemFromCart(item.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between border-t border-border pt-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-semibold">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Agendamento
              </h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Data</p>
                  <p className="text-sm font-medium">{formatDate(surgery.scheduledFor)}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Horário</p>
                  <p className="text-sm font-medium">{formatTime(surgery.scheduledFor)}</p>
                </div>
              </div>
            </section>

            {surgery.risk === "alto" && (
              <section className="flex flex-col gap-3 rounded-lg border border-dashed border-destructive/30 bg-destructive/5 p-4">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                  <p className="text-sm font-medium">Alto risco</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Esta cirurgia foi classificada como alto risco. Mantenha monitoramento constante e prepare equipamentos de emergência.
                </p>
              </section>
            )}

            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
                Status atual
              </h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                {status.label}
              </span>
            </section>
          </aside>
        </div>
      </main>
    </>
  )
}

interface NoteSectionProps {
  title: string
  icon: React.ReactNode
  placeholder: string
  value: string
  onChange: (v: string) => void
  isRecordingThis: boolean
  isProcessingThis: boolean
  otherRecordingActive: boolean
  onStartRecording: () => void
  onPauseRecording: () => void
  onResumeRecording: () => void
  onStopRecording: () => void
  elapsedSeconds: number
  isPaused: boolean
}

function NoteSection({
  title,
  icon,
  placeholder,
  value,
  onChange,
  isRecordingThis,
  isProcessingThis,
  otherRecordingActive,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  elapsedSeconds,
  isPaused,
}: NoteSectionProps) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </h2>

        {!isRecordingThis && !isProcessingThis && (
          <button
            type="button"
            onClick={onStartRecording}
            disabled={otherRecordingActive}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Mic className="h-3.5 w-3.5" strokeWidth={1.75} />
            Gravar com IA
          </button>
        )}

        {isRecordingThis && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
              {isPaused ? "Pausado" : "Gravando"}
            </span>
            <RecordingTimer running={!isPaused} />
            <button
              type="button"
              onClick={isPaused ? onResumeRecording : onPauseRecording}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-foreground hover:bg-muted"
            >
              {isPaused ? <Mic className="h-3.5 w-3.5" strokeWidth={2} /> : <Pause className="h-3.5 w-3.5" strokeWidth={2} />}
            </button>
            <button
              type="button"
              onClick={onStopRecording}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <Square className="h-3 w-3 fill-current" strokeWidth={0} />
            </button>
          </div>
        )}

        {isProcessingThis && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            Transcrevendo...
          </span>
        )}
      </div>

      {isRecordingThis && (
        <div className="mb-3">
          <Waveform active={!isPaused} />
        </div>
      )}

      <RichTextEditor value={value} onChange={onChange} placeholder={placeholder} />
    </section>
  )
}
