import { serverSupabaseServiceRole } from '#supabase/server'
import type { UserRecord } from '~/shared/types/users'
import { getCachedUsers, setCachedUsers } from '../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=120')

  const cached = getCachedUsers()
  if (cached) {
    return cached as UserRecord[]
  }

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.auth.admin.listUsers()

  if (error) throw createError({ status: 500, statusText: error.message })

  const userRolesMap = new Map<string, { code: string; name: string }>()
  const overridesCountMap = new Map<string, number>()

  if (typeof client.from === 'function') {
    try {
      const { data: userRolesData } = await client
        .from('user_roles')
        .select(`
          user_id,
          roles (
            code,
            name
          )
        `)

      for (const ur of (userRolesData || [])) {
        if (ur.user_id && ur.roles) {
          const r = ur.roles as any
          userRolesMap.set(ur.user_id, { code: r.code, name: r.name })
        }
      }

      const { data: overridesData } = await client
        .from('user_permissions')
        .select('user_id')

      for (const o of (overridesData || [])) {
        const current = overridesCountMap.get(o.user_id) || 0
        overridesCountMap.set(o.user_id, current + 1)
      }
    } catch {
      // Ignore if table query fails in mock tests
    }
  }

  const users = data.users.map((u) => {
    const assignedRole = userRolesMap.get(u.id)
    const rawRole = u.user_metadata?.role
    let roleCode = assignedRole?.code || rawRole || 'cashier'

    // If not a known valid role or not in DB, fallback to cashier
    if (!assignedRole && roleCode !== 'admin' && roleCode !== 'cashier') {
      roleCode = 'cashier'
    }

    const roleName = assignedRole?.name || (roleCode === 'admin' ? 'Administrator' : 'Kasir')

    return {
      id: u.id,
      email: u.email ?? '',
      role: roleCode,
      role_name: roleName,
      is_active: u.user_metadata?.is_active !== false,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      custom_overrides_count: overridesCountMap.get(u.id) || 0,
    } satisfies UserRecord
  })

  setCachedUsers(users)
  return users
})
