import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles:manage')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ status: 400, statusText: 'ID permission wajib disertakan' })

  const client = serverSupabaseServiceRole(event)

  const { error } = await client
    .from('permissions')
    .delete()
    .eq('id', id)

  if (error) {
    throw createError({ status: 500, statusText: error.message })
  }

  return { success: true }
})
