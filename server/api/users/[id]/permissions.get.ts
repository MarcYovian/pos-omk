import { serverSupabaseServiceRole } from '#supabase/server'
import type { UserPermissionsResponse, UserPermissionOverrideItem } from '~/shared/types/users'
import { getCachedUserPermissionsDetail, setCachedUserPermissionsDetail } from '../../../utils/rbacCache'
import { resolveActiveCompany } from '../../../utils/tenantResolver'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users:manage')
  const tenant = await resolveActiveCompany(event)
  const companyId = tenant?.companyId

  const userId = getRouterParam(event, 'id')
  if (!userId) throw createError({ status: 400, statusText: 'User ID wajib disertakan' })

  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=120')

  const cached = getCachedUserPermissionsDetail(userId, companyId)
  if (cached) {
    return cached as UserPermissionsResponse
  }

  const client = serverSupabaseServiceRole(event)

  // 1. Fetch user from Supabase Auth
  const { data: userData, error: userError } = await client.auth.admin.getUserById(userId)
  if (userError || !userData.user) {
    throw createError({ status: 404, statusText: 'Pengguna tidak ditemukan' })
  }

  // 2. Fetch user's current role in active company (with fallback to user_roles)
  let currentRole: any = null

  if (companyId) {
    try {
      const { data: compUser } = await client
        .from('company_users')
        .select(`
          roles (
            id,
            code,
            name,
            role_permissions (
              permissions (
                code
              )
            )
          )
        `)
        .eq('company_id', companyId)
        .eq('user_id', userId)
        .maybeSingle()

      if (compUser?.roles) {
        currentRole = compUser.roles
      }
    } catch {
      // ignore
    }
  }

  if (!currentRole) {
    try {
      const q = client
        .from('user_roles')
        .select(`
          roles (
            id,
            code,
            name,
            role_permissions (
              permissions (
                code
              )
            )
          )
        `)
        .eq('user_id', userId)

      const res = typeof (q as any)?.maybeSingle === 'function'
        ? await (q as any).maybeSingle()
        : await (q as any).single()

      if (res?.data?.roles) {
        currentRole = res.data.roles
      }
    } catch {
      // ignore
    }

    if (!currentRole) {
      currentRole = {
        id: '',
        code: userData.user.user_metadata?.role || 'cashier',
        name: userData.user.user_metadata?.role === 'admin' ? 'Administrator' : 'Kasir',
        role_permissions: [],
      }
    }
  }

  const rolePermissionCodes = new Set<string>(
    (currentRole.role_permissions || []).map((rp: any) => rp.permissions?.code).filter(Boolean)
  )

  // 3. Fetch user overrides for this company
  let overridesQuery = client
    .from('user_permissions')
    .select('permission_id, is_granted')
    .eq('user_id', userId)

  if (companyId && typeof (overridesQuery as any)?.eq === 'function') {
    try {
      overridesQuery = (overridesQuery as any).eq('company_id', companyId)
    } catch {
      // ignore
    }
  }

  const { data: overridesData } = await overridesQuery

  const overridesMap = new Map<string, boolean>()
  for (const item of (overridesData || [])) {
    overridesMap.set(item.permission_id, item.is_granted)
  }

  // 4. Fetch effective permissions via RPC
  const rpcParams: Record<string, any> = { p_user_id: userId }
  if (companyId) {
    rpcParams.p_company_id = companyId
  }
  const { data: effectiveData } = await client.rpc('get_user_effective_permissions', rpcParams)
  const effectivePermissions = ((effectiveData as any[]) || []).map((p: any) => p.permission_code)

  // 5. Fetch all permissions catalog
  const { data: allPerms } = await client
    .from('permissions')
    .select('id, code, name, module, description')
    .order('module', { ascending: true })
    .order('code', { ascending: true })

  const permissionsList: UserPermissionOverrideItem[] = (allPerms || []).map((p: any) => {
    const isOverridden = overridesMap.has(p.id)
    const isGrantedOverride = isOverridden ? overridesMap.get(p.id)! : null
    const inherited = rolePermissionCodes.has(p.code) || currentRole.code === 'admin'

    return {
      permission_id: p.id,
      code: p.code,
      name: p.name,
      module: p.module,
      inherited_from_role: inherited,
      is_granted: isGrantedOverride,
    }
  })

  const response: UserPermissionsResponse = {
    user_id: userId,
    email: userData.user.email || '',
    role_code: currentRole.code,
    role_name: currentRole.name,
    effective_permissions: effectivePermissions,
    permissions: permissionsList,
  }

  setCachedUserPermissionsDetail(userId, companyId || '', response)
  return response
})
