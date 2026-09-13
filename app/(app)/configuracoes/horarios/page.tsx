"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { HoursForm } from "@/components/configuracoes/hours-form"
import { useAuth } from "@/lib/auth-context"
import { get } from "@/lib/api-client"

interface Tenant {
  id: string
  name: string
  slug: string
  cnpj: string | null
  phone: string | null
  email: string | null
  address: string | null
  operatingHours: string | null
}

export default function HorariosPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, role } = useAuth()
  const [tenantData, setTenantData] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && role && (role === "CLINIC_ADMIN" || role === "SUPER_ADMIN")) {
      loadTenantData()
    }
  }, [isAuthenticated, role])

  async function loadTenantData() {
    try {
      const data = await get<Tenant>("/api/tenant")
      setTenantData(data)
    } catch (error) {
      console.error("Error loading tenant:", error)
    } finally {
      setLoading(false)
    }
  }

  if (isLoading || loading) {
    return null
  }

  if (!isAuthenticated || (role !== "CLINIC_ADMIN" && role !== "SUPER_ADMIN")) {
    router.push("/configuracoes")
    return null
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">Horários de Funcionamento</h1>
            <p className="truncate text-xs text-muted-foreground">Edite os horários de atendimento da clínica</p>
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
          {tenantData ? (
            <HoursForm operatingHours={tenantData.operatingHours} />
          ) : (
            <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              Não foi possível carregar as informações da clínica.
            </div>
          )}
        </div>
      </main>
    </>
  )
}
