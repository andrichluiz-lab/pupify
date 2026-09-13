"use server"

import { revalidatePath } from "next/cache"
import { createMedicalRecord, updateMedicalRecord, deleteConsultation } from "@/lib/api"
import type { MedicalRecord } from "@/lib/types"

export async function createMedicalRecordAction(data: Partial<MedicalRecord>) {
  try {
    const result = await createMedicalRecord(data)
    revalidatePath("/prontuarios")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error creating medical record:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar prontuário"
    }
  }
}

export async function updateMedicalRecordAction(id: string, data: Partial<MedicalRecord>) {
  try {
    const result = await updateMedicalRecord(id, data)
    revalidatePath("/prontuarios")
    revalidatePath(`/prontuarios/${id}`)
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error updating medical record:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar prontuário"
    }
  }
}

export async function deleteConsultationAction(id: string) {
  try {
    await deleteConsultation(id)
    revalidatePath("/consultorio")
    revalidatePath("/prontuarios")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error deleting consultation:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir consulta"
    }
  }
}
