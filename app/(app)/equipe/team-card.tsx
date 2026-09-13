"use client"

import { Users } from "lucide-react"
import { MembersList } from "./members-list"
import type { TeamMember } from "@/lib/types"

export function TeamCard({ members }: { members: TeamMember[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <h2 className="text-sm font-medium">Membros da equipe</h2>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
          {members.length}
        </span>
      </div>
      <MembersList members={members} />
    </div>
  )
}
