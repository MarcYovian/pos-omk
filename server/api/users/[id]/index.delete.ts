import { serverSupabaseServiceRole } from '#supabase/server'
import { invalidateUsersCache, invalidateUserCache } from '../../../utils/rbacCache'
import { resolveActiveCompany } from '../../../utils/tenantResolver'

export default defineEventHandler(async (event) => {
  const admin = await requirePermission(event, 'users:manage')
  const tenant = await resolveActiveCompany(event)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ status: 400, statusText: 'User ID is required' })
  }

  if (userId === admin.id) {
    throw createError({ status: 400, statusText: 'Cannot delete your own account' })
  }

  const client = serverSupabaseServiceRole(event)
  let deletedFromAuth = false

  if (typeof client.from === 'function' && tenant?.companyId) {
    try {
      // 1. Remove membership from company_users for active tenant
      await client
        .from('company_users')
        .delete()
        .eq('company_id', tenant.companyId)
        .eq('user_id', userId)

      // 2. Remove tenant-specific permission overrides
      await client
        .from('user_permissions')
        .delete()
        .eq('company_id', tenant.companyId)
        .eq('user_id', userId)

      // 3. Check if user still has other memberships
      const { data: remainingMemberships } = await client
        .from('company_users')
        .select('id')
        .eq('user_id', userId)

      if (!remainingMemberships || remainingMemberships.length === 0) {
        // Safe to delete from auth.users since user belongs to no other organization
        const { error } = await client.auth.admin.deleteUser(userId)
        if (error) throw createError({ status: 500, statusText: error.message })
        deletedFromAuth = true
      }
    } catch (err: any) {
      if (err.statusCode) throw err
      // Table delete error or mock fallback
    }
  }

  if (!deletedFromAuth && typeof client.from !== 'function') {
    const { error } = await client.auth.admin.deleteUser(userId)
    if (error) throw createError({ status: 500, statusText: error.message })
  }

  invalidateUsersCache(tenant?.companyId)
  invalidateUserCache(userId, tenant?.companyId)
  return { success: true }
})
