import { serverSupabaseServiceRole } from '#supabase/server'
import { invalidatePermissionsCatalogCache } from '../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles:manage')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ status: 400, statusText: 'ID permission wajib disertakan' })

  const body = await readBody<{ name?: string; module?: string; description?: string }>(event)
  const client = serverSupabaseServiceRole(event)

  const updates: Record<string, any> = {}
  if (body.name?.trim()) updates.name = body.name.trim()
  if (body.module?.trim()) updates.module = body.module.trim().toLowerCase()
  if (body.description !== undefined) updates.description = body.description?.trim() || null

  const { error } = await client
    .from('permissions')
    .update(updates)
    .eq('id', id)

  if (error) {
    throw createError({ status: 500, statusText: error.message })
  }

  invalidatePermissionsCatalogCache()
  return { success: true }
})
