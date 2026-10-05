import { serverSupabaseServiceRole } from '#supabase/server'
import { resolveAuthUser, invalidateAllCompanyCache } from '../../../utils/rbacCache'
import { checkUserIsSuperAdmin } from '../../../utils/tenantResolver'

interface ToggleActiveBody {
  is_active: boolean
}

export default defineEventHandler(async (event) => {
  const user = await resolveAuthUser(event)
  if (!user) throw createError({ status: 401, statusText: 'Unauthorized' })

  const client = serverSupabaseServiceRole(event)
  const isSuper = await checkUserIsSuperAdmin(client, user.id, user)
  if (!isSuper) {
    throw createError({ status: 403, statusText: 'Forbidden: Super Admin required' })
  }

  const companyId = getRouterParam(event, 'id')
  if (!companyId) throw createError({ status: 400, statusText: 'Company ID is required' })

  const body = await readBody<ToggleActiveBody>(event)
  if (typeof body?.is_active !== 'boolean') {
    throw createError({ status: 400, statusText: 'is_active must be a boolean' })
  }
  const { data: updated, error } = await client
    .from('companies')
    .update({ is_active: body.is_active, updated_at: new Date().toISOString() })
    .eq('id', companyId)
    .select()
    .single()

  if (error) throw createError({ status: 500, statusText: error.message })

  invalidateAllCompanyCache(companyId)
  return { success: true, company: updated }
})
