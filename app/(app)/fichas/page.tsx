"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FolderOpen, Plus, Loader2, PawPrint, User,
  Clock, Package, DollarSign, Search, X, Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { listFichas, createFicha, listPatients, fecharFicha } from "@/lib/api"
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
import { Combobox } from "@/components/ui/combobox"
import type { Ficha, Patient } from "@/lib/types"
import { cn } from "@/lib/utils"

function formatCurrency(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "agora"
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

const STATUS_CONFIG = {
  aberto: { label: "Aberta", className: "bg-green-500/10 text-green-700" },
  aguardando_cobranca: { label: "Aguard. cobrança", className: "bg-amber-500/10 text-amber-700" },
  fechado: { label: "Fechada", className: "bg-muted text-muted-foreground" },
} as const

type FilterStatus = "aberto" | "aguardando_cobranca" | "all"

export default function FichasPage() {
  const router = useRouter()
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("aberto")
  const [search, setSearch] = useState("")

  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState("")
  const [creating, setCreating] = useState(false)

  const [checkoutFicha, setCheckoutFicha] = useState<Ficha | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("pix")
  const [paying, setPaying] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const status = filterStatus === "all" ? undefined : filterStatus
      const data = await listFichas({ status })
      setFichas(data)
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    listPatients().then(setPatients).catch(() => {})
  }, [])

  function handleOpenCheckout(ficha: Ficha) {
    setCheckoutFicha(ficha)
    setPayAmount(ficha.totalAmount.toFixed(2))
    setPayMethod("pix")
  }

  async function handlePay() {
    if (!checkoutFicha) return
    setPaying(true)
    try {
      await fecharFicha(checkoutFicha.id, { amount: parseFloat(payAmount) || 0, method: payMethod })
      setCheckoutFicha(null)
      await load()
    } finally {
      setPaying(false)
    }
  }

  async function handleCreate() {
    if (!selectedPatientId) return
    setCreating(true)
    try {
      const ficha = await createFicha({ patientId: selectedPatientId })
      setNewDialogOpen(false)
      setSelectedPatientId("")
      router.push(`/fichas/${ficha.id}`)
    } finally {
      setCreating(false)
    }
  }

  const filtered = fichas.filter(f => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      f.patient?.name.toLowerCase().includes(q) ||
      f.tutor?.name.toLowerCase().includes(q)
    )
  })

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Fichas de atendimento</h1>
          <p className="text-xs text-muted-foreground">Gerencie os atendimentos em aberto</p>
        </div>
        <Button size="sm" onClick={() => setNewDialogOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Nova ficha
        </Button>
      </div>

      <main className="flex flex-col gap-4 p-4 md:p-6">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar paciente ou tutor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-card pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-primary sm:w-72"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-card p-1">
            {(
              [
                { value: "aberto",              label: "Abertas" },
                { value: "aguardando_cobranca", label: "Aguardando cobrança" },
                { value: "all",                 label: "Todas" },
              ] as const
            ).map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFilterStatus(opt.value)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                  filterStatus === opt.value
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando fichas...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {search ? "Nenhuma ficha encontrada para a busca." : "Nenhuma ficha neste status."}
            </p>
            {!search && filterStatus === "aberto" && (
              <Button size="sm" variant="outline" onClick={() => setNewDialogOpen(true)}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Abrir primeira ficha
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(f => (
              <div
                key={f.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40"
              >
                {/* Patient + tutor */}
                <Link href={`/fichas/${f.id}`} className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <PawPrint className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate text-sm font-semibold">{f.patient?.name ?? "Paciente"}</span>
                    {f.patient && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {f.patient.species} · {f.patient.breed}
                      </span>
                    )}
                    <span className={cn(
                      "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                      STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG]?.className ?? "bg-muted text-muted-foreground"
                    )}>
                      {STATUS_CONFIG[f.status as keyof typeof STATUS_CONFIG]?.label ?? f.status}
                    </span>
                  </div>
                  {f.tutor && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">{f.tutor.name}</span>
                    </div>
                  )}
                </Link>

                {/* Meta */}
                <div className="flex shrink-0 items-center gap-5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatRelative(f.openedAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    {f.items.length} {f.items.length === 1 ? "item" : "itens"}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-foreground">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(f.totalAmount)}
                  </span>
                </div>

                {/* Cobrar — só para fichas aguardando cobrança */}
                {f.status === "aguardando_cobranca" && (
                  <Button size="sm" onClick={() => handleOpenCheckout(f)}>
                    <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                    Cobrar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Checkout dialog */}
      <Dialog open={!!checkoutFicha} onOpenChange={open => { if (!open) setCheckoutFicha(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Cobrar — {checkoutFicha?.patient?.name}
            </DialogTitle>
          </DialogHeader>
          {checkoutFicha && (
            <div className="flex flex-col gap-4">
              <div className="rounded-md border border-border">
                <div className="divide-y divide-border">
                  {checkoutFicha.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="truncate">{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}</span>
                      <span className="ml-2 shrink-0 font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(checkoutFicha.totalAmount)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCheckoutFicha(null)} disabled={paying}>
                  Cancelar
                </Button>
                <Button onClick={handlePay} disabled={paying || !payAmount || parseFloat(payAmount) <= 0}>
                  {paying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                  Confirmar pagamento
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Nova ficha dialog */}
      <Dialog open={newDialogOpen} onOpenChange={open => { setNewDialogOpen(open); if (!open) setSelectedPatientId("") }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Abrir nova ficha
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <Combobox
              options={patients.map(p => ({
                value: p.id,
                label: `${p.name} — ${p.species} · ${p.breed} (${p.tutor?.name ?? "Sem tutor"})`,
              }))}
              value={selectedPatientId}
              onChange={setSelectedPatientId}
              placeholder="Buscar paciente..."
              emptyMessage="Nenhum paciente encontrado"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNewDialogOpen(false)} disabled={creating}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={!selectedPatientId || creating}>
                {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Abrir ficha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
