import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const client = serverSupabaseServiceRole(event)
  const { data, error } = await client.auth.admin.listUsers()

  if (error) throw createError({ status: 500, statusText: error.message })

  const users = data.users.map((u) => {
    const rawRole = u.user_metadata?.role
    const role: 'admin' | 'cashier' = (rawRole === 'admin' || rawRole === 'cashier') ? rawRole : 'cashier'
    return {
      id: u.id,
      email: u.email ?? '',
      role,
      is_active: u.user_metadata?.is_active !== false,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      email_confirmed_at: u.email_confirmed_at ?? null,
    } satisfies UserRecord
  })

  return users
})
