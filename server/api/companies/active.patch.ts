import { serverSupabaseServiceRole } from '#supabase/server'
import { requireAdmin } from '../../utils/requireAdmin'
import { invalidateCompanyProfileCache } from '../../utils/rbacCache'

interface UpdateCompanyBody {
  name?: string
  address?: string | null
  phone?: string | null
  logo_url?: string | null
  settings?: Record<string, any>
}

export default defineEventHandler(async (event) => {
  const tenant = await requireAdmin(event)
  const companyId = tenant.companyId

  const body = await readBody<UpdateCompanyBody>(event)
  if (!body) {
    throw createError({ status: 400, statusText: 'Request body required' })
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (body.name !== undefined) {
    if (!body.name.trim()) {
      throw createError({ status: 400, statusText: 'Nama organisasi tidak boleh kosong' })
    }
    updatePayload.name = body.name.trim()
  }

  if (body.address !== undefined) {
    updatePayload.address = body.address ? body.address.trim() : null
  }

  if (body.phone !== undefined) {
    updatePayload.phone = body.phone ? body.phone.trim() : null
  }

  if (body.logo_url !== undefined) {
    updatePayload.logo_url = body.logo_url ? body.logo_url.trim() : null
  }

  if (body.settings !== undefined) {
    updatePayload.settings = body.settings
  }

  const client = serverSupabaseServiceRole(event)
  const { data: updated, error } = await client
    .from('companies')
    .update(updatePayload)
    .eq('id', companyId)
    .select()
    .single()

  if (error) throw createError({ status: 500, statusText: error.message })

  invalidateCompanyProfileCache(companyId)
  return { success: true, company: updated }
})
