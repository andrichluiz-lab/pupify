"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  DollarSign, Clock, Package, Loader2, Check,
  User, PawPrint,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { listFichas, fecharFicha } from "@/lib/api"
import type { Ficha } from "@/lib/types"

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
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

export default function CobrancaPage() {
  const [fichas, setFichas] = useState<Ficha[]>([])

  const [loading, setLoading] = useState(true)

  const [selectedFicha, setSelectedFicha] = useState<Ficha | null>(null)
  const [payAmount, setPayAmount] = useState("")
  const [payMethod, setPayMethod] = useState("pix")
  const [paying, setPaying] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await listFichas({ status: "aguardando_cobranca" })
      setFichas(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleOpenCheckout(ficha: Ficha) {
    setSelectedFicha(ficha)
    setPayAmount(ficha.totalAmount.toFixed(2))
    setPayMethod("pix")
  }

  async function handlePay() {
    if (!selectedFicha) return
    setPaying(true)
    try {
      await fecharFicha(selectedFicha.id, { amount: parseFloat(payAmount) || 0, method: payMethod })
      setSelectedFicha(null)
      await load()
    } finally {
      setPaying(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <h1 className="text-sm font-semibold tracking-tight">Cobrança</h1>
        {!loading && (
          <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            {fichas.length} aguardando
          </span>
        )}
      </div>

      <main className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando fila...
          </div>
        ) : fichas.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <Check className="h-8 w-8 text-green-500" />
            <p className="text-sm font-medium">Tudo pago!</p>
            <p className="text-xs text-muted-foreground">Nenhuma ficha aguardando cobrança.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fichas.map(f => (
              <div key={f.id} className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <PawPrint className="h-4 w-4 shrink-0 text-primary" />
                    <Link href={`/fichas/${f.id}`} className="truncate text-sm font-semibold hover:text-primary hover:underline">
                      {f.patient?.name ?? "Paciente"}
                    </Link>
                  </div>
                  {f.tutor && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">{f.tutor.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatRelative(f.openedAt)} atrás
                    </span>
                    {Array.isArray(f.items) && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {f.items.length} {f.items.length === 1 ? "item" : "itens"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-base font-bold text-primary">{formatCurrency(f.totalAmount)}</span>
                  <Button size="sm" onClick={() => handleOpenCheckout(f)}>
                    <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                    Cobrar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Checkout modal */}
      <Dialog open={!!selectedFicha} onOpenChange={open => { if (!open) setSelectedFicha(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Cobrar — {selectedFicha?.patient?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedFicha && (
            <div className="flex flex-col gap-4">
              {/* item list */}
              <div className="rounded-md border border-border">
                <div className="divide-y divide-border">
                  {selectedFicha.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="truncate">{item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}</span>
                      <span className="ml-2 shrink-0 font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(selectedFicha.totalAmount)}</span>
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
                <Button variant="outline" onClick={() => setSelectedFicha(null)} disabled={paying}>
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
    </>
  )
}
