"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { InventoryItem, InventoryCategory } from "@/lib/types"

interface InventoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<InventoryItem>) => Promise<void>
  initialData?: Partial<InventoryItem>
}

const CATEGORY_OPTIONS = [
  { value: "medicamento", label: "Medicamento" },
  { value: "vacina", label: "Vacina" },
  { value: "insumo", label: "Insumo" },
  { value: "racao", label: "Ração" },
  { value: "acessorio", label: "Acessório" },
] as const

const UNIT_OPTIONS = [
  { value: "un", label: "Unidade" },
  { value: "ml", label: "Mililitro" },
  { value: "cp", label: "Comprimido" },
  { value: "kg", label: "Quilograma" },
  { value: "g", label: "Grama" },
  { value: "l", label: "Litro" },
] as const

export function InventoryFormDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
}: InventoryFormDialogProps) {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    sku: initialData?.sku || "",
    name: initialData?.name || "",
    category: initialData?.category || "medicamento",
    unit: initialData?.unit || "un",
    stock: initialData?.stock || 0,
    minStock: initialData?.minStock || 10,
    unitCost: initialData?.unitCost || 0,
    salePrice: initialData?.salePrice || 0,
    supplier: initialData?.supplier || "",
    batch: initialData?.batch || "",
    expiresAt: initialData?.expiresAt ? initialData.expiresAt.split("T")[0] : "",
    requiresPrescription: initialData?.requiresPrescription || false,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validation
    if (!formData.sku?.trim()) {
      setError("O SKU é obrigatório")
      return
    }
    
    if (!formData.name?.trim()) {
      setError("O nome é obrigatório")
      return
    }
    
    if (formData.stock === undefined || formData.stock < 0) {
      setError("O estoque deve ser maior ou igual a zero")
      return
    }
    
    if (formData.minStock === undefined || formData.minStock < 0) {
      setError("O estoque mínimo deve ser maior ou igual a zero")
      return
    }
    
    if (formData.unitCost === undefined || formData.unitCost < 0) {
      setError("O custo unitário deve ser maior ou igual a zero")
      return
    }
    
    if (formData.salePrice === undefined || formData.salePrice < 0) {
      setError("O preço de venda deve ser maior ou igual a zero")
      return
    }

    // Prepare data for submission
    const submissionData: Partial<InventoryItem> = {
      ...formData,
      stock: formData.stock || 0,
      minStock: formData.minStock || 0,
      unitCost: formData.unitCost || 0,
      salePrice: formData.salePrice || 0,
      expiresAt: formData.expiresAt ? `${formData.expiresAt}T00:00:00.000Z` : undefined,
    }
    
    // Remove undefined optional fields
    if (!submissionData.supplier?.trim()) delete submissionData.supplier
    if (!submissionData.batch?.trim()) delete submissionData.batch
    if (!submissionData.expiresAt) delete submissionData.expiresAt

    setIsSubmitting(true)
    try {
      await onSave(submissionData)
      onOpenChange(false)
      setError(null)
      // Reset form
      setFormData({
        sku: "",
        name: "",
        category: "medicamento",
        unit: "un",
        stock: 0,
        minStock: 10,
        unitCost: 0,
        salePrice: 0,
        supplier: "",
        batch: "",
        expiresAt: "",
        requiresPrescription: false,
      })
    } catch (err) {
      console.error("Error saving inventory item:", err)
      setError("Erro ao salvar item. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? "Editar Item" : "Novo Item de Estoque"}
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para cadastrar um item no estoque.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Ex: MED001"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="category">Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: InventoryCategory) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Dipirona 500mg"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="unit">Unidade *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger id="unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="requiresPrescription">Receita?</Label>
              <Select
                value={formData.requiresPrescription ? "true" : "false"}
                onValueChange={(value) => setFormData({ ...formData, requiresPrescription: value === "true" })}
              >
                <SelectTrigger id="requiresPrescription">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sim</SelectItem>
                  <SelectItem value="false">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="stock">Estoque Atual *</Label>
              <Input
                id="stock"
                type="number"
                step="0.01"
                min="0"
                value={formData.stock || ""}
                onChange={(e) => setFormData({ ...formData, stock: parseFloat(e.target.value) })}
                placeholder="0"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="minStock">Estoque Mínimo *</Label>
              <Input
                id="minStock"
                type="number"
                step="0.01"
                min="0"
                value={formData.minStock || ""}
                onChange={(e) => setFormData({ ...formData, minStock: parseFloat(e.target.value) })}
                placeholder="10"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="unitCost">Custo Unitário (R$) *</Label>
              <Input
                id="unitCost"
                type="number"
                step="0.01"
                min="0"
                value={formData.unitCost || ""}
                onChange={(e) => setFormData({ ...formData, unitCost: parseFloat(e.target.value) })}
                placeholder="0,00"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="salePrice">Preço Venda (R$) *</Label>
              <Input
                id="salePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.salePrice || ""}
                onChange={(e) => setFormData({ ...formData, salePrice: parseFloat(e.target.value) })}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="supplier">Fornecedor (opcional)</Label>
            <Input
              id="supplier"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              placeholder="Ex: Distribuidora XYZ"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="batch">Lote (opcional)</Label>
              <Input
                id="batch"
                value={formData.batch}
                onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                placeholder="Ex: L12345"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="expiresAt">Validade (opcional)</Label>
              <DatePicker
                value={formData.expiresAt}
                onChange={(value) => setFormData({ ...formData, expiresAt: value })}
                placeholder="Selecione a validade"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : initialData?.id ? "Atualizar" : "Criar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
