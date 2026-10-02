import type { H3Event } from 'h3'
import { resolveActiveCompany } from './tenantResolver'

export async function requireAdmin(event: H3Event) {
  const tenant = await resolveActiveCompany(event)

  if (!tenant.isSuperAdmin && tenant.roleCode !== 'admin') {
    throw createError({
      status: 403,
      statusText: 'Forbidden: Tindakan ini memerlukan hak akses Administrator pada organisasi ini'
    })
  }

  return tenant
}
