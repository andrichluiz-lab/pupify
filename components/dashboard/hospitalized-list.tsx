import { PatientAvatar } from "@/components/patients/patient-avatar"
import { hospitalizationStatusStyle } from "@/components/shared/status-badge"
import { cn } from "@/lib/utils"
import type { Hospitalization } from "@/lib/types"

function formatDaysSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
  if (days === 0) return "hoje"
  if (days === 1) return "há 1 dia"
  return `há ${days} dias`
}

type Props = {
  items: Hospitalization[]
}

export function HospitalizedList({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-muted-foreground">
        Nenhum paciente internado.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((h) => {
        const s = hospitalizationStatusStyle(h.status)
        return (
          <li key={h.id} className="flex items-center gap-3 px-4 py-3">
            {h.patient && (
              <PatientAvatar
                name={h.patient.name}
                species={h.patient.species}
                seed={h.patient.id}
                size="md"
              />
            )}
            <div className="flex min-w-0 flex-1 flex-col leading-tight">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">{h.patient?.name}</span>
                <span className="text-[11px] text-muted-foreground">· {h.kennel}</span>
              </div>
              <span className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {h.reason} · {formatDaysSince(h.admittedAt)}
              </span>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                s.className,
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
              {s.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
