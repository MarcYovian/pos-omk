import { serverSupabaseServiceRole } from '#supabase/server'
import { resolveAuthUser } from '../../utils/rbacCache'
import { SUPER_ADMIN_EMAIL } from '../../utils/tenantResolver'

export default defineEventHandler(async (event) => {
  const user = await resolveAuthUser(event)
  if (!user) throw createError({ status: 401, statusText: 'Unauthorized' })
  if (user.email !== SUPER_ADMIN_EMAIL) {
    throw createError({ status: 403, statusText: 'Forbidden: Super Admin required' })
  }

  const client = serverSupabaseServiceRole(event)
  const { data: companies, error } = await client
    .from('companies')
    .select(`
      id,
      name,
      slug,
      address,
      phone,
      logo_url,
      is_active,
      settings,
      created_at,
      updated_at,
      company_users (count)
    `)
    .order('created_at', { ascending: true })

  if (error) throw createError({ status: 500, statusText: error.message })

  return (companies || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    address: c.address,
    phone: c.phone,
    logo_url: c.logo_url,
    is_active: c.is_active,
    settings: c.settings,
    created_at: c.created_at,
    updated_at: c.updated_at,
    member_count: c.company_users?.[0]?.count || 0,
  }))
})
