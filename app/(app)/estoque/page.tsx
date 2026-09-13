"use client"

import { useState, useEffect } from "react"
import {
  Search,
  Pill,
  Syringe,
  Package,
  Scan,
  AlertTriangle,
  Download,
  ArrowDownUp,
  Box,
  Bone,
  Edit,
  Trash2,
} from "lucide-react"
import { AppTopbar } from "@/components/app-topbar"
import { listInventory } from "@/lib/api"
import { updateInventoryItemAction, deleteInventoryItemAction } from "./actions"
import { StatCard } from "@/components/dashboard/stat-card"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { InventoryMovementDialog } from "@/components/estoque/inventory-movement-dialog"
import type { InventoryItem, InventoryCategory } from "@/lib/types"

const CAT_META: Record<
  InventoryCategory,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  medicamento: { label: "Medicamento", icon: Pill },
  vacina: { label: "Vacina", icon: Syringe },
  insumo: { label: "Insumo", icon: Package },
  racao: { label: "Ração", icon: Bone },
  acessorio: { label: "Acessório", icon: Box },
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

function formatDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" })
}

export default function EstoquePage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<InventoryCategory | "todos">("todos")
  const [movementDialogOpen, setMovementDialogOpen] = useState(false)
  const [selectedItemForMovement, setSelectedItemForMovement] = useState<InventoryItem | null>(null)

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    setLoading(true)
    try {
      const data = await listInventory()
      setItems(data)
    } catch (error) {
      console.error("Error loading inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateItem = async (id: string, data: Partial<InventoryItem>) => {
    const result = await updateInventoryItemAction(id, data)
    if (result.success) {
      await loadItems()
    } else {
      throw new Error(result.error)
    }
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return
    const result = await deleteInventoryItemAction(id)
    if (result.success) {
      await loadItems()
    } else {
      throw new Error(result.error)
    }
  }

  const handleMovement = async (itemId: string, quantity: number, type: "entrada" | "saida", notes?: string) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return

    const newStock = type === "entrada" ? item.stock + quantity : item.stock - quantity
    const result = await updateInventoryItemAction(itemId, { stock: newStock })
    if (result.success) {
      await loadItems()
    } else {
      throw new Error(result.error)
    }
  }

  const openMovementDialog = (item: InventoryItem) => {
    setSelectedItemForMovement(item)
    setMovementDialogOpen(true)
  }

  // Filter items
  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = categoryFilter === "todos" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const lowStock = filteredItems.filter((i) => i.stock < i.minStock).length
  const expiringSoon = filteredItems.filter((i) => {
    const d = daysUntil(i.expiresAt)
    return d !== null && d <= 60
  }).length
  const totalValue = filteredItems.reduce((acc, i) => acc + i.stock * i.unitCost, 0)

  return (
    <>
      <AppTopbar
        title="Estoque"
        description={`${items.length} itens cadastrados`}
        action={{ label: "Novo item", href: "/estoque/novo" }}
      />

      <main className="flex flex-col gap-6 p-4 md:p-6">
        {/* Stats row */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Itens cadastrados" value={filteredItems.length.toString()} />
          <StatCard
            label="Estoque baixo"
            value={lowStock.toString()}
            hint={lowStock > 0 ? "abaixo do mínimo" : undefined}
            icon={lowStock > 0 ? AlertTriangle : undefined}
          />
          <StatCard
            label="Vence em 60 dias"
            value={expiringSoon.toString()}
            hint="próximos 60 dias"
          />
          <StatCard label="Valor em estoque" value={brl(totalValue)} />
        </section>

        {/* Actions and filters */}
        <section className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Scan className="h-3.5 w-3.5" strokeWidth={2} />
              Ler código
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowDownUp className="h-3.5 w-3.5" strokeWidth={2} />
              Movimentação
            </Button>
          </div>
          <InputGroup className="max-w-md flex-1">
            <InputGroupAddon>
              <Search className="h-4 w-4" strokeWidth={2} />
            </InputGroupAddon>
            <InputGroupInput 
              placeholder="Buscar por nome ou SKU..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <div className="flex flex-wrap gap-1.5 rounded-md border border-border bg-background p-0.5 text-sm">
            {[
              { key: "todos", label: "Todos" },
              { key: "medicamento", label: "Medicamentos" },
              { key: "vacina", label: "Vacinas" },
              { key: "insumo", label: "Insumos" },
              { key: "racao", label: "Rações" },
              { key: "acessorio", label: "Acessórios" },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategoryFilter(cat.key as InventoryCategory | "todos")}
                className={
                  categoryFilter === cat.key
                    ? "rounded px-3 py-1 text-xs font-medium text-foreground bg-muted"
                    : "rounded px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                }
              >
                {cat.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="ml-auto gap-1.5">
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            Exportar
          </Button>
        </section>

        {/* Table */}
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Item</th>
                  <th className="px-4 py-3 text-left font-medium">Categoria</th>
                  <th className="px-4 py-3 text-right font-medium">Estoque</th>
                  <th className="px-4 py-3 text-left font-medium">Lote</th>
                  <th className="px-4 py-3 text-left font-medium">Validade</th>
                  <th className="px-4 py-3 text-right font-medium">Custo</th>
                  <th className="px-4 py-3 text-right font-medium">Venda</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                ) : filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum item encontrado
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <InventoryRow 
                      key={item.id} 
                      item={item} 
                      onDelete={() => handleDeleteItem(item.id)}
                      onMovement={() => openMovementDialog(item)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Dialogs */}
        <InventoryMovementDialog
          open={movementDialogOpen}
          onOpenChange={setMovementDialogOpen}
          onSave={handleMovement}
          item={selectedItemForMovement}
        />
      </main>
    </>
  )
}

function InventoryRow({ 
  item, 
  onDelete, 
  onMovement 
}: { 
  item: InventoryItem
  onDelete: () => void
  onMovement: () => void
}) {
  const CatIcon = CAT_META[item.category].icon
  const low = item.stock < item.minStock
  const pct = Math.min(100, (item.stock / Math.max(1, item.minStock * 2)) * 100)
  const daysLeft = daysUntil(item.expiresAt)
  const expiringSoon = daysLeft !== null && daysLeft <= 60
  const expired = daysLeft !== null && daysLeft < 0

  return (
    <tr className="group transition-colors hover:bg-accent/20">
      <td className="px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <CatIcon className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{item.name}</span>
            <span className="text-xs text-muted-foreground">
              {item.sku} · {item.supplier ?? "—"}
            </span>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-0.5 text-xs text-muted-foreground">
          {CAT_META[item.category].label}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-sm font-medium ${low ? "text-destructive" : "text-foreground"}`}
          >
            {item.stock}
            <span className="ml-1 text-xs font-normal text-muted-foreground">{item.unit}</span>
          </span>
          <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full transition-all ${low ? "bg-destructive" : "bg-primary"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">mín. {item.minStock}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{item.batch ?? "—"}</td>
      <td className="px-4 py-3">
        {item.expiresAt ? (
          <div className="flex flex-col">
            <span
              className={
                expired
                  ? "text-sm font-medium text-destructive"
                  : expiringSoon
                    ? "text-sm font-medium text-amber-600"
                    : "text-sm text-foreground"
              }
            >
              {formatDate(item.expiresAt)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {expired ? `vencido há ${Math.abs(daysLeft!)}d` : `em ${daysLeft}d`}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-sm tabular-nums text-muted-foreground">
        {brl(item.unitCost)}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium tabular-nums">
        {item.salePrice > 0 ? brl(item.salePrice) : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            type="button"
            onClick={onMovement}
            className="rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Entrada
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-border bg-background p-1 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </td>
    </tr>
  )
}

