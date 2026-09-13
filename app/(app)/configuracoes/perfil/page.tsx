"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { ProfileForm } from "@/components/configuracoes/profile-form"
import { useAuth } from "@/lib/auth-context"

export default function PerfilPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return null
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">Perfil</h1>
            <p className="truncate text-xs text-muted-foreground">Edite suas informações pessoais</p>
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
          <ProfileForm user={user} />
        </div>
      </main>
    </>
  )
}
