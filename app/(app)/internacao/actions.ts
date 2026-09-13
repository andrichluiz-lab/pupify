"use server"

import { revalidatePath } from "next/cache"
import {
  createHospitalization,
  updateHospitalization,
  toggleTreatmentOrderDone,
  createTreatmentOrder,
  createVitalSigns,
  deleteHospitalization,
} from "@/lib/api"
import type { Hospitalization } from "@/lib/types"

export async function createHospitalizationAction(data: Partial<Hospitalization>) {
  try {
    const result = await createHospitalization(data)
    revalidatePath("/internacao")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error creating hospitalization:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar internação"
    }
  }
}

export async function updateHospitalizationAction(id: string, data: Partial<Hospitalization>) {
  try {
    const result = await updateHospitalization(id, data)
    revalidatePath("/internacao")
    revalidatePath(`/internacao/${id}`)
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error updating hospitalization:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar internação"
    }
  }
}

export async function deleteHospitalizationAction(id: string) {
  try {
    await deleteHospitalization(id)
    revalidatePath("/internacao")
    return { success: true }
  } catch (error: unknown) {
    console.error("Error deleting hospitalization:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao excluir internação"
    }
  }
}

export async function toggleTreatmentOrderDoneAction(orderId: string, done: boolean) {
  try {
    const result = await toggleTreatmentOrderDone(orderId, done)
    revalidatePath("/internacao")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error toggling treatment order:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar prescrição"
    }
  }
}

export async function createTreatmentOrderAction(data: {
  hospitalizationId: string
  time: string
  drug: string
  dose: string
  route: string
}) {
  try {
    const result = await createTreatmentOrder(data)
    revalidatePath("/internacao")
    revalidatePath(`/internacao/${data.hospitalizationId}`)
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error creating treatment order:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar prescrição"
    }
  }
}

export async function createVitalSignsAction(data: {
  hospitalizationId: string
  temperature?: number
  heartRate?: number
  respiratoryRate?: number
  bloodPressure?: string
  oxygenSaturation?: number
}) {
  try {
    const result = await createVitalSigns(data)
    revalidatePath("/internacao")
    revalidatePath(`/internacao/${data.hospitalizationId}`)
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error creating vital signs:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao registrar sinais vitais"
    }
  }
}
