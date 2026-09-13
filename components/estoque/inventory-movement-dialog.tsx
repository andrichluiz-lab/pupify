"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { InventoryItem } from "@/lib/types"

interface InventoryMovementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (itemId: string, quantity: number, type: "entrada" | "saida", notes?: string) => Promise<void>
  item: InventoryItem | null
}

export function InventoryMovementDialog({
  open,
  onOpenChange,
  onSave,
  item,
}: InventoryMovementDialogProps) {
  const [quantity, setQuantity] = useState<number>(0)
  const [type, setType] = useState<"entrada" | "saida">("entrada")
  const [notes, setNotes] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!item) {
      setError("Nenhum item selecionado")
      return
    }
    
    if (quantity <= 0) {
      setError("A quantidade deve ser maior que zero")
      return
    }
    
    if (type === "saida" && quantity > item.stock) {
      setError("Quantidade superior ao estoque disponível")
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(item.id, quantity, type, notes || undefined)
      onOpenChange(false)
      setError(null)
      // Reset form
      setQuantity(0)
      setType("entrada")
      setNotes("")
    } catch (err) {
      console.error("Error saving inventory movement:", err)
      setError("Erro ao registrar movimentação. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Movimentação de Estoque
          </DialogTitle>
          <DialogDescription>
            Registre a entrada ou saída de itens do estoque.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          
          {item && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-medium">{item.name}</p>
              <p className="text-xs text-muted-foreground">
                SKU: {item.sku} · Estoque atual: {item.stock} {item.unit}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tipo de Movimentação</Label>
            <Select
              value={type}
              onValueChange={(value: "entrada" | "saida") => setType(value)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              min="0.01"
              value={quantity || ""}
              onChange={(e) => setQuantity(parseFloat(e.target.value))}
              placeholder="0"
              required
            />
            {item && (
              <p className="text-xs text-muted-foreground">
                Unidade: {item.unit}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Compra do fornecedor XYZ"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Registrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
