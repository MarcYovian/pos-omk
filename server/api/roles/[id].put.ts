import { serverSupabaseServiceRole } from '#supabase/server'
import type { UpdateRoleBody } from '~/shared/types/users'
import { invalidateRolesCache } from '../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles:manage')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ status: 400, statusText: 'ID peran wajib disertakan' })

  const body = await readBody<UpdateRoleBody>(event)
  const client = serverSupabaseServiceRole(event)

  // Verify role exists
  const { data: role, error: fetchError } = await client
    .from('roles')
    .select('id, code, is_system')
    .eq('id', id)
    .single()

  if (fetchError || !role) {
    throw createError({ status: 404, statusText: 'Peran tidak ditemukan' })
  }

  // Update role metadata
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }
  if (body.name?.trim()) updates.name = body.name.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null

  const { error: updateError } = await client
    .from('roles')
    .update(updates)
    .eq('id', id)

  if (updateError) {
    throw createError({ status: 500, statusText: updateError.message })
  }

  // Update role_permissions if provided
  if (Array.isArray(body.permissions)) {
    // Delete existing
    await client.from('role_permissions').delete().eq('role_id', id)

    // Lookup permission ids
    if (body.permissions.length > 0) {
      const { data: perms } = await client
        .from('permissions')
        .select('id, code')
        .in('code', body.permissions)

      if (perms && perms.length > 0) {
        const mappings = perms.map((p) => ({
          role_id: id,
          permission_id: p.id,
        }))
        await client.from('role_permissions').insert(mappings)
      }
    }
  }

  invalidateRolesCache()
  return { success: true }
})
