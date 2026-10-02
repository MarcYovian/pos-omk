import { serverSupabaseServiceRole } from '#supabase/server'
import type { PermissionRecord } from '~/shared/types/users'
import { invalidatePermissionsCatalogCache } from '../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'roles:manage')

  const body = await readBody<{ code: string; name: string; module: string; description?: string }>(event)

  if (!body.name?.trim()) throw createError({ status: 400, statusText: 'Nama permission wajib diisi' })
  if (!body.code?.trim()) throw createError({ status: 400, statusText: 'Kode permission wajib diisi' })
  if (!body.module?.trim()) throw createError({ status: 400, statusText: 'Group / Modul wajib diisi' })

  const client = serverSupabaseServiceRole(event)
  const code = body.code.trim().toLowerCase()

  const { data: existing } = await client
    .from('permissions')
    .select('id')
    .eq('code', code)
    .single()

  if (existing) {
    throw createError({ status: 400, statusText: `Kode permission '${code}' sudah digunakan` })
  }

  const { data, error } = await client
    .from('permissions')
    .insert({
      code,
      name: body.name.trim(),
      module: body.module.trim().toLowerCase(),
      description: body.description?.trim() || null,
    })
    .select()
    .single()

  if (error || !data) {
    throw createError({ status: 500, statusText: error?.message || 'Gagal menambahkan permission' })
  }

  invalidatePermissionsCatalogCache()
  return data as PermissionRecord
})
