import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ status: 400, statusText: 'User ID is required' })
  }

  const body = await readBody<UpdateUserBody>(event)

  if (body.email !== undefined && !body.email.trim()) {
    throw createError({ status: 400, statusText: 'Email cannot be empty' })
  }

  const client = serverSupabaseServiceRole(event)

  const updatePayload: Record<string, unknown> = {}

  if (body.email !== undefined) {
    updatePayload.email = body.email.trim()
  }
  if (body.password) {
    updatePayload.password = body.password
  }

  const metadata: Record<string, string> = {}
  let metadataChanged = false
  if (body.role) {
    metadata.role = body.role
    metadataChanged = true
  }
  if (metadataChanged) {
    updatePayload.user_metadata = metadata
  }

  if (Object.keys(updatePayload).length === 0) {
    throw createError({ status: 400, statusText: 'No fields to update' })
  }

  const { error } = await client.auth.admin.updateUserById(userId, updatePayload)

  if (error) throw createError({ status: 500, statusText: error.message })

  return { success: true }
})
