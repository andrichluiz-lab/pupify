"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Upload,
  Sparkles,
  Save,
  Check,
  Loader2,
  DollarSign,
  X,
  Plus,
  FileText,
  Image as ImageIcon,
} from "lucide-react"
import { marked } from "marked"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Combobox } from "@/components/ui/combobox"
import {
  createImageExam,
  updateImageExam,
  getImageExam,
  analyzeImageExam,
  finalizeImageExam,
  listPatients,
  listServices,
  listInventory,
  listFichas,
  createFicha,
  uploadFile,
} from "@/lib/api"
import type { ImageExam, ImageExamType, Patient, InventoryItem, Ficha } from "@/lib/types"
import type { Service } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/lib/auth-context"
import { cn, formatCurrency } from "@/lib/utils"

type PDVItem = {
  id: string
  type: "service" | "product"
  name: string
  price: number
  quantity: number
}

type UploadedFile = {
  id: string
  name: string
  mimeType: string
}

function mdToHtml(md: string): string {
  if (!md || md.trim().startsWith("<")) return md
  return marked.parse(md) as string
}

export default function NovoExamePage() {
  const router = useRouter()
  const { toast } = useToast()
  const { veterinarian } = useAuth()
  const [examId, setExamId] = useState<string | null>(null)

  const [patientId, setPatientId] = useState<string>("")
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [examType, setExamType] = useState<ImageExamType>("radiografia")

  // Multiple files
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)

  const [veterinarianNotes, setVeterinarianNotes] = useState<string>("")
  const [aiReport, setAiReport] = useState<string>("")
  const [extractedText, setExtractedText] = useState<string>("")
  const [aiAnalysis, setAiAnalysis] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)

  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<InventoryItem[]>([])
  const [selectedItems, setSelectedItems] = useState<PDVItem[]>([])

  const [saving, setSaving] = useState(false)
  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [openFicha, setOpenFicha] = useState<Ficha | null>(null)

  useEffect(() => {
    Promise.all([listPatients(), listServices(), listInventory()])
      .then(([patientsData, servicesData, productsData]) => {
        setPatients(patientsData)
        setServices(servicesData)
        setProducts(productsData)
      })
      .catch((err) => console.error("Error loading reference data:", err))
  }, [])

  useEffect(() => {
    const p = patients.find((x) => x.id === patientId)
    setSelectedPatient(p || null)
  }, [patientId, patients])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get("id")
    const prePatientId = params.get("patientId")

    if (prePatientId) setPatientId(prePatientId)

    if (id) {
      setExamId(id)
      getImageExam(id)
        .then((exam) => {
          if (!exam) return
          setPatientId(exam.patientId)
          setExamType(exam.type)
          setVeterinarianNotes(exam.veterinarianNotes || "")
          setAiReport(mdToHtml(exam.aiReport || ""))
          setExtractedText(exam.extractedText || "")
          setAiAnalysis(exam.aiAnalysis)
          if (exam.pdvItems) {
            setSelectedItems(exam.pdvItems as PDVItem[])
          }
          // Restore uploaded files list from exam data
          if (exam.file) {
            setUploadedFiles([{ id: exam.file.id, name: exam.file.originalName, mimeType: exam.file.mimeType }])
          }
        })
        .catch((err) => console.error("Error loading exam:", err))
    }
  }, [])

  const MAX_FILE_MB = 10

  const handleFileUpload = async () => {
    if (!pendingFile || !patientId) {
      toast({ variant: "destructive", title: "Selecione um paciente e um arquivo" })
      return
    }

    if (pendingFile.size > MAX_FILE_MB * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "Arquivo muito grande",
        description: `O limite máximo é ${MAX_FILE_MB}MB. Seu arquivo tem ${(pendingFile.size / 1024 / 1024).toFixed(1)}MB.`,
      })
      return
    }

    setUploading(true)
    try {
      const result = await uploadFile(pendingFile, "image_exam", patientId)
      const newFile: UploadedFile = {
        id: result.id,
        name: pendingFile.name,
        mimeType: pendingFile.type,
      }
      const updatedFiles = [...uploadedFiles, newFile]
      setUploadedFiles(updatedFiles)
      setPendingFile(null)

      // Persist file association immediately if exam already exists
      if (examId) {
        await updateImageExam(examId, {
          fileId: updatedFiles[0].id,
          fileIds: updatedFiles.map((f) => f.id),
        })
      }

      toast({ title: "Arquivo enviado com sucesso" })
    } catch (error) {
      console.error("Upload error:", error)
      toast({ variant: "destructive", title: "Erro ao enviar arquivo" })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveFile = async (fileId: string) => {
    const updatedFiles = uploadedFiles.filter((f) => f.id !== fileId)
    setUploadedFiles(updatedFiles)

    if (examId) {
      await updateImageExam(examId, {
        fileId: updatedFiles[0]?.id,
        fileIds: updatedFiles.map((f) => f.id),
      }).catch(console.error)
    }
  }

  const handleAnalyze = async () => {
    if (uploadedFiles.length === 0) {
      toast({ variant: "destructive", title: "Faça o upload de pelo menos um arquivo primeiro" })
      return
    }
    if (!examId) {
      toast({ variant: "destructive", title: "Salve o exame primeiro para analisar" })
      return
    }

    setAnalyzing(true)
    try {
      const result = await analyzeImageExam(examId)
      setExtractedText(result.extractedText || "")
      const htmlReport = mdToHtml(result.aiReport || "")
      setAiReport(htmlReport)
      setAiAnalysis(result.aiAnalysis)
      toast({ title: "Análise concluída com sucesso" })
    } catch (error) {
      console.error("Analysis error:", error)
      toast({ variant: "destructive", title: "Erro ao analisar exame" })
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!patientId) {
      toast({ variant: "destructive", title: "Selecione um paciente" })
      return
    }

    setSaving(true)
    try {
      const data: Partial<ImageExam> = {
        patientId,
        ...(veterinarian?.id && { veterinarianId: veterinarian.id }),
        type: examType,
        fileId: uploadedFiles[0]?.id,
        fileIds: uploadedFiles.map((f) => f.id),
        veterinarianNotes,
        aiReport,
        extractedText,
        aiAnalysis,
        pdvItems: selectedItems.length > 0 ? selectedItems : undefined,
      }

      let result: ImageExam
      if (examId) {
        result = await updateImageExam(examId, data)
      } else {
        result = await createImageExam(data)
        setExamId(result.id)
      }

      toast({ title: "Exame salvo com sucesso" })
    } catch (error) {
      console.error("Save error:", error)
      toast({ variant: "destructive", title: "Erro ao salvar exame" })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenFinalize = async () => {
    if (!examId) {
      toast({ variant: "destructive", title: "Salve o exame primeiro" })
      return
    }
    if (!patientId) {
      toast({ variant: "destructive", title: "Selecione um paciente" })
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
    } catch {
      setOpenFicha(null)
    }
    setFinalizeOpen(true)
  }

  const handleFinalize = async () => {
    if (!examId || !openFicha) return
    setFinalizing(true)
    try {
      await handleSave()
      await finalizeImageExam(examId, { fichaId: openFicha.id })
      toast({ title: "Exame finalizado", description: "Itens adicionados à ficha." })
      setFinalizeOpen(false)
      router.push(`/fichas/${openFicha.id}`)
    } catch (error) {
      console.error("Finalize error:", error)
      toast({ variant: "destructive", title: "Erro ao finalizar exame" })
    } finally {
      setFinalizing(false)
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


  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">Novo Exame de Imagem</h1>
            <p className="truncate text-xs text-muted-foreground">Upload de arquivo e análise por IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" strokeWidth={2} />}
            Salvar
          </Button>
          <Button size="sm" className="gap-1.5" onClick={handleOpenFinalize} disabled={!examId}>
            <Check className="h-3.5 w-3.5" strokeWidth={2} />
            Finalizar
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
          <div className="flex items-center gap-2">
            <Label htmlFor="examType">Tipo de Exame</Label>
            <Select value={examType} onValueChange={(value: any) => setExamType(value)}>
              <SelectTrigger id="examType" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="radiografia">Radiografia</SelectItem>
                <SelectItem value="ultrassom">Ultrassom</SelectItem>
                <SelectItem value="tomografia">Tomografia</SelectItem>
                <SelectItem value="ressonancia">Ressonância</SelectItem>
                <SelectItem value="laboratorio">Laboratório</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {/* File Upload */}
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium">Arquivos do Exame</h2>

              {/* Uploaded files list */}
              {uploadedFiles.length > 0 && (
                <div className="flex flex-col gap-2">
                  {uploadedFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2"
                    >
                      {f.mimeType.startsWith("image/") ? (
                        <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                      ) : (
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(f.id)}
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add new file */}
              <div className="flex items-center gap-3">
                <Input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => setPendingFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleFileUpload}
                  disabled={!pendingFile || !patientId || uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" strokeWidth={1.75} />
                  )}
                  Enviar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Imagens (JPG, PNG) ou PDFs · máx. {MAX_FILE_MB}MB por arquivo · múltiplos arquivos permitidos
              </p>
            </div>

            {/* AI Analysis */}
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium">Análise por IA</h2>
                {examId && uploadedFiles.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={analyzing}>
                    {analyzing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
                    )}
                    {analyzing ? "Analisando..." : `Analisar ${uploadedFiles.length > 1 ? `${uploadedFiles.length} arquivos` : ""}`}
                  </Button>
                )}
              </div>
              {extractedText && (
                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Texto Extraído (OCR)</Label>
                  <div className="rounded-md border border-border bg-muted/50 p-3 text-xs">
                    {extractedText}
                  </div>
                </div>
              )}
              {aiAnalysis && (
                <div className="flex flex-col gap-2">
                  <Label className="text-xs">Achados da IA</Label>
                  <ul className="list-inside list-disc text-xs text-muted-foreground">
                    {aiAnalysis.findings?.map((finding: string, i: number) => (
                      <li key={i}>{finding}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Report Editor */}
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium">Laudo</h2>
              <RichTextEditor value={aiReport} onChange={setAiReport} placeholder="Laudo gerado pela IA (editável)..." />
            </div>

            {/* Veterinarian Notes */}
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
              <h2 className="text-sm font-medium">Notas do Veterinário</h2>
              <RichTextEditor value={veterinarianNotes} onChange={setVeterinarianNotes} placeholder="Adicione suas observações..." />
            </div>
          </div>

          {/* Mini PDV */}
          <aside className="flex flex-col gap-4">
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
                        <X className="h-4 w-4" strokeWidth={2} />
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
          </aside>
        </div>
      </main>

      {/* Finalize modal */}
      <Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" strokeWidth={2} />
              Finalizar exame
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
              <Button onClick={handleFinalize} disabled={finalizing || !openFicha} className="gap-1.5">
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
