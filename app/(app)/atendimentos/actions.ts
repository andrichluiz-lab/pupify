"use server"

import { revalidatePath } from "next/cache"
import { createAppointment } from "@/lib/api"
import type { Appointment } from "@/lib/types"

export async function createAppointmentAction(data: Partial<Appointment>) {
  try {
    const result = await createAppointment(data)
    revalidatePath("/atendimentos")
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
