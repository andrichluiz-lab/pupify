"use server"

import { revalidatePath } from "next/cache"
import { createInventoryItem, updateInventoryItem, deleteInventoryItem } from "@/lib/api"
import type { InventoryItem } from "@/lib/types"

export async function createInventoryItemAction(data: Partial<InventoryItem>) {
  try {
    const result = await createInventoryItem(data)
    revalidatePath("/estoque")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error creating inventory item:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar item"
    }
  }
}

export async function updateInventoryItemAction(id: string, data: Partial<InventoryItem>) {
  try {
    const result = await updateInventoryItem(id, data)
    revalidatePath("/estoque")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error updating inventory item:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar item"
    }
  }
}

export async function deleteInventoryItemAction(id: string) {
  try {
    await deleteInventoryItem(id)
    revalidatePath("/estoque")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error deleting inventory item:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir item"
    }
  }
}
