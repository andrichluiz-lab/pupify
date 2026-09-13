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

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirme sua nova senha"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  })

type PasswordFormData = z.infer<typeof passwordSchema>

export function PasswordForm() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const form = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  async function onSubmit(data: PasswordFormData) {
    setIsLoading(true)
    try {
      await put("/api/users/password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso.",
      })
      form.reset()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar senha",
        description: getErrorMessage(error),
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Alterar Senha</h2>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="currentPassword">Senha Atual</Label>
            <Input
              id="currentPassword"
              type="password"
              {...form.register("currentPassword")}
              placeholder="Digite sua senha atual"
              disabled={isLoading}
            />
            {form.formState.errors.currentPassword && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="newPassword">Nova Senha</Label>
            <Input
              id="newPassword"
              type="password"
              {...form.register("newPassword")}
              placeholder="Digite sua nova senha"
              disabled={isLoading}
            />
            {form.formState.errors.newPassword && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              {...form.register("confirmPassword")}
              placeholder="Confirme sua nova senha"
              disabled={isLoading}
            />
            {form.formState.errors.confirmPassword && (
              <p className="text-[11px] text-destructive">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" size="sm" className="h-8 gap-1.5" disabled={isLoading}>
              {isLoading ? "Alterando..." : "Alterar senha"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
