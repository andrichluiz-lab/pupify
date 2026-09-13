"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MaskedInput, masks } from "@/components/ui/masked-input"
import { useToast } from "@/hooks/use-toast"
import { put } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-client"

const clinicSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cnpj: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().email("Email inválido").nullable().or(z.literal("")).optional(),
  address: z.string().nullable().optional(),
})

type ClinicFormData = z.infer<typeof clinicSchema>

interface ClinicFormProps {
  tenant: {
    id: string
    name: string
    slug: string
    cnpj: string | null
    phone: string | null
    email: string | null
    address: string | null
  }
}

export function ClinicForm({ tenant }: ClinicFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<ClinicFormData>({
    resolver: zodResolver(clinicSchema),
    defaultValues: {
      name: tenant.name,
      cnpj: tenant.cnpj || "",
      phone: tenant.phone || "",
      email: tenant.email || "",
      address: tenant.address || "",
    },
  })

  async function onSubmit(data: ClinicFormData) {
    setIsLoading(true)
    try {
      const submitData = {
        name: data.name,
        cnpj: data.cnpj || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
      }
      await put("/api/tenant", submitData)
      toast({
        title: "Clínica atualizada",
        description: "As informações da clínica foram atualizadas com sucesso.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar clínica",
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Informações da Clínica</h2>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Slug (identificador)</Label>
            <Input
              id="slug"
              value={tenant.slug}
              disabled
              className="bg-muted"
            />
            <p className="text-[11px] text-muted-foreground">
              O slug não pode ser alterado
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome da Clínica</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Nome da sua clínica"
              disabled={isLoading}
            />
            {form.formState.errors.name && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cnpj">CNPJ (opcional)</Label>
            <MaskedInput
              id="cnpj"
              mask={masks.cnpj}
              value={form.watch("cnpj") || ""}
              onChange={(value) => form.setValue("cnpj", value)}
              placeholder="00.000.000/0000-00"
              disabled={isLoading}
            />
            {form.formState.errors.cnpj && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.cnpj.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefone (opcional)</Label>
            <MaskedInput
              id="phone"
              mask={masks.phone}
              value={form.watch("phone") || ""}
              onChange={(value) => form.setValue("phone", value)}
              placeholder="(11) 99999-9999"
              disabled={isLoading}
            />
            {form.formState.errors.phone && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.phone.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email de Contato (opcional)</Label>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              placeholder="contato@clinica.com"
              disabled={isLoading}
            />
            {form.formState.errors.email && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Endereço (opcional)</Label>
            <Input
              id="address"
              {...form.register("address")}
              placeholder="Rua, número, bairro, cidade"
              disabled={isLoading}
            />
            {form.formState.errors.address && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.address.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" className="h-8 gap-1.5" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
