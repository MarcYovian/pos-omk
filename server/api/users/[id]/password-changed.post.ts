import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ status: 400, statusText: 'User ID is required' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: target } = await client.auth.admin.getUserById(userId)
  if (!target.user) {
    throw createError({ status: 404, statusText: 'User not found' })
  }

  const metadata = { ...target.user.user_metadata, force_password_change: false }

  const { error } = await client.auth.admin.updateUserById(userId, {
    user_metadata: metadata,
  })

  if (error) throw createError({ status: 500, statusText: error.message })

  return { success: true }
})
