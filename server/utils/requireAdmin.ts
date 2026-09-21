import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

export async function requireAdmin(event: H3Event) {
  let user: any = null

  try {
    user = await serverSupabaseUser(event)
  } catch {
    // ignore
  }

  if (!user) {
    const client = serverSupabaseServiceRole(event)
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

  const role = user.user_metadata?.role
  if (role !== 'admin') {
    throw createError({ status: 403, statusText: 'Forbidden' })
  }

  return user
}
