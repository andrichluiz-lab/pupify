"use server"

import { revalidatePath } from "next/cache"
import { createAppointment, updateAppointment, deleteAppointment } from "@/lib/api"
import type { Appointment } from "@/lib/types"

export async function createAppointmentAction(data: Partial<Appointment>) {
  try {
    const result = await createAppointment(data)
    revalidatePath("/agenda")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error creating appointment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar agendamento"
    }
  }
}

export async function updateAppointmentAction(id: string, data: Partial<Appointment>) {
  try {
    const result = await updateAppointment(id, data)
    revalidatePath("/agenda")
    revalidatePath(`/agenda`)
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error updating appointment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar agendamento"
    }
  }
}

export async function deleteAppointmentAction(id: string) {
  try {
    await deleteAppointment(id)
    revalidatePath("/agenda")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error deleting appointment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir agendamento"
    }
  }
}
