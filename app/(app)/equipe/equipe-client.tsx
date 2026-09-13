"use client"

import { useState, useTransition } from "react"
import { AppTopbar } from "@/components/app-topbar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeamCard } from "./team-card"
import { createTeamMemberAction } from "./actions"
import { usePermissions } from "@/hooks/use-permissions"
import type { TeamMember, CreateTeamMemberInput } from "@/lib/types"

const ROLES = [
  { value: "CLINIC_ADMIN", label: "Administrador" },
  { value: "VETERINARIAN", label: "Veterinário" },
  { value: "RECEPTIONIST", label: "Recepcionista" },
  { value: "TECHNICIAN", label: "Técnico" },
]

const EMPTY: CreateTeamMemberInput = {
  name: "",
  email: "",
  password: "",
  role: "RECEPTIONIST",
  crmv: "",
  specialty: "",
}

export function EquipeClient({ members }: { members: TeamMember[] }) {
  const { has } = usePermissions()
  const canAdd = has("team_edit")

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<CreateTeamMemberInput>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function openModal() {
    setForm(EMPTY)
    setError(null)
    setOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const result = await createTeamMemberAction(form)
      if (result.success) {
        setOpen(false)
      } else {
        setError(result.error || "Erro ao criar membro")
      }
    })
  }

  return (
    <>
      <AppTopbar
        title="Gestão de Equipe"
        description="Controle de usuários e permissões da clínica"
        action={canAdd ? { label: "Adicionar membro", onClick: openModal } : undefined}
      />

      <main className="flex flex-col gap-6 p-4 md:p-6">
        <TeamCard members={members} />
      </main>

      <Dialog open={open} onOpenChange={(v) => !pending && setOpen(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo acesso à clínica.
            </DialogDescription>
          </DialogHeader>

          <form id="add-member-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nm-name" className="text-xs">Nome completo *</Label>
              <Input
                id="nm-name"
                name="name"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Ex: João Silva"
                disabled={pending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nm-email" className="text-xs">E-mail *</Label>
              <Input
                id="nm-email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="Ex: joao@exemplo.com"
                disabled={pending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nm-password" className="text-xs">Senha *</Label>
              <Input
                id="nm-password"
                name="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                disabled={pending}
                autoComplete="new-password"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nm-role" className="text-xs">Cargo *</Label>
              <select
                id="nm-role"
                name="role"
                required
                value={form.role}
                onChange={handleChange}
                disabled={pending}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {form.role === "VETERINARIAN" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nm-crmv" className="text-xs">CRMV *</Label>
                  <Input
                    id="nm-crmv"
                    name="crmv"
                    required
                    value={form.crmv}
                    onChange={handleChange}
                    placeholder="Ex: CRMV-SP 12345"
                    disabled={pending}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="nm-specialty" className="text-xs">Especialidade</Label>
                  <Input
                    id="nm-specialty"
                    name="specialty"
                    value={form.specialty}
                    onChange={handleChange}
                    placeholder="Ex: Clínica Geral, Cirurgia..."
                    disabled={pending}
                  />
                </div>
              </>
            )}

            {error && (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button type="submit" form="add-member-form" disabled={pending}>
              {pending ? "Salvando..." : "Adicionar membro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
