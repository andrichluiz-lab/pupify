import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  value: string
  delta?: number // percentage change; positive = up
  deltaSuffix?: string
  hint?: string
  icon?: React.ComponentType<{ className?: string }>
}

export function StatCard({ label, value, delta, deltaSuffix = "vs. semana passada", hint, icon: Icon }: Props) {
  const hasDelta = typeof delta === "number"
  const positive = hasDelta && (delta as number) > 0
  const negative = hasDelta && (delta as number) < 0
  const DeltaIcon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        {Icon && (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>

      {hasDelta && (
        <div className="flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium tabular-nums",
              positive && "bg-primary/10 text-primary",
              negative && "bg-destructive/10 text-destructive",
              !positive && !negative && "bg-muted text-muted-foreground",
            )}
          >
            <DeltaIcon className="h-3 w-3" strokeWidth={2.25} />
            {Math.abs(delta as number)}%
          </span>
          <span className="text-muted-foreground">{deltaSuffix}</span>
        </div>
      )}
    </div>
  )
}
