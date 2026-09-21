import { serverSupabaseServiceRole } from '#supabase/server'
import type { CreateRoleBody, RoleRecord } from '~/shared/types/users'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles:manage')

  const body = await readBody<CreateRoleBody>(event)

  if (!body.name || !body.name.trim()) {
    throw createError({ status: 400, statusText: 'Nama peran wajib diisi' })
  }

  const rawCode = body.code || body.name
  const code = rawCode
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')

  if (!code) {
    throw createError({ status: 400, statusText: 'Kode peran tidak valid' })
  }

  const client = serverSupabaseServiceRole(event)

  // Check code uniqueness
  const { data: existing } = await client
    .from('roles')
    .select('id')
    .eq('code', code)
    .single()

  if (existing) {
    throw createError({ status: 400, statusText: `Kode peran '${code}' sudah digunakan` })
  }

  // Insert role
  const { data: role, error: roleError } = await client
    .from('roles')
    .insert({
      code,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      is_system: false,
    })
    .select()
    .single()

  if (roleError || !role) {
    throw createError({ status: 500, statusText: roleError?.message || 'Gagal membuat peran' })
  }

  // Insert role_permissions if any provided
  const permissionCodes = Array.isArray(body.permissions) ? body.permissions : []
  if (permissionCodes.length > 0) {
    const { data: perms } = await client
      .from('permissions')
      .select('id, code')
      .in('code', permissionCodes)

    if (perms && perms.length > 0) {
      const mappings = perms.map((p) => ({
        role_id: role.id,
        permission_id: p.id,
      }))
      await client.from('role_permissions').insert(mappings)
    }
  }

  const result: RoleRecord = {
    id: role.id,
    code: role.code,
    name: role.name,
    description: role.description,
    is_system: role.is_system,
    permissions: permissionCodes,
    created_at: role.created_at,
    updated_at: role.updated_at,
  }

  return result
})
