"use client"

import type { FinancialTransaction } from "@/lib/types"

interface FinanceiroActionsProps {
  children: React.ReactNode
}

export function FinanceiroActions({ children }: FinanceiroActionsProps) {
  const handleCreateTransaction = async (data: Partial<FinancialTransaction>) => {
    const { createTransactionAction } = await import("./actions")
    const result = await createTransactionAction(data)

    if (result.success) {
      window.location.reload()
    }
  }

  const handleUpdateTransaction = async (id: string, data: Partial<FinancialTransaction>) => {
    const { updateTransactionAction } = await import("./actions")
    const result = await updateTransactionAction(id, data)

    if (result.success) {
      window.location.reload()
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    const { deleteTransactionAction } = await import("./actions")
    const result = await deleteTransactionAction(id)

    if (result.success) {
      window.location.reload()
    }
  }

  return (
    <>
      {children}
    </>
  )
}

export function useFinanceiroActions() {
  const handleCreateTransaction = async (data: Partial<FinancialTransaction>) => {
    const { createTransactionAction } = await import("./actions")
    const result = await createTransactionAction(data)

    if (result.success) {
      window.location.reload()
    }
  }

  const handleUpdateTransaction = async (id: string, data: Partial<FinancialTransaction>) => {
    const { updateTransactionAction } = await import("./actions")
    const result = await updateTransactionAction(id, data)

    if (result.success) {
      window.location.reload()
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    const { deleteTransactionAction } = await import("./actions")
    const result = await deleteTransactionAction(id)

    if (result.success) {
      window.location.reload()
    }
  }

  return {
    handleCreateTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
  }
}
