import { AppTopbar } from "@/components/app-topbar"
import { SurgeryTable } from "@/components/surgeries/surgery-table"
import { SurgeryFilters } from "@/components/surgeries/surgery-filters"
import { SurgerySortControls } from "@/components/surgeries/surgery-sort-controls"
import { listSurgeries } from "@/lib/api"
import type { Surgery, SurgeryStatus } from "@/lib/types"

const STATUS_MAP: Record<string, SurgeryStatus> = {
  "Agendada": "agendada",
  "Pré-operatório": "pre_op",
  "Em andamento": "em_andamento",
  "Recuperação": "recuperacao",
  "Concluída": "concluida",
  "Cancelada": "cancelada",
}

export default async function CirurgiasPage() {
  const surgeries = await listSurgeries()

  const summary = {
    total: surgeries.length,
    agendada: surgeries.filter((s) => s.status === "agendada").length,
    pre_op: surgeries.filter((s) => s.status === "pre_op").length,
    em_andamento: surgeries.filter((s) => s.status === "em_andamento").length,
    recuperacao: surgeries.filter((s) => s.status === "recuperacao").length,
    concluida: surgeries.filter((s) => s.status === "concluida").length,
    cancelada: surgeries.filter((s) => s.status === "cancelada").length,
  }

  return (
    <>
      <AppTopbar
        title="Cirurgias"
        description={`${summary.total} cirurgias cadastradas`}
        action={{ label: "Nova cirurgia", href: "/cirurgias/novo" }}
      />

      <main className="flex flex-col gap-4 p-4 md:p-6">
        {/* Filters row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SurgeryFilters summary={summary} />
          <SurgerySortControls />
        </div>

        <SurgeryTable surgeries={surgeries} />
      </main>
    </>
  )
}
