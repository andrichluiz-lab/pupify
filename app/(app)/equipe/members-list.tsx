"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { Shield, Mail, KeyRound, Search, X } from "lucide-react"
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
import { usePermissions } from "@/hooks/use-permissions"
import { adminUpdateUserAction } from "./actions"
import type { TeamMember } from "@/lib/types"

interface Props {
  members: TeamMember[]
}

const ROLES = [
  { value: "CLINIC_ADMIN", label: "Administrador" },
  { value: "VETERINARIAN", label: "Veterinário" },
  { value: "RECEPTIONIST", label: "Recepcionista" },
  { value: "TECHNICIAN", label: "Técnico" },
]

function getAvatar(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function getRoleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={
        "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-transparent text-muted-foreground hover:border-foreground/40 hover:text-foreground")
      }
    >
      {label}
    </button>
  )
}

export function MembersList({ members }: Props) {
  const { has } = usePermissions()
  const canEdit = has("team_edit")
  const canEditPermissions = has("team_permissions")

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string | null>(null)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; text: string } | null>(null)

  const filtered = members.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) &&
        !m.email.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter && m.role !== roleFilter) return false
    return true
  })

  const hasFilters = !!search || !!roleFilter

  function clearFilters() {
    setSearch("")
    setRoleFilter(null)
  }

  function openEdit(member: TeamMember) {
    setEditing(member)
    setEmail(member.email)
    setPassword("")
    setConfirmPassword("")
    setFeedback(null)
  }

  function close() {
    setEditing(null)
    setFeedback(null)
  }

  function handleSave() {
    if (!editing) return

    if (password && password !== confirmPassword) {
      setFeedback({ kind: "err", text: "As senhas não coincidem" })
      return
    }
    if (password && password.length < 6) {
      setFeedback({ kind: "err", text: "Senha precisa ter ao menos 6 caracteres" })
      return
    }

    const data: { email?: string; password?: string } = {}
    if (email && email !== editing.email) data.email = email
    if (password) data.password = password

    if (!data.email && !data.password) {
      setFeedback({ kind: "err", text: "Nenhuma alteração para salvar" })
      return
    }

    startTransition(async () => {
      const result = await adminUpdateUserAction(editing.userId, data)
      if (result.success) {
        const msg = data.password
          ? "Conta atualizada. O usuário precisará fazer login novamente."
          : "Email atualizado."
        setFeedback({ kind: "ok", text: msg })
        setPassword("")
        setConfirmPassword("")
      } else {
        setFeedback({ kind: "err", text: result.error || "Falha ao salvar" })
      }
    })
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-muted-foreground">Cargo:</span>
          {ROLES.map((r) => (
            <FilterChip
              key={r.value}
              label={r.label}
              active={roleFilter === r.value}
              onClick={() => setRoleFilter(roleFilter === r.value ? null : r.value)}
            />
          ))}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-border">
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Nenhum membro encontrado.
          </div>
        ) : (
          filtered.map((member) => (
            <div
              key={member.id}
              className={
                "flex items-center justify-between px-4 py-3 transition-colors " +
                (canEdit ? "cursor-pointer hover:bg-muted/50" : "")
              }
              onClick={canEdit ? () => openEdit(member) : undefined}
              role={canEdit ? "button" : undefined}
              tabIndex={canEdit ? 0 : undefined}
              onKeyDown={(e) => {
                if (canEdit && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault()
                  openEdit(member)
                }
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatarUrl}
                      alt={member.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    getAvatar(member.name)
                  )}
                </div>
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{member.name}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {getRoleLabel(member.role)}
                    {member.specialty && ` • ${member.specialty}`}
                    {member.crmv && ` • ${member.crmv}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {canEditPermissions && (
                  <Link
                    href={`/equipe/${member.id}/permissoes`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Editar permissões"
                  >
                    <Shield className="h-3 w-3" />
                    Permissões
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(open) => !open && close()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar credenciais</DialogTitle>
            <DialogDescription>
              {editing && (
                <>
                  Atualizar email ou senha de <strong>{editing.name}</strong>. Trocar
                  a senha revoga as sessões ativas do usuário.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-email" className="text-xs">
                <Mail className="mr-1 inline h-3 w-3" />
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={pending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-password" className="text-xs">
                <KeyRound className="mr-1 inline h-3 w-3" />
                Nova senha
              </Label>
              <Input
                id="edit-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Deixe em branco para não alterar"
                disabled={pending}
                autoComplete="new-password"
              />
            </div>

            {password && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="edit-password-confirm" className="text-xs">
                  Confirmar nova senha
                </Label>
                <Input
                  id="edit-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={pending}
                  autoComplete="new-password"
                />
              </div>
            )}

            {feedback && (
              <div
                className={
                  "rounded-md border px-3 py-2 text-xs " +
                  (feedback.kind === "ok"
                    ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-300"
                    : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300")
                }
              >
                {feedback.text}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={pending}>
              Fechar
            </Button>
            <Button onClick={handleSave} disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
