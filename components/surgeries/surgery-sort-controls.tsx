"use client"

import { useRouter, useSearchParams } from "next/navigation"

export function SurgerySortControls() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sortOrder = searchParams.get("sort") || "recent"

  const setSort = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", sort)
    router.push(`/cirurgias?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>Ordenar:</span>
      <select
        value={sortOrder}
        onChange={(e) => setSort(e.target.value)}
        className="rounded-md border border-border bg-card px-2.5 py-1 font-medium text-foreground hover:bg-muted/60"
      >
        <option value="recent">Mais recentes</option>
        <option value="oldest">Mais antigas</option>
        <option value="procedure">Procedimento A-Z</option>
      </select>
    </div>
  )
}
