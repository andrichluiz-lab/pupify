import Link from "next/link"
import { ChevronRight, PawPrint, Phone, CreditCard, CircleDollarSign, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { TutorWithDetails } from "@/lib/types"

const SPECIES_EMOJI: Record<string, string> = {
  Cao:    "🐕",
  Gato:   "🐈",
  Ave:    "🦜",
  Roedor: "🐹",
  Reptil: "🦎",
  Outro:  "🐾",
}

function TutorInitials({ name }: { name: string }) {
  const parts = name.trim().split(" ")
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2)
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {initials.toUpperCase()}
    </div>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

type Props = {
  tutors: TutorWithDetails[]
}

export function TutorTable({ tutors }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,2fr)_160px_120px_80px_24px] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <div>Cliente</div>
        <div>Contato</div>
        <div>Animais</div>
        <div>Última consulta</div>
        <div className="text-right">Saldo pendente</div>
        <div className="text-right">Ações</div>
        <div />
      </div>

      <ul className="divide-y divide-border">
        {tutors.map((t) => (
          <li key={t.id}>
            <div className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,2fr)_160px_120px_80px_24px] md:gap-4">

              {/* Client name */}
              <Link href={`/tutores/${t.id}`} className="flex min-w-0 items-center gap-3">
                <TutorInitials name={t.name} />
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-medium">{t.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground md:hidden">
                    {t.phone} · {t.patientsCount} {t.patientsCount === 1 ? "animal" : "animais"}
                  </span>
                </div>
              </Link>

              {/* Contact */}
              <div className="hidden min-w-0 flex-col gap-0.5 leading-tight md:flex">
                {t.phone && (
                  <span className="flex items-center gap-1.5 truncate text-sm">
                    <Phone className="h-3 w-3 shrink-0 text-muted-foreground" />
                    {t.phone}
                  </span>
                )}
                {t.cpf && (
                  <span className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                    <CreditCard className="h-3 w-3 shrink-0" />
                    {t.cpf}
                  </span>
                )}
              </div>

              {/* Animals */}
              <div className="hidden flex-wrap items-center gap-1.5 md:flex">
                {t.patients.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Sem animais</span>
                ) : (
                  t.patients.map((p) => (
                    <Link
                      key={p.id}
                      href={`/pacientes/${p.id}`}
                      className="flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-muted"
                    >
                      <span>{SPECIES_EMOJI[p.species] ?? "🐾"}</span>
                      <span>{p.name}</span>
                    </Link>
                  ))
                )}
                {t.patientsCount > t.patients.length && (
                  <span className="text-[11px] text-muted-foreground">
                    +{t.patientsCount - t.patients.length}
                  </span>
                )}
              </div>

              {/* Last appointment */}
              <div className="hidden text-sm text-muted-foreground md:block">
                {formatDate(t.lastAppointmentAt)}
              </div>

              {/* Pending balance */}
              <div className="hidden text-right md:block">
                {t.pendingBalance > 0 ? (
                  <span className="flex items-center justify-end gap-1 text-sm font-medium text-amber-600">
                    <CircleDollarSign className="h-3.5 w-3.5" />
                    {formatCurrency(t.pendingBalance)}
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>

              {/* Actions */}
              <div className="hidden items-center justify-end gap-1 md:flex">
                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                  <Link href={`/tutores/${t.id}/editar`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              {/* Mobile chevron */}
              <div className="flex shrink-0 items-center justify-end md:hidden">
                <Link href={`/tutores/${t.id}`}>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" strokeWidth={1.75} />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {tutors.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <PawPrint className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum cliente cadastrado.</p>
          <p className="text-xs text-muted-foreground">Cadastre um novo paciente para começar.</p>
        </div>
      )}
    </div>
  )
}
