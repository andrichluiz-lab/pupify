"use client"

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Plus,
  Download,
} from "lucide-react"
import Link from "next/link"
import { AppTopbar } from "@/components/app-topbar"
import { StatCard } from "@/components/dashboard/stat-card"
import { listTransactions, getCashflowData } from "@/lib/api"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { CashflowChart } from "@/components/financeiro/cashflow-chart"
import { TransactionTable } from "@/components/financeiro/transaction-table"
import type { FinancialTransaction } from "@/lib/types"
import { useFinanceiroActions } from "./financeiro-actions"
import { useEffect, useState } from "react"

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(n)
}

export default function FinanceiroPage() {
  const [txs, setTxs] = useState<FinancialTransaction[]>([])
  const [cashflowData, setCashflowData] = useState<any>([])
  const [loading, setLoading] = useState(true)
  const { handleCreateTransaction, handleUpdateTransaction, handleDeleteTransaction } = useFinanceiroActions()

  useEffect(() => {
    async function loadData() {
      try {
        const [transactions, cashflow] = await Promise.all([
          listTransactions(),
          getCashflowData(),
        ])
        setTxs(transactions)
        setCashflowData(cashflow)
      } catch (error) {
        console.error('Error loading financeiro data:', error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const entradas = txs.filter((t) => t.direction === "entrada")
  const saidas = txs.filter((t) => t.direction === "saida")
  const receita = entradas.filter((t) => t.status === "pago").reduce((a, t) => a + t.amount, 0)
  const despesas = saidas.filter((t) => t.status === "pago").reduce((a, t) => a + t.amount, 0)
  const aReceber = entradas.filter((t) => t.status !== "pago").reduce((a, t) => a + t.amount, 0)
  const aPagar = saidas.filter((t) => t.status !== "pago").reduce((a, t) => a + t.amount, 0)
  const saldo = receita - despesas
  const atrasadas = txs.filter((t) => t.status === "atrasado").length

  if (loading) {
    return (
      <>
        <AppTopbar
          title="Financeiro"
          description="Fluxo de caixa, contas a pagar e a receber"
        />
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
      <AppTopbar
        title="Financeiro"
        description="Fluxo de caixa, contas a pagar e a receber"
        action={{
          label: "Nova transação",
          dropdownOptions: [
            {
              label: "Nova receita",
              href: "/financeiro/nova-receita",
              icon: <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
            },
            {
              label: "Nova despesa",
              href: "/financeiro/nova-despesa",
              icon: <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />
            }
          ]
        }}
      />

      <main className="flex flex-col gap-6 p-4 md:p-6">
        {/* Stats row */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Receitas do mês"
            value={formatBRL(receita)}
            delta={8.2}
            icon={TrendingUp}
          />
          <StatCard
            label="Despesas do mês"
            value={formatBRL(despesas)}
            delta={-2.1}
            icon={TrendingDown}
          />
          <StatCard
            label="Saldo do mês"
            value={formatBRL(saldo)}
            delta={12}
            icon={Wallet}
          />
          <StatCard
            label="Contas atrasadas"
            value={String(atrasadas)}
            icon={AlertCircle}
            hint={atrasadas > 0 ? "Ação necessária" : "Tudo em dia"}
          />
        </section>

        {/* Main grid */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Cashflow chart (2 cols) */}
          <div className="overflow-hidden rounded-lg border border-border bg-card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex flex-col leading-tight">
                <h2 className="text-sm font-medium">Fluxo de caixa</h2>
                <span className="text-xs text-muted-foreground">Últimos 6 meses</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Entradas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground/50" />
                  Saídas
                </span>
              </div>
            </div>
            <div className="p-3">
              <CashflowChart data={cashflowData} />
            </div>
          </div>

          {/* Side column */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">A receber</span>
                  <span className="text-xl font-semibold tabular-nums tracking-tight">{formatBRL(aReceber)}</span>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {entradas.filter((t) => t.status !== "pago").slice(0, 3).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-medium">{t.description}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {t.counterparty} · venc. {new Date(t.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium tabular-nums ${
                        t.status === "atrasado" ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      + {formatBRL(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground">A pagar</span>
                  <span className="text-xl font-semibold tabular-nums tracking-tight">{formatBRL(aPagar)}</span>
                </div>
              </div>
              <ul className="flex flex-col gap-2">
                {saidas.filter((t) => t.status !== "pago").slice(0, 3).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2"
                  >
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs font-medium">{t.description}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {t.counterparty} · venc. {new Date(t.dueDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium tabular-nums ${
                        t.status === "atrasado" ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      − {formatBRL(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Action buttons */}
        <section className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" strokeWidth={2} />
            Exportar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                Nova transação
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/financeiro/nova-receita" className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} />
                  Nova receita
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/financeiro/nova-despesa" className="flex items-center gap-2">
                  <TrendingDown className="h-3.5 w-3.5" strokeWidth={2} />
                  Nova despesa
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </section>

        {/* Transactions table */}
        <TransactionTable
          transactions={txs}
          onUpdate={handleUpdateTransaction}
          onDelete={handleDeleteTransaction}
        />
      </main>
    </>
  )
}
