import { AppTopbar } from "@/components/app-topbar"
import { listHospitalizationDetails } from "@/lib/api"
import { HospitalizationTable } from "@/components/internacao/hospitalization-table"
import { HospitalizationFilters } from "@/components/internacao/hospitalization-filters"
import { InternacaoClient } from "./internacao-client"
import type { HospitalizationDetail } from "@/lib/types"

const STATUS_MAP: Record<string, string> = {
  "Estável": "estavel",
  "Observação": "observacao",
  "Crítico": "critico",
  "Recuperação": "recuperacao",
}

export default async function InternacaoPage() {
  const hosps = await listHospitalizationDetails()

  const summary = {
    total: hosps.length,
    estavel: hosps.filter((h) => h.status === "estavel").length,
    observacao: hosps.filter((h) => h.status === "observacao").length,
    critico: hosps.filter((h) => h.status === "critico").length,
    recuperacao: hosps.filter((h) => h.status === "recuperacao").length,
  }

  return (
    <InternacaoClient hosps={hosps} summary={summary} />
  )
}
