"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, Loader2 } from "lucide-react"
import { AppTopbar } from "@/components/app-topbar"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { MaskedInput, masks } from "@/components/ui/masked-input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { post } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import type { InventoryCategory } from "@/lib/types"

export default function NewInventoryItemPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [requiresPrescription, setRequiresPrescription] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [unitCost, setUnitCost] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  return (
    <>
      <AppTopbar
        title="Novo item de estoque"
        description="Cadastre um item no estoque"
      />

      <main className="flex flex-col gap-4 p-4 md:p-6">
        <Link
          href="/estoque"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para estoque
        </Link>

        <form
          className="grid grid-cols-1 gap-4 lg:grid-cols-3"
          onSubmit={async (e) => {
            e.preventDefault()
            setIsSubmitting(true)

            try {
              const formData = new FormData(e.currentTarget)
              
              const itemData = {
                sku: formData.get('sku') as string,
                name: formData.get('name') as string,
                category: formData.get('category') as InventoryCategory,
                unit: formData.get('unit') as string,
                stock: parseFloat(formData.get('stock') as string) || 0,
                minStock: parseFloat(formData.get('minStock') as string) || 10,
                unitCost: parseFloat(unitCost.replace(/\./g, '').replace(',', '.')) || 0,
                salePrice: parseFloat(salePrice.replace(/\./g, '').replace(',', '.')) || 0,
                supplier: formData.get('supplier') as string || null,
                batch: formData.get('batch') as string || null,
                expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
                requiresPrescription,
              }

              await post('/api/inventory', itemData)

              toast({
                title: "Item cadastrado com sucesso!",
                description: `${itemData.name} foi adicionado ao estoque.`,
              })

              router.push('/estoque')
            } catch (error: unknown) {
              console.error('Error creating inventory item:', error)
              toast({
                title: "Erro ao cadastrar item",
                description: error && typeof error === 'object' && error !== null && 'message' in error 
                  ? (error as { message: string }).message 
                  : "Tente novamente mais tarde.",
                variant: "destructive",
              })
            } finally {
              setIsSubmitting(false)
            }
          }}
        >
          <div className="flex flex-col gap-4 lg:col-span-2">
            {/* Basic info */}
            <section className="rounded-lg border border-border bg-card p-5">
              <FieldSet>
                <FieldLegend className="text-sm font-medium">Dados básicos</FieldLegend>
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="sku">SKU *</FieldLabel>
                      <Input id="sku" name="sku" placeholder="Ex: MED001" required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="category">Categoria *</FieldLabel>
                      <Select name="category" defaultValue="medicamento">
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="medicamento">Medicamento</SelectItem>
                          <SelectItem value="vacina">Vacina</SelectItem>
                          <SelectItem value="insumo">Insumo</SelectItem>
                          <SelectItem value="racao">Ração</SelectItem>
                          <SelectItem value="acessorio">Acessório</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="name">Nome *</FieldLabel>
                    <Input id="name" name="name" placeholder="Ex: Dipirona 500mg" required />
                  </Field>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="unit">Unidade *</FieldLabel>
                      <Select name="unit" defaultValue="un">
                        <SelectTrigger id="unit">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="un">Unidade</SelectItem>
                          <SelectItem value="ml">Mililitro</SelectItem>
                          <SelectItem value="cp">Comprimido</SelectItem>
                          <SelectItem value="kg">Quilograma</SelectItem>
                          <SelectItem value="g">Grama</SelectItem>
                          <SelectItem value="l">Litro</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field orientation="horizontal">
                      <FieldContent>
                        <FieldLabel htmlFor="requiresPrescription">Receita?</FieldLabel>
                        <FieldDescription>
                          Exige prescrição médica
                        </FieldDescription>
                      </FieldContent>
                      <Switch 
                        id="requiresPrescription" 
                        checked={requiresPrescription} 
                        onCheckedChange={setRequiresPrescription} 
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </section>

            {/* Stock and pricing */}
            <section className="rounded-lg border border-border bg-card p-5">
              <FieldSet>
                <FieldLegend className="text-sm font-medium">Estoque e preços</FieldLegend>
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="stock">Estoque atual *</FieldLabel>
                      <Input
                        id="stock"
                        name="stock"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        defaultValue="0"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="minStock">Estoque mínimo *</FieldLabel>
                      <Input
                        id="minStock"
                        name="minStock"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="10"
                        defaultValue="10"
                        required
                      />
                    </Field>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="unitCost">Custo unitário (R$) *</FieldLabel>
                      <MaskedInput
                        id="unitCost"
                        name="unitCost"
                        mask={masks.currency}
                        value={unitCost}
                        onChange={setUnitCost}
                        placeholder="R$ 0,00"
                        required
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="salePrice">Preço de venda (R$) *</FieldLabel>
                      <MaskedInput
                        id="salePrice"
                        name="salePrice"
                        mask={masks.currency}
                        value={salePrice}
                        onChange={setSalePrice}
                        placeholder="R$ 0,00"
                        required
                      />
                    </Field>
                  </div>
                </FieldGroup>
              </FieldSet>
            </section>
          </div>

          {/* Additional info column */}
          <aside className="flex flex-col gap-4">
            <section className="rounded-lg border border-border bg-card p-5">
              <FieldSet>
                <FieldLegend className="text-sm font-medium">Informações adicionais</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="supplier">Fornecedor</FieldLabel>
                    <Input 
                      id="supplier" 
                      name="supplier" 
                      placeholder="Ex: Distribuidora XYZ" 
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="batch">Lote</FieldLabel>
                    <Input 
                      id="batch" 
                      name="batch" 
                      placeholder="Ex: L12345" 
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="expiresAt">Validade</FieldLabel>
                    <DatePicker
                      value={expiresAt}
                      onChange={setExpiresAt}
                      placeholder="Selecione a validade"
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </section>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <Button type="submit" className="w-full gap-1.5" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Package className="h-3.5 w-3.5" />
                )}
                {isSubmitting ? "Cadastrando..." : "Cadastrar item"}
              </Button>
              <Button type="button" variant="ghost" asChild className="w-full" disabled={isSubmitting}>
                <Link href="/estoque">Cancelar</Link>
              </Button>
            </div>
          </aside>
        </form>
      </main>
    </>
  )
}
