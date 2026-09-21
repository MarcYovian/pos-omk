import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

export async function requirePermission(event: H3Event, permission: string) {
  const client = serverSupabaseServiceRole(event)
  let user: any = null

  // 1. Try resolving user from cookies via @nuxtjs/supabase
  try {
    user = await serverSupabaseUser(event)
  } catch {
    // Cookie parsing failed or absent, proceed to header fallback
  }

  // 2. Fallback to Authorization: Bearer <token> header
  if (!user) {
    const authHeader = getRequestHeader(event, 'authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim()
      const { data, error } = await client.auth.getUser(token)
      if (!error && data?.user) {
        user = data.user
      }
    }
  }

  if (!user) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  // 3. Superadmin metadata bypass
  if (user.user_metadata?.role === 'admin') {
    return user
  }

  // 4. Query effective permissions using Service Role client
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
