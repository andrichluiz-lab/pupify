import { AppTopbar } from "@/components/app-topbar"
import { ConsultorioClient } from "./consultorio-client"
import { listConsultations, listDrafts } from "@/lib/api"

export default async function ConsultorioPage() {
  const consultations = await listConsultations()
  const drafts = await listDrafts()

  const summary = {
    total: consultations.length + drafts.length,
    drafts: drafts.length,
    finalized: consultations.filter((c) => c.status === "finalizado").length,
  }

  return (
    <>
      <AppTopbar
        title="Consultório"
        description={`${summary.total} consultas cadastradas`}
        action={{ label: "Nova consulta", href: "/consultorio/novo" }}
      />
      <main className="flex flex-col gap-4 p-4 md:p-6">
        <ConsultorioClient consultations={consultations} drafts={drafts} summary={summary} />
      </main>
    </>
  )
}
