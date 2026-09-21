import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

export async function requirePermission(event: H3Event, permission: string) {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  // 1. Superadmin metadata bypass
  if (user.user_metadata?.role === 'admin') {
    return user
  }

  // 2. Query effective permissions using Service Role client
  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.rpc('get_user_effective_permissions', {
    p_user_id: user.id
  })

  if (error) {
    throw createError({ status: 500, statusText: error.message })
  }

  const permissions = (data as Array<{ permission_code: string }> || []).map(p => p.permission_code)

  if (!permissions.includes(permission)) {
    throw createError({
      status: 403,
      statusText: `Forbidden: Memerlukan izin '${permission}'`
    })
  }

  return user
}
