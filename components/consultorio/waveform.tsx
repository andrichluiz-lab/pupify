"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface WaveformProps {
  bars?: number
  active?: boolean
  className?: string
}

/**
 * Decorative animated waveform. No audio logic — pure UI.
 */
export function Waveform({ bars = 48, active = true, className }: WaveformProps) {
  const [heights, setHeights] = useState<number[]>(() =>
    Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2),
  )

  useEffect(() => {
    if (!active) return
    const id = setInterval(() => {
      setHeights((prev) => prev.map(() => Math.random() * 0.85 + 0.15))
    }, 120)
    return () => clearInterval(id)
  }, [active])

  return (
    <div
      className={cn("flex h-16 items-center justify-center gap-[3px]", className)}
      aria-hidden="true"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-full transition-all duration-150 ease-out",
            active ? "bg-primary" : "bg-muted-foreground/30",
          )}
          style={{ height: `${h * 100}%` }}
        />
      ))}
    </div>
  )
}
