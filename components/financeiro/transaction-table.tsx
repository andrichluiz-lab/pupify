"use client"

import React, { useState } from "react"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  CheckCircle,
  Edit,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { TransactionFormDialogButton } from "./transaction-form-dialog-button"
import type { FinancialTransaction, TxStatus } from "@/lib/types"

interface TransactionTableProps {
  transactions: FinancialTransaction[]
  onUpdate: (id: string, data: Partial<FinancialTransaction>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

const STATUS_META: Record<TxStatus, { label: string; className: string }> = {
  pago: { label: "Pago", className: "text-primary bg-primary/10 border-primary/20" },
  pendente: {
    label: "Pendente",
    className: "text-amber-700 bg-amber-500/10 border-amber-500/20",
  },
  atrasado: {
    label: "Atrasado",
    className: "text-destructive bg-destructive/10 border-destructive/20",
  },
}

const METHOD_LABEL: Record<NonNullable<FinancialTransaction["method"]>, string> = {
  pix: "PIX",
  credito: "Crédito",
  debito: "Débito",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

type FilterType = "all" | "entrada" | "saida" | "atrasado"

const ITEMS_PER_PAGE = 10

export function TransactionTable({ transactions, onUpdate, onDelete }: TransactionTableProps) {
  const [filter, setFilter] = useState<FilterType>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true
    if (filter === "entrada") return t.direction === "entrada"
    if (filter === "saida") return t.direction === "saida"
    if (filter === "atrasado") return t.status === "atrasado"
    return true
  })

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
  }

  // Reset to page 1 when filter changes
  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter)
    setCurrentPage(1)
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h3 className="text-sm font-semibold">Movimentações recentes</h3>
        <div className="flex items-center gap-1.5 rounded-md border border-border bg-background p-0.5 text-sm">
          {[
            { label: "Tudo", value: "all" as FilterType },
            { label: "Entradas", value: "entrada" as FilterType },
            { label: "Saídas", value: "saida" as FilterType },
            { label: "Atrasadas", value: "atrasado" as FilterType },
          ].map((item, i) => (
            <button
              key={item.value}
              type="button"
              onClick={() => handleFilterChange(item.value)}
              className={
                filter === item.value
                  ? "rounded px-3 py-1 text-xs font-medium text-foreground bg-muted"
                  : "rounded px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-2.5 text-left font-medium">Descrição</th>
              <th className="px-5 py-2.5 text-left font-medium">Categoria</th>
              <th className="px-5 py-2.5 text-left font-medium">Contraparte</th>
              <th className="px-5 py-2.5 text-left font-medium">Vencimento</th>
              <th className="px-5 py-2.5 text-left font-medium">Método</th>
              <th className="px-5 py-2.5 text-left font-medium">Status</th>
              <th className="px-5 py-2.5 text-right font-medium">Valor</th>
              <th className="px-5 py-2.5 text-center font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedTransactions.map((t) => (
              <React.Fragment key={t.id}>
              <tr
                className={`transition-colors hover:bg-accent/20 ${t.ficha ? "cursor-pointer" : ""}`}
                onClick={() => t.ficha && setExpandedId(prev => prev === t.id ? null : t.id)}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                        t.direction === "entrada"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.direction === "entrada" ? (
                        <ArrowDownLeft className="h-3.5 w-3.5" strokeWidth={2} />
                      ) : (
                        <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{t.description}</span>
                      {t.ficha && (
                        <span className="text-[11px] text-muted-foreground">
                          {t.ficha.items.length} {t.ficha.items.length === 1 ? "item" : "itens"} · clique para ver
                        </span>
                      )}
                    </div>
                    {t.ficha && (
                      <ChevronDown className={`ml-1 h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ${expandedId === t.id ? "rotate-180" : ""}`} />
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 text-xs capitalize text-muted-foreground">{t.category}</td>
                <td className="px-5 py-3 text-sm text-muted-foreground">{t.counterparty}</td>
                <td className="px-5 py-3 text-sm text-muted-foreground">{formatDate(t.dueDate)}</td>
                <td className="px-5 py-3 text-xs text-muted-foreground">
                  {t.method ? METHOD_LABEL[t.method] : "—"}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${STATUS_META[t.status].className}`}
                  >
                    {STATUS_META[t.status].label}
                  </span>
                </td>
                <td
                  className={`px-5 py-3 text-right text-sm font-medium tabular-nums ${
                    t.direction === "entrada" ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t.direction === "entrada" ? "+" : "−"} {brl(t.amount)}
                </td>
                <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    {t.status !== "pago" && (
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdate(t.id, { status: "pago", paidAt: new Date().toISOString() })
                        }}
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md flex items-center justify-center"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                    )}
                    <TransactionFormDialogButton
                      onSave={async (data) => {
                        await onUpdate(t.id, data)
                      }}
                      initialData={t}
                      buttonVariant="ghost"
                      buttonSize="icon"
                    >
                      <Edit className="h-4 w-4" />
                    </TransactionFormDialogButton>
                    <button
                      type="button"
                      onClick={async () => {
                        await onDelete(t.id)
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-md flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
              {t.ficha && expandedId === t.id && (
                <tr key={`${t.id}-items`} className="bg-muted/30">
                  <td colSpan={8} className="px-5 py-0">
                    <div className="py-2 pl-10 border-l-2 border-primary/20 ml-3 my-2">
                      <table className="w-full text-xs">
                        <tbody>
                          {t.ficha.items.map(item => (
                            <tr key={item.id}>
                              <td className="py-1 text-muted-foreground">
                                {item.quantity > 1 ? `${item.quantity}x ` : ""}{item.name}
                              </td>
                              <td className="py-1 text-right font-medium tabular-nums">
                                {brl(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {filteredTransactions.length > ITEMS_PER_PAGE && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} de {filteredTransactions.length}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="h-8 gap-1.5"
            >
              <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} />
              Anterior
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={
                      currentPage === pageNum
                        ? "h-8 w-8 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                        : "h-8 w-8 rounded-md hover:bg-muted text-xs font-medium text-muted-foreground"
                    }
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="h-8 gap-1.5"
            >
              Próxima
              <ChevronRight className="h-3.5 w-3.5" strokeWidth={2} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
