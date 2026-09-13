"use server"

import { revalidatePath } from "next/cache"
import { createTransaction, updateTransaction, deleteTransaction } from "@/lib/api"
import type { FinancialTransaction } from "@/lib/types"

export async function createTransactionAction(data: Partial<FinancialTransaction>) {
  try {
    const result = await createTransaction(data)
    revalidatePath("/financeiro")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error creating transaction:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar transação"
    }
  }
}

export async function updateTransactionAction(id: string, data: Partial<FinancialTransaction>) {
  try {
    const result = await updateTransaction(id, data)
    revalidatePath("/financeiro")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error updating transaction:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar transação"
    }
  }
}

export async function deleteTransactionAction(id: string) {
  try {
    await deleteTransaction(id)
    revalidatePath("/financeiro")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error deleting transaction:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir transação"
    }
  }
}
