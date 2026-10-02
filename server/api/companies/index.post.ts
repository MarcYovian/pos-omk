import { serverSupabaseServiceRole } from '#supabase/server'
import { resolveAuthUser } from '../../utils/rbacCache'
import { SUPER_ADMIN_EMAIL } from '../../utils/tenantResolver'

interface CreateCompanyBody {
  name: string
  slug?: string
  address?: string
  phone?: string
  logo_url?: string
  settings?: Record<string, any>
}

export default defineEventHandler(async (event) => {
  const user = await resolveAuthUser(event)
  if (!user) throw createError({ status: 401, statusText: 'Unauthorized' })
  if (user.email !== SUPER_ADMIN_EMAIL) {
    throw createError({ status: 403, statusText: 'Forbidden: Super Admin required' })
  }

  const body = await readBody<CreateCompanyBody>(event)
  if (!body?.name?.trim()) {
    throw createError({ status: 400, statusText: 'Nama organisasi wajib diisi' })
  }

  const name = body.name.trim()
  const slug = (body.slug?.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))

  const client = serverSupabaseServiceRole(event)

  // 1. Create company
  const { data: newCompany, error: compError } = await client
    .from('companies')
    .insert({
      name,
      slug,
      address: body.address?.trim() || null,
      phone: body.phone?.trim() || null,
      logo_url: body.logo_url?.trim() || null,
      settings: body.settings || {},
      is_active: true,
    })
    .select()
    .single()

  if (compError) throw createError({ status: 500, statusText: compError.message })

  // 2. Fetch admin role
  const { data: adminRole } = await client
    .from('roles')
    .select('id')
    .eq('code', 'admin')
    .maybeSingle()

  // 3. Automatically add creator (Super Admin) as admin in company_users
  if (adminRole) {
    await client
      .from('company_users')
      .insert({
        company_id: newCompany.id,
        user_id: user.id,
        role_id: adminRole.id,
        is_active: true,
        is_default: false,
      })
  }

  setResponseStatus(event, 201)
  return { success: true, company: newCompany }
})
