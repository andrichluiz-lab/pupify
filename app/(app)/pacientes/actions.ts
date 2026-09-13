"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createPatient, updatePatient, deletePatient } from "@/lib/api"
import type { Patient } from "@/lib/types"

export async function createPatientAction(data: Partial<Patient>) {
  try {
    const result = await createPatient(data)
    revalidatePath("/pacientes")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error creating patient:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar paciente"
    }
  }
}

export async function updatePatientAction(id: string, data: Partial<Patient>) {
  try {
    const result = await updatePatient(id, data)
    revalidatePath("/pacientes")
    revalidatePath(`/pacientes/${id}`)
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error updating patient:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar paciente"
    }
  }
}

export async function deletePatientAction(id: string) {
  try {
    await deletePatient(id)
    revalidatePath("/pacientes")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error deleting patient:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir paciente"
    }
  }
}
