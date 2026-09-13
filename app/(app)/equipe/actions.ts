"use server"

import { revalidatePath } from "next/cache"
import { createTeamMember, adminUpdateUser, type AdminUserUpdate } from "@/lib/api"
import type { CreateTeamMemberInput } from "@/lib/types"

export async function createTeamMemberAction(data: CreateTeamMemberInput) {
  try {
    const result = await createTeamMember(data)
    revalidatePath("/equipe")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error creating team member:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao criar membro da equipe"
    }
  }
}

export async function adminUpdateUserAction(userId: string, data: AdminUserUpdate) {
  try {
    const result = await adminUpdateUser(userId, data)
    revalidatePath("/equipe")
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error("Error updating user:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro ao atualizar usuário"
    }
  }
}
