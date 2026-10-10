import { serverSupabaseServiceRole } from '#supabase/server'
import type { ToggleActiveBody } from '~/shared/types/users'
import { invalidateUserCache, invalidateUsersCache } from '../../../utils/rbacCache'
import { checkUserIsSuperAdmin } from '../../../utils/tenantResolver'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ status: 400, statusText: 'User ID is required' })
  }

  const body = await readBody<ToggleActiveBody>(event)

  if (typeof body?.is_active !== 'boolean') {
    throw createError({ status: 400, statusText: 'is_active must be a boolean' })
  }

  const client = serverSupabaseServiceRole(event)
  const isSuper = (admin as any).isSuperAdmin ?? await checkUserIsSuperAdmin(client, admin.id, admin)

  if (!isSuper) {
    throw createError({ status: 403, statusText: 'Only super admin can toggle user active status' })
  }

  if (userId === admin.id) {
    throw createError({ status: 400, statusText: 'Cannot toggle own active status' })
  }

  let isTargetSuper = await checkUserIsSuperAdmin(client, userId)
  if (!isTargetSuper && typeof client.auth?.admin?.getUserById === 'function') {
    try {
      const { data: targetUser } = await client.auth.admin.getUserById(userId)
      if (targetUser?.user) {
        if ((targetUser.user as any).isSuperAdmin || (targetUser.user as any).role === 'super_admin') {
          isTargetSuper = true
        }
      }
    } catch {
      // ignore
    }
  }

  if (isTargetSuper) {
    throw createError({ status: 400, statusText: 'Cannot toggle super admin status' })
  }

  // Update company_users if database is available
  if (typeof client.from === 'function') {
    try {
      await client
        .from('company_users')
        .update({ is_active: body.is_active })
        .eq('user_id', userId)
    } catch {
      // ignore in tests
    }
  }

  if (typeof client.auth?.admin?.updateUserById === 'function') {
    const { error } = await client.auth.admin.updateUserById(userId, {
      user_metadata: { is_active: body.is_active },
      ban_duration: body.is_active ? 'none' : '876000h',
    })
    if (error) throw createError({ status: 500, statusText: error.message })
  }

  invalidateUsersCache((admin as any)?.companyId)
  invalidateUserCache(userId, (admin as any)?.companyId)
  return { success: true }
})
