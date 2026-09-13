"use client"

import { use, useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Plus, Trash2, Search, Loader2, Check,
  Clock, DollarSign, Stethoscope, Package, Scissors, Syringe,
  AlertCircle, X, FileText, ImageIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  getFicha,
  updateFicha,
  addFichaItem,
  removeFichaItem,
  fecharFicha,
  listServices,
  listInventory,
} from "@/lib/api"
import type { Ficha, FichaItem, FichaSource, Service, InventoryItem } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  aberto: "Aberta",
  aguardando_cobranca: "Aguardando cobrança",
  fechado: "Fechada",
}
const STATUS_COLOR: Record<string, string> = {
  aberto: "bg-green-500/10 text-green-700",
  aguardando_cobranca: "bg-amber-500/10 text-amber-700",
  fechado: "bg-muted text-muted-foreground",
}

const ITEM_ICON: Record<string, React.ReactNode> = {
  servico:  <Stethoscope className="h-3.5 w-3.5" />,
  produto:  <Package className="h-3.5 w-3.5" />,
  consulta: <Stethoscope className="h-3.5 w-3.5" />,
  exame:    <Scissors className="h-3.5 w-3.5" />,
  cirurgia: <Scissors className="h-3.5 w-3.5" />,
  vacina:   <Syringe className="h-3.5 w-3.5" />,
}

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "agora"
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

const EXAM_TYPE_LABEL: Record<string, string> = {
  radiografia: "Radiografia",
  ultrassom: "Ultrassom",
  tomografia: "Tomografia",
  ressonancia: "Ressonância",
  laboratorio: "Laboratório",
  outro: "Exame",
}

