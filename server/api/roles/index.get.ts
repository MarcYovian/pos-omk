import { serverSupabaseServiceRole } from '#supabase/server'
import type { RoleRecord } from '~/shared/types/users'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles:manage')

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client
    .from('roles')
    .select(`
      id,
      code,
      name,
      description,
      is_system,
      created_at,
      updated_at,
      role_permissions (
        permissions (
          code
        )
      )
    `)
    .order('is_system', { ascending: false })
    .order('name', { ascending: true })

  if (error) {
    throw createError({ status: 500, statusText: error.message })
  }

  const roles: RoleRecord[] = (data || []).map((r: any) => {
    const permissions = (r.role_permissions || [])
      .map((rp: any) => rp.permissions?.code)
      .filter(Boolean)

    return {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      is_system: r.is_system,
      permissions,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }
  })

  return roles
})
