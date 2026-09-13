import Link from "next/link"
import { ChevronRight, AlertTriangle, Pencil } from "lucide-react"
import { PatientAvatar } from "@/components/patients/patient-avatar"
import type { Patient } from "@/lib/types"
import { Button } from "@/components/ui/button"

function ageFromBirthDate(birthDate: string) {
  const b = new Date(birthDate)
  const now = new Date()
  const months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (months < 12) return `${months}m`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem === 0 ? `${years}a` : `${years}a ${rem}m`
}

type Props = {
  patients: Patient[]
}

export function PatientTable({ patients }: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Header */}
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_100px_140px_80px_24px] items-center gap-4 border-b border-border bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <div>Paciente</div>
        <div>Espécie / Raça</div>
        <div>Tutor</div>
        <div className="text-right">Peso</div>
        <div>Última visita</div>
        <div className="text-right">Ações</div>
        <div />
      </div>

      <ul className="divide-y divide-border">
        {patients.map((p) => (
          <li key={p.id}>
            <div className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.5fr)_100px_140px_80px_24px] md:gap-4">
              {/* Patient cell */}
              <Link href={`/pacientes/${p.id}`} className="flex min-w-0 items-center gap-3">
                <PatientAvatar name={p.name} species={p.species} seed={p.id} size="md" />
                <div className="flex min-w-0 flex-col leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{p.name}</span>
                    {(p.chronicConditions?.length ?? 0) > 0 && (
                      <span
                        title={p.chronicConditions?.join(", ")}
                        className="inline-flex items-center"
                      >
                        <AlertTriangle
                          className="h-3 w-3 text-amber-600"
                          strokeWidth={2}
                          aria-label="Condição crônica"
                        />
                      </span>
                    )}
                  </div>
                  <span className="truncate text-[11px] text-muted-foreground md:hidden">
                    {p.breed} · {p.tutor?.name}
                  </span>
                </div>
              </Link>

              {/* Species/Breed */}
              <div className="hidden min-w-0 flex-col leading-tight md:flex">
                <span className="truncate text-sm">{p.species}</span>
                <span className="truncate text-[11px] text-muted-foreground">{p.breed}</span>
              </div>

              {/* Tutor */}
              <div className="hidden min-w-0 flex-col leading-tight md:flex">
                <span className="truncate text-sm">{p.tutor?.name}</span>
                <span className="truncate text-[11px] text-muted-foreground">{p.tutor?.phone}</span>
              </div>

              {/* Weight */}
              <div className="hidden text-right text-sm tabular-nums md:block">
                {p.weightKg.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} kg
              </div>

              {/* Last visit (mock) */}
              <div className="hidden text-sm text-muted-foreground md:block">
                <span className="text-xs">{ageFromBirthDate(p.birthDate)}</span>
                <span className="text-[11px]"> · {p.sex === "M" ? "Macho" : "Fêmea"}</span>
              </div>

              {/* Actions */}
              <div className="hidden flex items-center justify-end md:flex">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="h-8 w-8"
                >
                  <Link href={`/pacientes/${p.id}/editar`}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              <div className="flex shrink-0 items-center justify-end md:hidden">
                <Link href={`/pacientes/${p.id}`}>
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground/50"
                    strokeWidth={1.75}
                  />
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {patients.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-1 py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhum paciente encontrado.</p>
        </div>
      )}
    </div>
  )
}
