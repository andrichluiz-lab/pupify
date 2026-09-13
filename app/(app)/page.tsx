'use client'

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import {
  CalendarDays,
  PawPrint,
  Stethoscope,
  Wallet,
  Mic,
  FileText,
  Syringe,
  ArrowRight,
} from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import type { RevenuePoint } from "@/lib/types"
import {
  UpcomingAppointments,
  UpcomingAppointmentsHeader,
} from "@/components/dashboard/upcoming-appointments"
import { HospitalizedList } from "@/components/dashboard/hospitalized-list"
import {
  getDashboardStats,
  getRevenueSeries,
  listHospitalizations,
  listTodayAppointments,
} from "@/lib/api"
import { ApiError } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import type { DashboardStats, Hospitalization, Appointment } from "@/lib/types"

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n)
}

export default function DashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [hospitalizations, setHospitalizations] = useState<Hospitalization[]>([])
  const [revenue, setRevenue] = useState<RevenuePoint[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      try {
        const results = await Promise.all([
          getDashboardStats(),
          listTodayAppointments(),
          listHospitalizations(),
          getRevenueSeries(),
        ])
        setStats(results[0])
        setTodayAppointments(results[1])
        setHospitalizations(results[2])
        setRevenue(results[3])
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 401) {
            toast({
              variant: 'destructive',
              title: 'Não autenticado',
              description: 'Por favor, faça login para acessar o dashboard.',
            })
            router.push('/login')
          } else if (error.status === 429) {
            toast({
              variant: 'destructive',
              title: 'Muitas requisições',
              description: 'Aguarde alguns segundos e tente novamente.',
            })
          } else {
            toast({
              variant: 'destructive',
              title: 'Erro ao carregar dados',
              description: 'Não foi possível carregar os dados do dashboard.',
            })
          }
        }
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router, toast])

  const today = new Date()

  if (isLoading) {
    return (
      <>
        <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex min-w-0 flex-col leading-tight">
              <h1 className="truncate text-sm font-semibold tracking-tight">Visão geral</h1>
              <p className="truncate text-xs text-muted-foreground">Acompanhe o dia a dia da clínica em tempo real</p>
            </div>
          </div>
        </div>
        <main className="flex flex-col gap-6 p-4 md:p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">Visão geral</h1>
            <p className="truncate text-xs text-muted-foreground">Acompanhe o dia a dia da clínica em tempo real</p>
          </div>
        </div>
      </div>

      <main className="flex flex-col gap-6 p-4 md:p-6">
        {/* Stats row */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Atendimentos hoje"
            value={String(stats?.appointmentsToday ?? 0)}
            delta={stats?.appointmentsTodayDelta}
            icon={CalendarDays}
          />
          <StatCard
            label="Novos pacientes"
            value={String(stats?.newPatientsThisWeek ?? 0)}
            delta={stats?.newPatientsDelta}
            deltaSuffix="vs. semana passada"
            hint="últimos 7 dias"
            icon={PawPrint}
          />
          <StatCard
            label="Internados"
            value={String(stats?.hospitalized ?? 0)}
            icon={Stethoscope}
            hint="em acompanhamento"
          />
          <StatCard
            label="Receita do mês"
            value={formatBRL(stats?.revenueThisMonth ?? 0)}
            delta={stats?.revenueDelta}
            icon={Wallet}
          />
        </section>

        {/* AI prompt banner */}
        <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 md:flex-row md:items-center md:gap-4 md:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Mic className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <h3 className="text-sm font-medium">Prontuário inteligente com IA</h3>
            <p className="text-xs text-muted-foreground">
              Grave a consulta e receba um SOAP estruturado automaticamente — subjetivo, objetivo,
              avaliação e plano, prontos para revisão.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Disponível em breve"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground transition-colors disabled:cursor-not-allowed"
            >
              <FileText className="h-3.5 w-3.5" />
              Ver exemplo
            </button>
            <button
              type="button"
              disabled
              title="Disponível em breve"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground opacity-60 transition-opacity disabled:cursor-not-allowed"
            >
              Começar gravação
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>

        {/* Main grid */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Agenda (2 cols) */}
          <div className="overflow-hidden rounded-lg border border-border bg-card lg:col-span-2">
            <UpcomingAppointmentsHeader count={todayAppointments.length} today={today} />
            <div className="border-t border-border">
              <UpcomingAppointments appointments={todayAppointments} />
            </div>
            <div className="border-t border-border px-4 py-2.5 text-right">
              <Link
                href="/agenda"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver agenda completa
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Side column */}
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                  <h2 className="text-sm font-medium">Internados</h2>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                  {hospitalizations.length}
                </span>
              </div>
              <HospitalizedList items={hospitalizations} />
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Syringe className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
                <h2 className="text-sm font-medium">Vacinas vencendo</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                3 pacientes com vacinas a vencer nos próximos 15 dias.
              </p>
              <button
                type="button"
                className="mt-1 inline-flex w-fit items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Enviar lembretes por WhatsApp
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        </section>

        {/* Revenue chart */}
        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex flex-col leading-tight">
              <h2 className="text-sm font-medium">Receita — últimos 30 dias</h2>
              <span className="text-xs text-muted-foreground">
                Comparado ao período anterior:{" "}
                <span className="font-medium text-primary">+{stats?.revenueDelta ?? 0}%</span>
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Receita
              </span>
            </div>
          </div>
          <div className="p-3">
            <RevenueChart data={revenue} />
          </div>
        </section>
      </main>
    </>
  )
}
