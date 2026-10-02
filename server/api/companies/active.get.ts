import { serverSupabaseServiceRole } from '#supabase/server'
import { resolveActiveCompany } from '../../utils/tenantResolver'
import { getCachedCompanyProfile, setCachedCompanyProfile } from '../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  const tenant = await resolveActiveCompany(event)
  const companyId = tenant.companyId

  const cached = getCachedCompanyProfile(companyId)
  if (cached) {
    return cached
  }

  const client = serverSupabaseServiceRole(event)
  const { data: company, error } = await client
    .from('companies')
    .select('id, name, slug, address, phone, logo_url, is_active, settings, created_at, updated_at')
    .eq('id', companyId)
    .single()

  if (error || !company) {
    throw createError({ status: 404, statusText: 'Organisasi tidak ditemukan' })
  }

  const response = {
    ...company,
    role_code: tenant.roleCode,
    is_super_admin: tenant.isSuperAdmin,
  }

  setCachedCompanyProfile(companyId, response)
  return response
})
