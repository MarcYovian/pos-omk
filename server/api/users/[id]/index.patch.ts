import { serverSupabaseServiceRole } from '#supabase/server'
import type { UpdateUserBody } from '~/shared/types/users'
import { invalidateUsersCache, invalidateUserCache } from '../../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ status: 400, statusText: 'User ID is required' })
  }

  const body = await readBody<UpdateUserBody>(event)

  if (body.email !== undefined && !body.email.trim()) {
    throw createError({ status: 400, statusText: 'Email cannot be empty' })
  }

  const client = serverSupabaseServiceRole(event)

  const updatePayload: Record<string, unknown> = {}

  if (body.email !== undefined) {
    updatePayload.email = body.email.trim()
  }
  if (body.password) {
    updatePayload.password = body.password
  }

  if (body.role) {
    const roleCode = body.role.trim().toLowerCase()
    let targetCode = roleCode

    if (typeof client.from === 'function') {
      const { data: roleData, error: roleError } = await client
        .from('roles')
        .select('id, code')
        .eq('code', roleCode)
        .single()

      if (roleError || !roleData) {
        throw createError({ status: 400, statusText: `Role '${roleCode}' is invalid` })
      }

      targetCode = roleData.code

      // Upsert into user_roles
      await client
        .from('user_roles')
        .upsert({ user_id: userId, role_id: roleData.id }, { onConflict: 'user_id,role_id' })

      // Clean up other roles
      await client
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .neq('role_id', roleData.id)
    }

    // Sync auth.users metadata
    updatePayload.user_metadata = {
      role: targetCode,
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    throw createError({ status: 400, statusText: 'No fields to update' })
  }

  const { error } = await client.auth.admin.updateUserById(userId, updatePayload)

  if (error) throw createError({ status: 500, statusText: error.message })

  invalidateUsersCache()
  invalidateUserCache(userId)
  return { success: true }
})
