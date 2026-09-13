import { Dog, Cat, Bird, Rabbit, Turtle, PawPrint } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Patient, Species } from "@/lib/types"

const SIZES = {
  sm: { box: "h-7 w-7", icon: "h-3.5 w-3.5", text: "text-[10px]", badge: "h-4 w-4", badgeIcon: "h-2.5 w-2.5" },
  md: { box: "h-9 w-9", icon: "h-4 w-4", text: "text-xs", badge: "h-4 w-4", badgeIcon: "h-2.5 w-2.5" },
  lg: { box: "h-12 w-12", icon: "h-5 w-5", text: "text-sm", badge: "h-5 w-5", badgeIcon: "h-3 w-3" },
  xl: { box: "h-20 w-20", icon: "h-8 w-8", text: "text-xl", badge: "h-6 w-6", badgeIcon: "h-3.5 w-3.5" },
} as const

type NamedSize = keyof typeof SIZES

function speciesIcon(species: Species | undefined) {
  switch (species) {
    case "Cão":
      return Dog
    case "Gato":
      return Cat
    case "Ave":
      return Bird
    case "Roedor":
      return Rabbit
    case "Réptil":
      return Turtle
    default:
      return PawPrint
  }
}

// Deterministic tint per patient id for a subtle bit of variety.
function tintFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  const tones = [
    "bg-primary/10 text-primary",
    "bg-amber-500/10 text-amber-700",
    "bg-sky-500/10 text-sky-700",
    "bg-rose-500/10 text-rose-700",
    "bg-violet-500/10 text-violet-700",
    "bg-teal-500/10 text-teal-700",
  ]
  return tones[Math.abs(h) % tones.length]
}

// Map arbitrary px sizes onto our named scale so callers can pass numbers.
function numberToNamedSize(px: number): NamedSize {
  if (px <= 30) return "sm"
  if (px <= 40) return "md"
  if (px <= 56) return "lg"
  return "xl"
}

type CoreProps = {
  showIcon?: boolean
  className?: string
}

type ExplicitProps = CoreProps & {
  name: string
  species: Species
  seed?: string
  size?: NamedSize
  patient?: never
}

type PatientShorthandProps = CoreProps & {
  patient: Patient | { id: string; name: string; species: Species }
  size?: NamedSize | number
  name?: never
  species?: never
  seed?: never
}

type Props = ExplicitProps | PatientShorthandProps

export function PatientAvatar(props: Props) {
  // Normalize both API styles into the same internal fields.
  const name = "patient" in props && props.patient ? props.patient.name : (props as ExplicitProps).name
  const species = "patient" in props && props.patient ? props.patient.species : (props as ExplicitProps).species
  const seed =
    "patient" in props && props.patient
      ? props.patient.id
      : (props as ExplicitProps).seed ?? (props as ExplicitProps).name ?? ""

  const rawSize = props.size ?? "md"
  const sizeKey: NamedSize = typeof rawSize === "number" ? numberToNamedSize(rawSize) : rawSize
  const s = SIZES[sizeKey]

  const Icon = speciesIcon(species)
  const safeName = name ?? "?"
  const initial = safeName.charAt(0).toUpperCase() || "?"
  const tint = tintFor(seed || safeName)
  const showIcon = props.showIcon ?? true

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full font-medium",
        s.box,
        s.text,
        tint,
        props.className,
      )}
      aria-label={`${safeName}${species ? ` — ${species}` : ""}`}
    >
      <span>{initial}</span>
      {showIcon && (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 flex items-center justify-center rounded-full border border-border bg-background text-foreground",
            s.badge,
          )}
        >
          <Icon className={s.badgeIcon} strokeWidth={2} />
        </span>
      )}
    </div>
  )
}
