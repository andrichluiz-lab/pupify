import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { redirect } from "next/navigation"
import { PasswordForm } from "@/components/configuracoes/password-form"
import { getServerSession } from "@/lib/auth-server"

export default async function SenhaPage() {
  const session = await getServerSession()

  if (!session.isAuthenticated) {
    redirect("/login")
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">Senha</h1>
            <p className="truncate text-xs text-muted-foreground">Altere sua senha de acesso</p>
          </div>
        </div>
      </div>

      <main className="flex flex-col gap-6 p-4 md:p-6">
        <Link
          href="/configuracoes"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para configurações
        </Link>

        <div className="max-w-2xl">
          <PasswordForm />
        </div>
      </main>
    </>
  )
}
