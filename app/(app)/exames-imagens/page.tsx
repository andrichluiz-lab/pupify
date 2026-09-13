import { AppTopbar } from "@/components/app-topbar"
import { listImageExams } from "@/lib/api"
import { ExamesClient } from "./exames-client"

export default async function ExamesImagensPage() {
  const exams = await listImageExams()

  return (
    <>
      <AppTopbar
        title="Exames de Imagens"
        description={`${exams.length} exames cadastrados`}
        action={{ label: "Novo exame", href: "/exames-imagens/novo" }}
      />
      <main className="flex flex-col gap-4 p-4 md:p-6">
        <ExamesClient exams={exams} />
      </main>
    </>
  )
}
