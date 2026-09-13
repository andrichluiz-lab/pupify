"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { FinancialTransaction, TxDirection, TxStatus, TxCategory, TxMethod } from "@/lib/types"

interface TransactionFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: Partial<FinancialTransaction>) => Promise<void>
  initialData?: Partial<FinancialTransaction>
  defaultDirection?: "entrada" | "saida"
}

const DIRECTION_OPTIONS = [
  { value: "entrada", label: "Entrada (Receita)" },
  { value: "saida", label: "Saída (Despesa)" },
] as const

const STATUS_OPTIONS = [
  { value: "pago", label: "Pago" },
  { value: "pendente", label: "Pendente" },
  { value: "atrasado", label: "Atrasado" },
] as const

const CATEGORY_OPTIONS = [
  { value: "consulta", label: "Consulta" },
  { value: "cirurgia", label: "Cirurgia" },
  { value: "exame", label: "Exame" },
  { value: "produto", label: "Produto" },
  { value: "salario", label: "Salário" },
  { value: "aluguel", label: "Aluguel" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "utilidades", label: "Utilidades" },
  { value: "marketing", label: "Marketing" },
  { value: "outros", label: "Outros" },
] as const

const METHOD_OPTIONS = [
  { value: "pix", label: "PIX" },
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
] as const

export function TransactionFormDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  defaultDirection = "entrada",
}: TransactionFormDialogProps) {
  const [formData, setFormData] = useState<Partial<FinancialTransaction>>({
    direction: initialData?.direction || defaultDirection,
    category: initialData?.category || "outros",
    description: initialData?.description || "",
    amount: initialData?.amount || 0,
    status: initialData?.status || "pendente",
    dueDate: initialData?.dueDate || new Date().toISOString().split("T")[0],
    counterparty: initialData?.counterparty || "",
    method: initialData?.method || "dinheiro",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Validation
    if (formData.amount === undefined || formData.amount <= 0) {
      setError("O valor deve ser maior que zero")
      return
    }
    
    if (!formData.description?.trim()) {
      setError("A descrição é obrigatória")
      return
    }
    
    if (!formData.counterparty?.trim()) {
      setError("A contraparte é obrigatória")
      return
    }

    // Prepare data for submission
    const submissionData: Partial<FinancialTransaction> = {
      ...formData,
      amount: formData.amount || 0,
      dueDate: formData.dueDate ? `${formData.dueDate}T00:00:00.000Z` : new Date().toISOString(),
    }
    
    // Remove undefined optional fields
    if (!submissionData.patientId) delete submissionData.patientId
    if (!submissionData.tutorId) delete submissionData.tutorId
    if (!submissionData.paidAt) delete submissionData.paidAt

    setIsSubmitting(true)
    try {
      await onSave(submissionData)
      onOpenChange(false)
      setError(null)
      // Reset form
      setFormData({
        direction: defaultDirection,
        category: "outros",
        description: "",
        amount: 0,
        status: "pendente",
        dueDate: new Date().toISOString().split("T")[0],
        counterparty: "",
        method: "dinheiro",
      })
    } catch (err) {
      console.error("Error saving transaction:", err)
      setError("Erro ao salvar transação. Tente novamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? "Editar Transação" : formData.direction === "entrada" ? "Nova Receita" : "Nova Despesa"}
          </DialogTitle>
          <DialogDescription>
            Preencha os campos abaixo para registrar a transação financeira.
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
              <Label htmlFor="direction">Tipo</Label>
              <Select
                value={formData.direction}
                onValueChange={(value: TxDirection) => setFormData({ ...formData, direction: value })}
              >
                <SelectTrigger id="direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: TxStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="category">Categoria</Label>
            <Select
              value={formData.category}
              onValueChange={(value: TxCategory) => setFormData({ ...formData, category: value })}
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

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Consulta veterinária"
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount || ""}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
              placeholder="0,00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="dueDate">Data de vencimento</Label>
              <DatePicker
                value={formData.dueDate?.split("T")[0]}
                onChange={(value) => setFormData({ ...formData, dueDate: value })}
                placeholder="Selecione a data de vencimento"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="method">Método de pagamento</Label>
              <Select
                value={formData.method}
                onValueChange={(value: TxMethod) => setFormData({ ...formData, method: value })}
              >
                <SelectTrigger id="method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="counterparty">Contraparte</Label>
            <Input
              id="counterparty"
              value={formData.counterparty}
              onChange={(e) => setFormData({ ...formData, counterparty: e.target.value })}
              placeholder="Ex: João Silva, Fornecedor XYZ"
              required
            />
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
