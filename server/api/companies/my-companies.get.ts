import { serverSupabaseServiceRole } from '#supabase/server'
import { resolveAuthUser } from '../../utils/rbacCache'
import { checkUserIsSuperAdmin } from '../../utils/tenantResolver'

export default defineEventHandler(async (event) => {
  const user = await resolveAuthUser(event)
  if (!user) {
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }

  const client = serverSupabaseServiceRole(event)
  const isSuperAdmin = await checkUserIsSuperAdmin(client, user.id, user)

  if (isSuperAdmin) {
    const { data: companies, error } = await client
      .from('companies')
      .select('id, name, slug, address, phone, logo_url, is_active, settings, created_at')
      .order('created_at', { ascending: true })

    if (error) throw createError({ status: 500, statusText: error.message })

    return (companies || []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      address: c.address,
      phone: c.phone,
      logo_url: c.logo_url,
      is_active: c.is_active,
      is_default: false,
      role_code: 'admin',
      role_name: 'Administrator',
      settings: c.settings,
    }))
  }

  const { data: memberships, error } = await client
    .from('company_users')
    .select(`
      company_id,
      is_default,
      is_active,
      roles (code, name),
      companies (
        id,
        name,
        slug,
        address,
        phone,
        logo_url,
        is_active,
        settings
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .order('is_default', { ascending: false })

  if (error) throw createError({ status: 500, statusText: error.message })

  const result = (memberships || [])
    .filter((m: any) => m.companies && m.companies.is_active)
    .map((m: any) => ({
      id: m.companies.id,
      name: m.companies.name,
      slug: m.companies.slug,
      address: m.companies.address,
      phone: m.companies.phone,
      logo_url: m.companies.logo_url,
      is_active: m.companies.is_active,
      is_default: m.is_default,
      role_code: m.roles?.code || 'cashier',
      role_name: m.roles?.name || 'Kasir',
      settings: m.companies.settings,
    }))

  return result
})
