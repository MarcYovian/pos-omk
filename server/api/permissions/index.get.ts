import { serverSupabaseServiceRole } from '#supabase/server'
import type { PermissionRecord } from '~/shared/types/users'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles:manage')

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('permissions')
    .select('id, code, name, module, description')
    .order('module', { ascending: true })
    .order('code', { ascending: true })

  if (error) {
    throw createError({ status: 500, statusText: error.message })
  }

  return data as PermissionRecord[]
})
