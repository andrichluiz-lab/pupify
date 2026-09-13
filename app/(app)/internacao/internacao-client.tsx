"use client"

import { useState } from "react"
import { AppTopbar } from "@/components/app-topbar"
import { HospitalizationTable } from "@/components/internacao/hospitalization-table"
import { HospitalizationFilters } from "@/components/internacao/hospitalization-filters"
import { HospitalizationFormDialog } from "@/components/internacao/hospitalization-form-dialog"
import { listHospitalizationDetails } from "@/lib/api"
import type { Hospitalization, HospitalizationDetail } from "@/lib/types"

interface InternacaoClientProps {
  hosps: HospitalizationDetail[]
  summary: {
    total: number
    estavel: number
    observacao: number
    critico: number
    recuperacao: number
  }
}

export function InternacaoClient({ hosps: initialHosps, summary }: InternacaoClientProps) {
  const [hosps, setHosps] = useState<HospitalizationDetail[]>(initialHosps)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleCreateHospitalization = async (data: Partial<Hospitalization>) => {
    const { createHospitalizationAction } = await import("./actions")
    const result = await createHospitalizationAction(data)

    if (result.success) {
      const data = await listHospitalizationDetails()
      setHosps(data)
      setIsDialogOpen(false)
    }
  }

  const handleRefresh = async () => {
    const data = await listHospitalizationDetails()
    setHosps(data)
  }

  return (
    <>
      <AppTopbar
        title="Internação"
        description={`${summary.total} internações cadastradas`}
        action={{ label: "Nova Internação", onClick: () => setIsDialogOpen(true) }}
      />

      <main className="flex flex-col gap-4 p-4 md:p-6">
        {/* Filters row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <HospitalizationFilters summary={summary} />
        </div>

        <HospitalizationTable hospitalizations={hosps} onRefresh={handleRefresh} />
      </main>

      <HospitalizationFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleCreateHospitalization}
      />
    </>
  )
}
