'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, MessageCircle, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createQuote, sendQuoteViaWhatsApp, listServices, listInventory } from '@/lib/api'
import type { Patient, Tutor, QuoteItem, Service, InventoryItem } from '@/lib/types'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  tutor: Tutor
  patients?: Patient[]
  onCreated?: () => void
  whatsappConnected?: boolean
}

const emptyItem = (): QuoteItem & { key: number } => ({
  key: Date.now(),
  description: '',
  quantity: 1,
  unitPrice: 0,
  total: 0,
})

export function QuoteFormDialog({ open, onOpenChange, tutor, patients = [], onCreated, whatsappConnected = false }: Props) {
  const router = useRouter()
  const [patientId, setPatientId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [validUntilDays, setValidUntilDays] = useState<string>('none')
  const [items, setItems] = useState<Array<QuoteItem & { key: number }>>([emptyItem()])
  const [loading, setLoading] = useState(false)
  const [sendingWA, setSendingWA] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [products, setProducts] = useState<InventoryItem[]>([])
  const [systemDialogOpen, setSystemDialogOpen] = useState(false)
  const [systemSearch, setSystemSearch] = useState('')

  useEffect(() => {
    Promise.all([listServices(), listInventory()])
      .then(([s, p]) => { setServices(s); setProducts(p) })
      .catch(() => {})
  }, [])

  function addSystemItem(name: string, price: number) {
    setItems(prev => [...prev, { key: Date.now(), description: name, quantity: 1, unitPrice: price, total: price }])
    setSystemDialogOpen(false)
    setSystemSearch('')
  }

  const filteredServices = services.filter(s => s.name.toLowerCase().includes(systemSearch.toLowerCase()))
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(systemSearch.toLowerCase()))

  const total = items.reduce((s, i) => s + i.total, 0)

  function updateItem(key: number, field: keyof QuoteItem, value: string | number) {
    setItems(prev =>
      prev.map(item => {
        if (item.key !== key) return item
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = Number(updated.quantity) * Number(updated.unitPrice)
        }
        return updated
      })
    )
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()])
  }

  function removeItem(key: number) {
    setItems(prev => prev.filter(i => i.key !== key))
  }

  function reset() {
    setItems([emptyItem()])
    setNotes('')
    setValidUntilDays('')
    setPatientId('')
  }

  async function submit(sendViaWA: boolean) {
    if (items.some(i => !i.description.trim())) return
    sendViaWA ? setSendingWA(true) : setLoading(true)
    try {
      const validUntilDate = validUntilDays && validUntilDays !== 'none'
        ? new Date(Date.now() + Number(validUntilDays) * 86_400_000).toISOString().split('T')[0]
        : undefined
      const quote = await createQuote({
        tutorId: tutor.id,
        patientId: patientId && patientId !== 'none' ? patientId : undefined,
        items: items.map(({ key: _k, ...rest }) => rest),
        total,
        notes: notes || undefined,
        validUntil: validUntilDate,
      })
      onOpenChange(false)
      reset()
      onCreated?.()
      if (sendViaWA) {
        try {
          await sendQuoteViaWhatsApp(quote, { id: tutor.id, name: tutor.name, phone: (tutor as { phone?: string }).phone })
          router.push('/whatsapp')
        } catch (err) {
          alert((err as Error).message || 'Orçamento criado, mas erro ao enviar pelo WhatsApp')
        }
      }
    } finally {
      setLoading(false)
      setSendingWA(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit(false)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Orçamento — {tutor.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {patients.length > 0 && (
              <div className="space-y-1">
                <Label>Animal (opcional)</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o animal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (orçamento geral)</SelectItem>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Válido por</Label>
              <Select value={validUntilDays} onValueChange={setValidUntilDays}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem prazo definido" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem prazo definido</SelectItem>
                  <SelectItem value="10">10 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="20">20 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <div className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 text-xs font-medium text-muted-foreground flex-1">
                <span>Descrição</span>
                <span>Qtd</span>
                <span>Valor unit.</span>
                <span>Total</span>
                <span />
              </div>
            </div>
            {items.map(item => (
              <div key={item.key} className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 items-center">
                <Input
                  placeholder="Ex: Consulta clínica"
                  value={item.description}
                  onChange={e => updateItem(item.key, 'description', e.target.value)}
                  required
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={e => updateItem(item.key, 'quantity', Number(e.target.value))}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={item.unitPrice}
                  onChange={e => updateItem(item.key, 'unitPrice', Number(e.target.value))}
                />
                <Input
                  readOnly
                  value={item.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  className="text-right"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.key)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Item manual
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSystemDialogOpen(true)} className="gap-1.5">
                <Search className="h-3.5 w-3.5" />
                Do sistema
              </Button>
            </div>
          </div>

          <div className="flex justify-end text-sm font-semibold">
            Total: {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </div>

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea
              placeholder="Condições de pagamento, prazo de execução..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading || sendingWA}>
              Cancelar
            </Button>
            <Button type="submit" variant="outline" disabled={loading || sendingWA}>
              {loading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Salvar
            </Button>
            {whatsappConnected && (
              <Button type="button" disabled={loading || sendingWA} onClick={() => submit(true)}>
                {sendingWA
                  ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  : <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                }
                Enviar por WhatsApp
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={systemDialogOpen} onOpenChange={setSystemDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar do sistema</DialogTitle>
        </DialogHeader>
        <Input
          placeholder="Pesquisar..."
          value={systemSearch}
          onChange={e => setSystemSearch(e.target.value)}
          autoFocus
        />
        <Tabs defaultValue="services" className="mt-1">
          <TabsList className="w-full">
            <TabsTrigger value="services" className="flex-1">Serviços</TabsTrigger>
            <TabsTrigger value="products" className="flex-1">Produtos</TabsTrigger>
          </TabsList>
          <TabsContent value="services" className="mt-2 max-h-60 overflow-y-auto space-y-1">
            {filteredServices.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Nenhum serviço encontrado</p>
            ) : filteredServices.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => addSystemItem(s.name, s.price)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>{s.name}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {s.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </button>
            ))}
          </TabsContent>
          <TabsContent value="products" className="mt-2 max-h-60 overflow-y-auto space-y-1">
            {filteredProducts.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">Nenhum produto encontrado</p>
            ) : filteredProducts.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => addSystemItem(p.name, p.salePrice)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                <span>{p.name}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {p.salePrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </button>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
    </>
  )
}
