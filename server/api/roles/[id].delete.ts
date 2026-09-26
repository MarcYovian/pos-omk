import { serverSupabaseServiceRole } from '#supabase/server'
import { invalidateRolesCache } from '../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles:manage')

  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ status: 400, statusText: 'ID peran wajib disertakan' })

  const client = serverSupabaseServiceRole(event)

  // Verify role
  const { data: role, error: fetchError } = await client
    .from('roles')
    .select('id, code, is_system')
    .eq('id', id)
    .single()

  if (fetchError || !role) {
    throw createError({ status: 404, statusText: 'Peran tidak ditemukan' })
  }

  if (role.is_system) {
    throw createError({ status: 400, statusText: 'Peran bawaan sistem tidak dapat dihapus' })
  }

  // Check if users are assigned
  const { count, error: countError } = await client
    .from('user_roles')
    .select('*', { count: 'exact', head: true })
    .eq('role_id', id)

  if (countError) {
    throw createError({ status: 500, statusText: countError.message })
  }

  if (count && count > 0) {
    throw createError({
      status: 400,
      statusText: `Peran ini masih digunakan oleh ${count} pengguna. Alihkan peran pengguna terlebih dahulu sebelum menghapus.`
    })
  }

  const { error: deleteError } = await client
    .from('roles')
    .delete()
    .eq('id', id)

  if (deleteError) {
    throw createError({ status: 500, statusText: deleteError.message })
  }

  invalidateRolesCache()
  return { success: true }
})
