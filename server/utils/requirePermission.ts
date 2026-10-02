import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import { resolveAuthUser, getCachedUserPermissions, setCachedUserPermissions } from './rbacCache'

export async function requirePermission(event: H3Event, permission: string) {
  // 1. Resolve user (from cookie or cached Bearer token)
  const user = await resolveAuthUser(event)

  if (!user) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  // 2. Superadmin metadata bypass
  if (user.user_metadata?.role === 'admin') {
    return user
  }

  // 3. Check cached permissions first
  let permissions = getCachedUserPermissions(user.id)

  if (!permissions) {
    const client = serverSupabaseServiceRole(event)
    const { data, error } = await client.rpc('get_user_effective_permissions', {
      p_user_id: user.id
    })

    if (error) {
      throw createError({ status: 500, statusText: error.message })
    }

    permissions = (data as Array<{ permission_code: string }> || []).map(p => p.permission_code)
    setCachedUserPermissions(user.id, permissions)
  }

  if (!permissions.includes(permission)) {
    throw createError({
      status: 403,
      statusText: `Forbidden: Memerlukan izin '${permission}'`
    })
  }

  return user
}
