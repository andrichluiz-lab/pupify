"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { put } from "@/lib/api-client"
import { getErrorMessage } from "@/lib/api-client"

const profileSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  avatarUrl: z.string().url("URL inválida").nullable().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface ProfileFormProps {
  user: {
    id: string
    email: string
    name: string
    avatarUrl?: string | null
  }
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      avatarUrl: user.avatarUrl || null,
    },
  })

  async function onSubmit(data: ProfileFormData) {
    setIsLoading(true)
    try {
      await put("/api/users/profile", data)
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar perfil",
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Informações Pessoais</h2>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
            <p className="text-[11px] text-muted-foreground">
              O email não pode ser alterado
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              {...form.register("name")}
              placeholder="Seu nome completo"
              disabled={isLoading}
            />
            {form.formState.errors.name && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="avatarUrl">URL do Avatar (opcional)</Label>
            <Input
              id="avatarUrl"
              {...form.register("avatarUrl")}
              placeholder="https://exemplo.com/avatar.jpg"
              disabled={isLoading}
            />
            {form.formState.errors.avatarUrl && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.avatarUrl.message}
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
