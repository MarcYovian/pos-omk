import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'

export async function requireAdmin(event: H3Event) {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  const role = user.user_metadata?.role
  if (role !== 'admin') {
    throw createError({ status: 403, statusText: 'Forbidden' })
  }

  return user
}
