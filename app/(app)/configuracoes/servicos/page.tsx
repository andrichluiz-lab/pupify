"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ServicesForm } from "@/components/configuracoes/services-form"
import { useAuth } from "@/lib/auth-context"
import { listServices } from "@/lib/api"
import type { Service } from "@/lib/api"

export default function ServicosPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading, role } = useAuth()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated && role && (role === "CLINIC_ADMIN" || role === "SUPER_ADMIN")) {
      loadServices()
    }
  }, [isAuthenticated, role])

  async function loadServices() {
    try {
      const data = await listServices()
      setServices(data)
    } catch (error) {
      console.error("Error loading services:", error)
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
            <h1 className="truncate text-sm font-semibold tracking-tight">Serviços</h1>
            <p className="truncate text-xs text-muted-foreground">Gerencie os serviços oferecidos pela clínica</p>
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
          <ServicesForm services={services} />
        </div>
      </main>
    </>
  )
}
