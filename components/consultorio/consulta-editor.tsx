"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Mic,
  Pause,
  Square,
  Sparkles,
  Settings2,
  Volume2,
  Check,
  Loader2,
  PenLine,
  Plus,
  Save,
  DollarSign,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Combobox } from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Waveform } from "@/components/consultorio/waveform"
import { RecordingTimer } from "@/components/consultorio/recording-timer"
import { TranscriptDisplay } from "@/components/consultorio/transcript-display"
import { SOAPEditor } from "@/components/consultorio/soap-editor"
import { PatientContextCard } from "@/components/consultorio/patient-context-card"
import { HistorySummaryPanel } from "@/components/consultorio/history-summary-panel"
import { PrescriptionSuggestionsButton } from "@/components/consultorio/prescription-suggestions-dialog"
import { TutorInstructionsButton } from "@/components/consultorio/tutor-instructions-button"
import type { PrescriptionSuggestion } from "@/lib/api"
import { ClinicalActions } from "@/components/consultorio/clinical-actions"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { useAudioRecorder, type TranscriptSegment } from "@/hooks/use-audio-recorder"
import {
  transcribeAudio as transcribeAudioAPI,
  generateSOAP as generateSOAPAPI,
  saveDraft,
  getDraftById,
  finalizeDraft,
  createEmptyDraft,
  listPatients,
  listServices,
  listInventory,
  listFichas,
  createFicha,
  type Service,
} from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import type { Patient, InventoryItem, SOAPData, ConsultationDraft, Ficha } from "@/lib/types"
import { cn, formatCurrency } from "@/lib/utils"

type RecState = "idle" | "recording" | "paused" | "processing" | "draft"

interface Props {
  initialDraftId: string | null
  initialPatientId?: string | null
}

