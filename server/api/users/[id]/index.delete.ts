import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ status: 400, statusText: 'User ID is required' })
  }

  if (userId === admin.id) {
    throw createError({ status: 400, statusText: 'Cannot delete your own account' })
  }

  const client = serverSupabaseServiceRole(event)
  const { error } = await client.auth.admin.deleteUser(userId)

  if (error) throw createError({ status: 500, statusText: error.message })

  return { success: true }
})
