'use server'

import { revalidatePath } from 'next/cache'
import { updateUserPermissions } from '@/lib/api'
import type { UserPermissionOverride } from '@/lib/permissions'

export async function saveUserPermissionsAction(
  userTenantId: string,
  overrides: UserPermissionOverride[],
) {
  try {
    const result = await updateUserPermissions(userTenantId, overrides)
    revalidatePath(`/equipe/${userTenantId}/permissoes`)
    revalidatePath('/equipe')
    return { success: true, data: result }
  } catch (error: unknown) {
    console.error('Error updating permissions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao atualizar permissões',
    }
  }
}
