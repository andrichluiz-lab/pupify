import Link from "next/link"
import { redirect } from "next/navigation"
import { User, Lock, Building2, Clock, Stethoscope, FileText, Mail } from "lucide-react"
import { getServerSession } from "@/lib/auth-server"

export default async function ConfiguracoesPage() {
  const session = await getServerSession()

  if (!session.isAuthenticated) {
    redirect("/login")
  }

  const isAdmin = session.role === "CLINIC_ADMIN" || session.role === "SUPER_ADMIN"

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">Configurações</h1>
            <p className="truncate text-xs text-muted-foreground">Gerencie suas preferências e conta</p>
          </div>
        </div>
      </div>

      <main className="flex flex-col gap-6 p-4 md:p-6">
        {/* Configuration Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/configuracoes/perfil"
            className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <User className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">Perfil</h2>
              <p className="text-xs text-muted-foreground">
                Edite suas informações pessoais, nome e avatar
              </p>
            </div>
          </Link>

          <Link
            href="/configuracoes/senha"
            className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Lock className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-medium">Senha</h2>
              <p className="text-xs text-muted-foreground">
                Altere sua senha de acesso
              </p>
            </div>
          </Link>

          {isAdmin && (
            <Link
              href="/configuracoes/clinica"
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-medium">Clínica</h2>
                <p className="text-xs text-muted-foreground">
                  Edite as informações da sua clínica
                </p>
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/configuracoes/horarios"
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Clock className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-medium">Horários</h2>
                <p className="text-xs text-muted-foreground">
                  Edite os horários de funcionamento
                </p>
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/configuracoes/servicos"
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Stethoscope className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-medium">Serviços</h2>
                <p className="text-xs text-muted-foreground">
                  Gerencie os serviços oferecidos
                </p>
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/configuracoes/templates"
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <FileText className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-medium">Templates</h2>
                <p className="text-xs text-muted-foreground">
                  Edite modelos de receitas, exames e termos
                </p>
              </div>
            </Link>
          )}

          {isAdmin && (
            <Link
              href="/configuracoes/emails"
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Mail className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-medium">Emails</h2>
                <p className="text-xs text-muted-foreground">
                  Configure templates de email e envie mensagens
                </p>
              </div>
            </Link>
          )}
        </section>
      </main>
    </>
  )
}
