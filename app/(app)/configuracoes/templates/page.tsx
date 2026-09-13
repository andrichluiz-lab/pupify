import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import { getServerSession } from "@/lib/auth-server"
import { TemplatesManager } from "@/components/configuracoes/templates-manager"

export default async function TemplatesPage() {
  const session = await getServerSession()

  if (!session.isAuthenticated) {
    redirect("/login")
  }

  const isAdmin = session.role === "CLINIC_ADMIN" || session.role === "SUPER_ADMIN"

  if (!isAdmin) {
    redirect("/configuracoes")
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">Templates de Documentos</h1>
            <p className="truncate text-xs text-muted-foreground">
              Gerencie os modelos de receitas, exames, termos e outros documentos
            </p>
          </div>
        </div>
      </div>

      <main className="flex flex-col gap-4 p-4 md:p-6">
        <TemplatesManager />
      </main>
    </>
  )
}
