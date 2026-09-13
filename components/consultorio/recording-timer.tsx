"use client"

import { useEffect, useState } from "react"

interface RecordingTimerProps {
  running: boolean
}

export function RecordingTimer({ running }: RecordingTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(id)
  }, [running])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const hh = h.toString().padStart(2, "0")
  const mm = m.toString().padStart(2, "0")
  const ss = s.toString().padStart(2, "0")

  return (
    <div className="font-mono text-3xl tabular-nums tracking-tight text-foreground md:text-4xl">
      {hh}:{mm}:{ss}
    </div>
  )
}
