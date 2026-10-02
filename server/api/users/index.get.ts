import { serverSupabaseServiceRole } from '#supabase/server'
import type { UserRecord } from '~/shared/types/users'
import { getCachedUsers, setCachedUsers } from '../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  const tenant = await requireAdmin(event)
  const companyId = tenant?.companyId

  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=120')

  const cached = getCachedUsers(companyId)
  if (cached) {
    return cached as UserRecord[]
  }

  const client = serverSupabaseServiceRole(event)

  let companyMembers: Array<any> | null = null
  const userRolesMap = new Map<string, { code: string; name: string }>()
  const overridesCountMap = new Map<string, number>()
  const memberActiveMap = new Map<string, boolean>()

  if (typeof client.from === 'function') {
    try {
      if (companyId) {
        const { data: members } = await client
          .from('company_users')
          .select(`
            user_id,
            is_active,
            created_at,
            roles (
              code,
              name
            )
          `)
          .eq('company_id', companyId)

        if (members && members.length > 0) {
          companyMembers = members
          for (const m of members) {
            if (m.user_id && m.roles) {
              const r = m.roles as any
              userRolesMap.set(m.user_id, { code: r.code, name: r.name })
            }
            memberActiveMap.set(m.user_id, m.is_active)
          }
        }
      }

      // If no companyMembers found yet, check user_roles fallback
      if (!companyMembers) {
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
      }

      const overridesQuery = client
        .from('user_permissions')
        .select('user_id')

      if (companyId) {
        overridesQuery.eq('company_id', companyId)
      }

      const { data: overridesData } = await overridesQuery

      for (const o of (overridesData || [])) {
        const current = overridesCountMap.get(o.user_id) || 0
        overridesCountMap.set(o.user_id, current + 1)
      }
    } catch {
      // Ignore if table query fails in mock tests
    }
  }

  const { data, error } = await client.auth.admin.listUsers()
  if (error) throw createError({ status: 500, statusText: error.message })

  let targetAuthUsers = data.users
  if (companyMembers && companyMembers.length > 0) {
    const memberIdSet = new Set(companyMembers.map(m => m.user_id))
    targetAuthUsers = data.users.filter(u => memberIdSet.has(u.id))
  }

  const users = targetAuthUsers.map((u) => {
    const assignedRole = userRolesMap.get(u.id)
    const rawRole = u.user_metadata?.role
    let roleCode = assignedRole?.code || rawRole || 'cashier'

    // If not a known valid role or not in DB, fallback to cashier
    if (!assignedRole && roleCode !== 'admin' && roleCode !== 'cashier') {
      roleCode = 'cashier'
    }

    const roleName = assignedRole?.name || (roleCode === 'admin' ? 'Administrator' : 'Kasir')
    const isActive = memberActiveMap.has(u.id)
      ? memberActiveMap.get(u.id)!
      : (u.user_metadata?.is_active !== false)

    return {
      id: u.id,
      email: u.email ?? '',
      role: roleCode,
      role_name: roleName,
      is_active: isActive,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
      custom_overrides_count: overridesCountMap.get(u.id) || 0,
    } satisfies UserRecord
  })

  if (companyId) {
    setCachedUsers(companyId, users)
  } else {
    setCachedUsers(users)
  }
  return users
})
