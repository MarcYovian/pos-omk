import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'
import { resolveAuthUser, getCachedUserPermissions, setCachedUserPermissions } from './rbacCache'
import { resolveActiveCompany } from './tenantResolver'

export async function requirePermission(event: H3Event, permission: string) {
  const user = await resolveAuthUser(event)
  if (!user) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  const tenant = await resolveActiveCompany(event)

  // 1. Super Admin bypass seluruh pengecekan izin, atau admin pada tenant aktif
  if (tenant.isSuperAdmin || tenant.roleCode === 'admin') {
    return user
  }

  // 2. Periksa cache izin user untuk companyId ini
  let permissions = getCachedUserPermissions(user.id, tenant.companyId)

  if (!permissions) {
    const client = serverSupabaseServiceRole(event)
    const { data, error } = await client.rpc('get_user_effective_permissions', {
      p_user_id: user.id,
      p_company_id: tenant.companyId
    })

    if (error) {
      throw createError({ status: 500, statusText: error.message })
    }

    permissions = (data as Array<{ permission_code: string }> || []).map(p => p.permission_code)
    setCachedUserPermissions(user.id, tenant.companyId, permissions)
  }

  if (!permissions.includes(permission)) {
    throw createError({
      status: 403,
      statusText: `Forbidden: Memerlukan izin '${permission}' pada ${tenant.companyName || 'organisasi'}`
    })
  }

  return user
}
