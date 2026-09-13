"use server"

import { revalidatePath } from "next/cache"
import { createSurgery, updateSurgery, deleteSurgery } from "@/lib/api"
import type { Surgery } from "@/lib/types"

export async function createSurgeryAction(data: Partial<Surgery>) {
  try {
    const result = await createSurgery(data)
    revalidatePath("/cirurgias")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error creating surgery:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar cirurgia"
    }
  }
}

export async function updateSurgeryAction(id: string, data: Partial<Surgery>) {
  try {
    const result = await updateSurgery(id, data)
    revalidatePath("/cirurgias")
    revalidatePath(`/cirurgias/${id}`)
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error updating surgery:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar cirurgia"
    }
  }
}

export async function deleteSurgeryAction(id: string) {
  try {
    await deleteSurgery(id)
    revalidatePath("/cirurgias")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error deleting surgery:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir cirurgia"
    }
  }
}