export function ConsultaEditor({ initialDraftId, initialPatientId }: Props) {
  const [mode, setMode] = useState<"ai" | "manual">("manual")
  const [state, setState] = useState<RecState>("idle")
  const [soap, setSoap] = useState<SOAPData | null>(null)
  const [patientId, setPatientId] = useState<string>("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [chiefComplaint, setChiefComplaint] = useState<string>("")
  const [draftId, setDraftId] = useState<string | null>(initialDraftId)

  const [anotacoes, setAnotacoes] = useState<string>("")
  const [sintomas, setSintomas] = useState<string>("")
  const [diagnostico, setDiagnostico] = useState<string>("")

  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<InventoryItem[]>([])
  const [selectedItems, setSelectedItems] = useState<
    Array<{ id: string; type: "service" | "product"; name: string; price: number; quantity: number }>
  >([])

  const [savingDraft, setSavingDraft] = useState(false)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<string>("pix")
  const [paymentAmount, setPaymentAmount] = useState<string>("")
  const [finalizing, setFinalizing] = useState(false)
  const [openFicha, setOpenFicha] = useState<Ficha | null>(null)
  const [fichaChecked, setFichaChecked] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Load reference data (patients, services, products) — always runs
  useEffect(() => {
    Promise.all([listPatients(), listServices(), listInventory()])
      .then(([patientsData, servicesData, productsData]) => {
        setPatients(patientsData)
        setServices(servicesData)
        setProducts(productsData)
        if (initialPatientId && !draftId) {
          setPatientId(initialPatientId)
        }
      })
      .catch((err) => console.error("Error loading reference data:", err))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load existing draft data separately — only when draftId is set
  useEffect(() => {
    if (!draftId) return
    getDraftById(draftId)
      .then(({ draft }) => {
        if (!draft) return
        if (draft.patientId) setPatientId(draft.patientId)
        setChiefComplaint(draft.finalReport || "")
        
        // Carregar dados do modo manual se existirem
        if (draft.anamnesis !== undefined && draft.anamnesis !== null) {
          setAnotacoes(draft.anamnesis)
        }
        if (draft.diagnosis !== undefined && draft.diagnosis !== null) {
          setDiagnostico(draft.diagnosis)
        }
        if (draft.symptoms && Array.isArray(draft.symptoms) && draft.symptoms.length > 0) {
          const symptomText = draft.symptoms.map((s: string | { name: string }) => typeof s === 'string' ? s : s.name).join("\n")
          setSintomas(symptomText)
        }
        
        // Carregar itens do PDV
        if (draft.pdvItems && Array.isArray(draft.pdvItems) && draft.pdvItems.length > 0) {
          setSelectedItems(draft.pdvItems)
        }
        
        // Carregar SOAP se for modo AI
        if (draft.soapJson) {
          const s = draft.soapJson
          setSoap(s)
        }
        
        // Definir modo
        if (draft.mode) setMode(draft.mode)
      })
      .catch((err) => console.error("Error loading draft:", err))
  }, [draftId])

  const {
    isRecording,
    isPaused,
    elapsedSeconds,
    transcript,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    addTranscriptSegments,
    getNewChunksBase64,
    getFullAudioBase64,
  } = useAudioRecorder()

  const transcribingRef = useRef(false)
  const soapGeneratingRef = useRef(false)
  const transcriptRef = useRef<TranscriptSegment[]>([])
  const elapsedSecondsRef = useRef(0)
  const selectedPatientRef = useRef(selectedPatient)
  const patientIdRef = useRef(patientId)

  useEffect(() => {
    transcriptRef.current = transcript
  }, [transcript])

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds
  }, [elapsedSeconds])

  useEffect(() => {
    selectedPatientRef.current = selectedPatient
  }, [selectedPatient])

  useEffect(() => {
    patientIdRef.current = patientId
  }, [patientId])

  // Real-time transcription
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRecording && !isPaused) {
      interval = setInterval(async () => {
        if (transcribingRef.current) return
        transcribingRef.current = true
        try {
          const chunkBase64 = await getNewChunksBase64()
          if (!chunkBase64) {
            transcribingRef.current = false
            return
          }
          const result = await transcribeAudioAPI(
            chunkBase64,
            elapsedSecondsRef.current,
            transcriptRef.current.slice(-5),
            ""
          )
          const segments: TranscriptSegment[] = result.segments || []
          if (segments.length > 0) addTranscriptSegments(segments)
        } catch (error) {
          console.error("Real-time transcription error:", error)
        } finally {
          transcribingRef.current = false
        }
      }, 10000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, isPaused, getNewChunksBase64, addTranscriptSegments])

  // Real-time SOAP
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isRecording && !isPaused) {
      interval = setInterval(async () => {
        const patient = selectedPatientRef.current
        if (soapGeneratingRef.current || !patient || transcriptRef.current.length === 0) return
        soapGeneratingRef.current = true
        try {
          const soapResult = await generateSOAPAPI(
            transcriptRef.current,
            patient.name,
            patient.tutor?.name || "Tutor não informado",
            "generalista",
            patientIdRef.current
          )
          setSoap(soapResult)
        } catch (error) {
          console.error("Real-time SOAP error:", error)
        } finally {
          soapGeneratingRef.current = false
        }
      }, 15000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isRecording, isPaused])

  // Sync selectedPatient
  useEffect(() => {
    const p = patients.find((x) => x.id === patientId)
    setSelectedPatient(p || null)
  }, [patientId, patients])

  // Check if patient has an open ficha whenever patientId changes
  useEffect(() => {
    if (!patientId) { setOpenFicha(null); setFichaChecked(false); return }
    setFichaChecked(false)
    listFichas({ patientId, status: "aberto" })
      .then(fichas => { setOpenFicha(fichas[0] ?? null); setFichaChecked(true) })
      .catch(() => { setOpenFicha(null); setFichaChecked(true) })
  }, [patientId])

  const buildDraftPayload = (resolvedDraftId: string) => {
    const patient = patients.find((p) => p.id === patientId)
    return {
      draftId: resolvedDraftId,
      mode,
      patientId: patientId || "",
      patientName: patient?.name || "",
      tutorName: patient?.tutor?.name || "",
      transcript: [],
      soapJson: mode === "ai" && soap ? soap : undefined,
      finalReport: chiefComplaint || "",
      durationSeconds: 0,
      // Campos para modo manual estruturado
      anamnesis: mode === "manual" ? anotacoes : undefined,
      symptoms: mode === "manual" && sintomas ? [{ name: sintomas }] : undefined,
      diagnosis: mode === "manual" ? diagnostico : undefined,
      pdvItems: selectedItems.length > 0 ? selectedItems : undefined,
    }
  }

  // Ensures a draft exists (creates one if needed) and returns the id
  const ensureDraft = async (): Promise<string> => {
    if (draftId) return draftId
    const { draft } = await createEmptyDraft()
    setDraftId(draft.id)
    router.replace(`/consultorio/${draft.id}`, { scroll: false })
    return draft.id
  }

  const handleSaveDraft = async () => {
    setSavingDraft(true)
    try {
      const id = await ensureDraft()
      await saveDraft(buildDraftPayload(id))
      toast({ title: "Rascunho salvo" })
    } catch (error) {
      console.error("Save draft error:", error)
      toast({ variant: "destructive", title: "Erro ao salvar rascunho" })
    } finally {
      setSavingDraft(false)
    }
  }

  const handleStopRecording = async () => {
    setState("processing")
    await stopRecording()
    if (!selectedPatient) {
      toast({ variant: "destructive", title: "Erro", description: "Selecione um paciente." })
      setState("idle")
      return
    }
    try {
      const fullAudio = await getFullAudioBase64()
      const result = await transcribeAudioAPI(fullAudio, elapsedSeconds, [], "")
      const finalSegments: TranscriptSegment[] = result.segments || []
      if (finalSegments.length > 0) addTranscriptSegments(finalSegments)
      const allTranscript = [...transcriptRef.current, ...finalSegments]
      if (allTranscript.length === 0) {
        toast({ variant: "destructive", title: "Sem transcrição", description: "Não foi possível transcrever o áudio." })
        setState("idle")
        return
      }
      const patientName = selectedPatient.name
      const tutorName = selectedPatient.tutor?.name || "Tutor não informado"
      const soapResult = await generateSOAPAPI(allTranscript, patientName, tutorName, "generalista", patientId)
      setSoap(soapResult)
      setState("draft")
      const aiDraftId = await ensureDraft()
      await saveDraft({
        draftId: aiDraftId,
        patientId,
        patientName,
        tutorName,
        transcript: allTranscript.map((t, i) => ({
          speaker: t.speaker || "veterinario",
          text: t.text,
          timestampSeconds: i * 15,
        })),
        soapJson: soapResult,
        durationSeconds: elapsedSeconds,
      })
      toast({ title: "SOAP gerado com sucesso", description: "Revise e edite conforme necessário." })
    } catch (error) {
      console.error("Error processing recording:", error)
      toast({ variant: "destructive", title: "Erro ao processar gravação", description: "Tente novamente." })
      setState("idle")
    }
  }

  const handleOpenFinalize = useCallback(async () => {
    if (!patientId) {
      toast({ variant: "destructive", title: "Selecione um paciente", description: "Necessário antes de finalizar." })
      return
    }
    try {
      const fichas = await listFichas({ patientId, status: "aberto" })
      if (fichas[0]) {
        setOpenFicha(fichas[0])
      } else {
        const novaFicha = await createFicha({ patientId })
        setOpenFicha(novaFicha)
      }
      setFichaChecked(true)
    } catch {
      setOpenFicha(null)
      setFichaChecked(true)
    }
    setFinalizeOpen(true)
  }, [patientId, toast])

  const handleFinalize = useCallback(async (sendToFicha = false) => {
    setFinalizing(true)
    try {
      const id = await ensureDraft()
      await saveDraft(buildDraftPayload(id))
      if (sendToFicha && openFicha) {
        await finalizeDraft(id, undefined, undefined, openFicha.id)
        toast({ title: "Consulta finalizada", description: "Itens adicionados à ficha." })
        setFinalizeOpen(false)
        router.push(`/fichas/${openFicha.id}`)
      } else {
        const amount = paymentAmount ? parseFloat(paymentAmount) : undefined
        const { medicalRecord } = await finalizeDraft(id, amount, paymentMethod || undefined)
        toast({ title: "Consulta finalizada", description: "Redirecionando..." })
        setFinalizeOpen(false)
        router.push(`/consultorio/${medicalRecord.id}`)
      }
    } catch (error) {
      console.error("Error finalizing:", error)
      toast({ variant: "destructive", title: "Erro ao finalizar", description: "Tente novamente." })
    } finally {
      setFinalizing(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId, router, toast, patientId, chiefComplaint, anotacoes, sintomas, diagnostico, patients, paymentAmount, paymentMethod, openFicha])

  const handleStartRecording = async () => {
    try {
      await startRecording()
      setState("recording")
    } catch (error) {
      console.error("Error starting recording:", error)
      toast({
        variant: "destructive",
        title: "Erro ao iniciar gravação",
        description: "Verifique as permissões do microfone.",
      })
    }
  }

  const handlePauseRecording = () => {
    pauseRecording()
    setState("paused")
  }
  const handleResumeRecording = () => {
    resumeRecording()
    setState("recording")
  }
  const handleNewRecording = () => {
    resetRecording()
    setSoap(null)
    setState("idle")
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

  // Auto-fill payment amount with mini PDV total when finalize modal opens
  useEffect(() => {
    if (finalizeOpen) {
      setPaymentAmount(totalAmount.toString())
    }
  }, [finalizeOpen, totalAmount])

  const isActive = isRecording || isPaused
  const isProcessing = state === "processing"
  const isDraft = state === "draft"

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">Consulta</h1>
            <p className="truncate text-xs text-muted-foreground">
              {mode === "ai" ? "Captura assistida por IA" : "Preenchimento manual"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5">
            <PenLine className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            <span className="text-xs font-medium text-muted-foreground">Manual</span>
            <Switch
              checked={mode === "ai"}
              onCheckedChange={(c) => setMode(c ? "ai" : "manual")}
              className="data-[state=checked]:bg-primary"
            />
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
            <span className="text-xs font-medium text-muted-foreground">IA</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleSaveDraft}
            disabled={savingDraft}
          >
            {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" strokeWidth={2} />}
            Salvar rascunho
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleOpenFinalize} disabled={mode === "ai" && !isDraft && isActive}>
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            Finalizar consulta
          </Button>
        </div>
      </div>

      <main className="flex flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Paciente</span>
          <div className="flex-1 min-w-[200px]">
            <Combobox
              options={patients.map((p) => ({
                value: p.id,
                label: `${p.name} — ${p.species} · ${p.breed} (${p.tutor?.name || "Sem tutor"})`,
              }))}
              value={patientId}
              onChange={setPatientId}
              placeholder="Buscar paciente..."
              emptyMessage="Nenhum paciente encontrado"
            />
          </div>
          <span className="hidden h-4 w-px bg-border md:block" />
          <input
            type="text"
            placeholder="Queixa principal (opcional)"
            value={chiefComplaint}
            onChange={(e) => setChiefComplaint(e.target.value)}
            className="min-w-[180px] flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
          />
        </div>

        {patientId && <HistorySummaryPanel patientId={patientId} />}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {mode === "manual" && (
              <>
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                  <h2 className="text-sm font-medium">Anotações</h2>
                  <RichTextEditor value={anotacoes} onChange={setAnotacoes} placeholder="Descreva as anotações..." />
                </div>
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                  <h2 className="text-sm font-medium">Sintomas</h2>
                  <RichTextEditor value={sintomas} onChange={setSintomas} placeholder="Descreva os sintomas..." />
                </div>
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
                  <h2 className="text-sm font-medium">Diagnóstico</h2>
                  <RichTextEditor value={diagnostico} onChange={setDiagnostico} placeholder="Descreva o diagnóstico..." />
                </div>
              </>
            )}

            {mode === "ai" && (
              <div className="flex flex-col gap-6">
                <div className="relative flex flex-col items-center gap-6 overflow-hidden rounded-xl border border-border bg-card px-6 py-10">
                  <div className="flex items-center gap-2">
                    {state === "idle" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                        Pronto para gravar
                      </span>
                    )}
                    {isRecording && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-70" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
                        </span>
                        Gravando
                      </span>
                    )}
                    {isPaused && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-600">
                        <Pause className="h-3 w-3" strokeWidth={2.5} />
                        Pausado
                      </span>
                    )}
                    {isProcessing && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2} />
                        Gerando SOAP com IA...
                      </span>
                    )}
                    {isDraft && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        <Sparkles className="h-3 w-3" strokeWidth={2} />
                        Rascunho gerado
                      </span>
                    )}
                  </div>

                  <RecordingTimer running={isRecording} />
                  <Waveform active={isRecording} />

                  <div className="flex items-center gap-3">
                    {state === "idle" && (
                      <button
                        type="button"
                        onClick={handleStartRecording}
                        className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition-transform hover:scale-105 active:scale-95"
                        aria-label="Iniciar gravação"
                      >
                        <Mic className="h-6 w-6" strokeWidth={2.25} />
                      </button>
                    )}
                    {isRecording && (
                      <>
                        <button
                          type="button"
                          onClick={handlePauseRecording}
                          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
                          aria-label="Pausar"
                        >
                          <Pause className="h-4 w-4" strokeWidth={2.25} />
                        </button>
                        <button
                          type="button"
                          onClick={handleStopRecording}
                          className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 transition-transform hover:scale-105 active:scale-95"
                          aria-label="Parar gravação"
                        >
                          <Square className="h-5 w-5 fill-current" strokeWidth={0} />
                        </button>
                      </>
                    )}
                    {isPaused && (
                      <>
                        <button
                          type="button"
                          onClick={handleResumeRecording}
                          className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
                          aria-label="Retomar"
                        >
                          <Mic className="h-4 w-4" strokeWidth={2.25} />
                        </button>
                        <button
                          type="button"
                          onClick={handleStopRecording}
                          className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 transition-transform hover:scale-105 active:scale-95"
                          aria-label="Finalizar"
                        >
                          <Square className="h-5 w-5 fill-current" strokeWidth={0} />
                        </button>
                      </>
                    )}
                    {isProcessing && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                        Processando...
                      </div>
                    )}
                    {isDraft && (
                      <Button variant="outline" onClick={handleNewRecording}>
                        Nova gravação
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Volume2 className="h-3 w-3" strokeWidth={2} />
                      Microfone: Padrão do sistema
                    </span>
                    <span>·</span>
                    <span>Português (BR)</span>
                  </div>
                </div>

                <TranscriptDisplay transcript={transcript} isRecording={isRecording} />
                <SOAPEditor soap={soap} onChange={setSoap} disabled={state === "idle" || isProcessing} />
                {isDraft && (
                  <div className="flex justify-end gap-2">
                    <TutorInstructionsButton
                      draftId={draftId}
                      hasSoap={!!soap}
                      patient={selectedPatient}
                    />
                    <PrescriptionSuggestionsButton
                      draftId={draftId}
                      hasSoap={!!soap}
                      onConfirm={(prescriptions: PrescriptionSuggestion[]) => {
                        const lines = prescriptions.map(
                          (p) => `${p.drug} — ${p.dose}, ${p.route}, ${p.frequency}, por ${p.duration}${p.notes ? ` (${p.notes})` : ""}`,
                        )
                        setSoap((prev) =>
                          prev
                            ? {
                                ...prev,
                                plan: [
                                  ...(prev.plan ?? []),
                                  ...lines,
                                ],
                              }
                            : prev,
                        )
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              {draftId ? (
                <ClinicalActions
                  draftId={draftId}
                  patientId={patientId}
                  patient={selectedPatient}
                />
              ) : (
                <p className="text-xs text-muted-foreground">Salve o rascunho para habilitar ações clínicas.</p>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
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
            </div>

            {mode === "ai" && <PatientContextCard patient={selectedPatient} />}
          </aside>
        </div>
      </main>

      {/* Finalize modal */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" strokeWidth={2} />
              Finalizar consulta
            </DialogTitle>
            <DialogDescription>
              Os itens serão enviados para a ficha do paciente e cobrados pela recepção.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
              {openFicha
                ? "Ficha aberta encontrada — itens serão adicionados."
                : "Uma nova ficha será aberta para este paciente."}
            </div>

            {selectedItems.length > 0 && (
              <div className="rounded-md border border-border">
                <div className="divide-y divide-border">
                  {selectedItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <span>{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between border-t border-border bg-muted/40 px-3 py-2 text-xs font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(totalAmount)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setFinalizeOpen(false)} disabled={finalizing}>
                Cancelar
              </Button>
              <Button onClick={() => handleFinalize(true)} disabled={finalizing || !openFicha} className="gap-1.5">
                {finalizing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Finalizar e enviar para ficha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
