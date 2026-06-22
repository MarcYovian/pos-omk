import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ status: 400, statusText: 'User ID is required' })
  }

  const client = serverSupabaseServiceRole(event)

  const { data: user, error: getUserError } = await client.auth.admin.getUserById(userId)
  if (getUserError || !user.user?.email) {
    throw createError({ status: 404, statusText: 'User not found' })
  }

  const redirectUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}/login`
  const { error } = await client.auth.admin.generateLink({
    type: 'signup',
    email: user.user.email,
    options: { redirectTo: redirectUrl },
  })

  if (error) throw createError({ status: 500, statusText: error.message })

  return { success: true, email: user.user.email }
})
