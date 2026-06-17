import { serverSupabaseServiceRole } from '#supabase/server'

const SUPER_ADMIN_EMAIL = 'marcellinusyovian@gmail.com'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ status: 400, statusText: 'User ID is required' })
  }

  const body = await readBody<ToggleActiveBody>(event)

  if (typeof body.is_active !== 'boolean') {
    throw createError({ status: 400, statusText: 'is_active must be a boolean' })
  }

  if (admin.email !== SUPER_ADMIN_EMAIL) {
    throw createError({ status: 403, statusText: 'Only super admin can toggle user active status' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: targetUser } = await client.auth.admin.getUserById(userId)
  if (targetUser.user?.email === SUPER_ADMIN_EMAIL) {
    throw createError({ status: 400, statusText: 'Cannot toggle super admin status' })
  }

  const { error } = await client.auth.admin.updateUserById(userId, {
    user_metadata: { is_active: body.is_active },
  })

  if (error) throw createError({ status: 500, statusText: error.message })

  return { success: true }
})
