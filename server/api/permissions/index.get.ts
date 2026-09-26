import { serverSupabaseServiceRole } from '#supabase/server'
import type { PermissionRecord } from '~/shared/types/users'
import { getCachedPermissionsCatalog, setCachedPermissionsCatalog } from '../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles:manage')

  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=120')

  const cached = getCachedPermissionsCatalog()
  if (cached) {
    return cached as PermissionRecord[]
  }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('permissions')
    .select('id, code, name, module, description')
    .order('module', { ascending: true })
    .order('code', { ascending: true })

  if (error) {
    throw createError({ status: 500, statusText: error.message })
  }

  const result = data as PermissionRecord[]
  setCachedPermissionsCatalog(result)
  return result
})