function SourceHeader({ label, date, vet }: { label: string; date: string; vet?: string | null }) {
  return (
    <div className="flex items-center gap-2 bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
      <span className="font-semibold text-foreground">{label}</span>
      <span>·</span>
      <span>{new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
      {vet && <><span>·</span><span>Dr(a). {vet}</span></>}
    </div>
  )
}

function ItemRow({
  item,
  isClosed,
  removingId,
  onRemove,
}: {
  item: FichaItem
  isClosed: boolean
  removingId: string | null
  onRemove: (item: FichaItem) => void
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        {ITEM_ICON[item.type] ?? <Package className="h-3.5 w-3.5" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-medium">{item.name}</span>
        <span className="text-[11px] text-muted-foreground">
          {item.quantity}x {formatCurrency(item.unitPrice)}
          {item.addedAt && ` · ${formatRelative(item.addedAt)}`}
        </span>
      </div>
      <span className="shrink-0 text-sm font-semibold">{formatCurrency(item.total)}</span>
      {!isClosed && (
        <button
          type="button"
          onClick={() => onRemove(item)}
          disabled={removingId === item.id}
          className="ml-1 shrink-0 text-muted-foreground hover:text-destructive"
        >
          {removingId === item.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Trash2 className="h-3.5 w-3.5" />
          }
        </button>
      )}
    </li>
  )
}

function ItemGroups({
  ficha,
  isClosed,
  removingId,
  onRemove,
}: {
  ficha: Ficha
  isClosed: boolean
  removingId: string | null
  onRemove: (item: FichaItem) => void
}) {
  // Group items by sourceId (null = manually added)
  const groups = new Map<string | null, FichaItem[]>()
  for (const item of ficha.items) {
    const key = item.sourceId ?? null
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }

  const sources = ficha.sources

  return (
    <div className="divide-y divide-border">
      {[...groups.entries()].map(([sourceId, items]) => {
        const firstItem = items[0]
        const sourceType = firstItem?.sourceType

        let header: React.ReactNode = null
        if (sourceId && sourceType === 'consulta' && sources?.consultas[sourceId]) {
          const c = sources.consultas[sourceId]
          header = <SourceHeader label="Consulta" date={c.createdAt} vet={c.veterinarian?.name} />
        } else if (sourceId && sourceType === 'exame_imagem' && sources?.exames[sourceId]) {
          const e = sources.exames[sourceId]
          const label = e.type ? (EXAM_TYPE_LABEL[e.type] ?? "Exame de Imagem") : "Exame de Imagem"
          header = <SourceHeader label={label} date={e.createdAt} vet={e.veterinarian?.name} />
        } else if (sourceId) {
          header = <SourceHeader label="Atendimento" date={firstItem.addedAt} />
        }

        return (
          <div key={sourceId ?? '__manual__'}>
            {header}
            <ul>
              {items.map(item => (
                <ItemRow
                  key={item.id}
                  item={item}
                  isClosed={isClosed}
                  removingId={removingId}
                  onRemove={onRemove}
                />
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export default function FichaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [loading, setLoading] = useState(true)

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [systemSearch, setSystemSearch] = useState("")
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<InventoryItem[]>([])
  const [savingItem, setSavingItem] = useState(false)

  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("pix")
  const [paying, setPaying] = useState(false)

  const [removingId, setRemovingId] = useState<string | null>(null)
  const [sendingToCobranca, setSendingToCobranca] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getFicha(id)
      setFicha(data)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    Promise.all([listServices(), listInventory()])
      .then(([s, p]) => { setServices(s); setProducts(p) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (payDialogOpen && ficha) setPayAmount(ficha.totalAmount.toFixed(2))
  }, [payDialogOpen, ficha])

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(systemSearch.toLowerCase())
  )
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(systemSearch.toLowerCase())
  )

  async function handleAddItem(name: string, price: number, type: string) {
    setSavingItem(true)
    try {
      await addFichaItem(id, { type, name, quantity: 1, unitPrice: price, total: price })
      await load()
      setAddDialogOpen(false)
      setSystemSearch("")
    } finally {
      setSavingItem(false)
    }
  }

  async function handleRemoveItem(item: FichaItem) {
    setRemovingId(item.id)
    try {
      await removeFichaItem(id, item.id)
      await load()
    } finally {
      setRemovingId(null)
    }
  }

  async function handleSendToCobranca() {
    setSendingToCobranca(true)
    try {
      await updateFicha(id, { status: "aguardando_cobranca" })
      await load()
    } finally {
      setSendingToCobranca(false)
    }
  }

  async function handlePay() {
    setPaying(true)
    try {
      await fecharFicha(id, { amount: parseFloat(payAmount) || 0, method: payMethod })
      setPayDialogOpen(false)
      router.push("/cobranca")
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col gap-4 p-4 md:p-6">
        <div className="text-sm text-muted-foreground">Carregando ficha...</div>
      </main>
    )
  }

  if (!ficha) {
    return (
      <main className="flex flex-col gap-4 p-4 md:p-6">
        <p className="text-sm text-muted-foreground">Ficha não encontrada.</p>
        <Link href="/fichas" className="text-xs text-primary hover:underline">Voltar</Link>
      </main>
    )
  }

  const isClosed = ficha.status === "fechado"
  const isWaiting = ficha.status === "aguardando_cobranca"

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <Link href="/fichas" className="shrink-0 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">
              Ficha — {ficha.patient?.name ?? "Paciente"}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {ficha.tutor?.name && `${ficha.tutor.name} · `}
              Aberta {formatRelative(ficha.openedAt)}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium", STATUS_COLOR[ficha.status])}>
            {STATUS_LABEL[ficha.status]}
          </span>
        </div>

        {!isClosed && (
          <div className="flex items-center gap-2">
            {ficha.status === "aberto" && (
              <Button size="sm" variant="outline" onClick={handleSendToCobranca} disabled={sendingToCobranca || ficha.items.length === 0}>
                {sendingToCobranca ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                Enviar para cobrança
              </Button>
            )}
            {isWaiting && (
              <Button size="sm" onClick={() => setPayDialogOpen(true)}>
                <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                Cobrar agora
              </Button>
            )}
          </div>
        )}
      </div>

      <main className="grid grid-cols-1 gap-4 p-4 md:p-6 lg:grid-cols-3">
        {/* Coluna esquerda — info do paciente */}
        <div className="flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-primary">Paciente</h2>
            {ficha.patient && (
              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground">Nome:</p>
                  <Link href={`/pacientes/${ficha.patientId}`} className="font-medium hover:text-primary hover:underline">
                    {ficha.patient.name}
                  </Link>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Espécie / Raça:</p>
                  <p>{ficha.patient.species} · {ficha.patient.breed}</p>
                </div>
              </div>
            )}
          </section>

          {ficha.tutor && (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-primary">Responsável</h2>
              <div className="flex flex-col gap-2 text-sm">
                <div>
                  <p className="text-[11px] text-muted-foreground">Nome:</p>
                  <p className="font-medium">{ficha.tutor.name}</p>
                </div>
                {ficha.tutor.phone && (
                  <div>
                    <p className="text-[11px] text-muted-foreground">Telefone:</p>
                    <p>{ficha.tutor.phone}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {!isClosed && (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-primary">Registrar</h2>
              <div className="flex flex-col gap-2">
                <Link
                  href={`/consultorio/novo?patientId=${ficha.patientId}`}
                  className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                  Consulta
                </Link>
                <Link
                  href={`/exames-imagens/novo?patientId=${ficha.patientId}`}
                  className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                  Exame de imagem
                </Link>
              </div>
            </section>
          )}

          {isClosed && ficha.closedAt && (
            <section className="rounded-lg border border-border bg-card p-4">
              <h2 className="mb-2 text-sm font-semibold text-primary">Pagamento</h2>
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor pago</span>
                  <span className="font-semibold text-green-700">{formatCurrency(ficha.totalAmount)}</span>
                </div>
                {ficha.paymentMethod && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Forma</span>
                    <span className="capitalize">{ficha.paymentMethod}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fechada em</span>
                  <span>{new Date(ficha.closedAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            </section>
          )}

          {ficha.status === "aberto" && ficha.items.length === 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              Adicione ao menos um item para enviar para cobrança.
            </div>
          )}
        </div>

        {/* Coluna central + direita — itens */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <section className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-sm font-medium">Itens do atendimento</h2>
              {!isClosed && (
                <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Adicionar item
                </Button>
              )}
            </div>

            {ficha.items.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                Nenhum item ainda. Adicione serviços ou produtos ao atendimento.
              </div>
            ) : (
              <>
                <ItemGroups ficha={ficha} isClosed={isClosed} removingId={removingId} onRemove={handleRemoveItem} />
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(ficha.totalAmount)}</span>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* Dialog: adicionar item do sistema */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar item</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Pesquisar serviço ou produto..."
            value={systemSearch}
            onChange={e => setSystemSearch(e.target.value)}
            autoFocus
          />
          <Tabs defaultValue="servicos" className="mt-1">
            <TabsList className="w-full">
              <TabsTrigger value="servicos" className="flex-1">Serviços</TabsTrigger>
              <TabsTrigger value="produtos" className="flex-1">Produtos</TabsTrigger>
            </TabsList>
            <TabsContent value="servicos" className="mt-2 max-h-60 overflow-y-auto space-y-1">
              {filteredServices.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Nenhum serviço encontrado</p>
              ) : filteredServices.map(s => (
                <button
                  key={s.id}
                  type="button"
                  disabled={savingItem}
                  onClick={() => handleAddItem(s.name, s.price, "servico")}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <span>{s.name}</span>
                  <span className="text-xs font-medium text-muted-foreground">{formatCurrency(s.price)}</span>
                </button>
              ))}
            </TabsContent>
            <TabsContent value="produtos" className="mt-2 max-h-60 overflow-y-auto space-y-1">
              {filteredProducts.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Nenhum produto encontrado</p>
              ) : filteredProducts.map(p => (
                <button
                  key={p.id}
                  type="button"
                  disabled={savingItem}
                  onClick={() => handleAddItem(p.name, p.salePrice, "produto")}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm hover:bg-muted"
                >
                  <span>{p.name}</span>
                  <span className="text-xs font-medium text-muted-foreground">{formatCurrency(p.salePrice)}</span>
                </button>
              ))}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog: cobrar */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Finalizar cobrança
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                Total calculado: <strong>{formatCurrency(ficha.totalAmount)}</strong>
              </p>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <Label>Forma de pagamento</Label>
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="debito">Cartão de Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Valor cobrado (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPayDialogOpen(false)} disabled={paying}>
                Cancelar
              </Button>
              <Button onClick={handlePay} disabled={paying || !payAmount || parseFloat(payAmount) <= 0}>
                {paying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                Confirmar pagamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
