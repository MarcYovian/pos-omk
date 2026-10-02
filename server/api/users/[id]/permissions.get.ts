import { serverSupabaseServiceRole } from '#supabase/server'
import type { UserPermissionsResponse, UserPermissionOverrideItem } from '~/shared/types/users'
import { getCachedUserPermissionsDetail, setCachedUserPermissionsDetail } from '../../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users:manage')

  const userId = getRouterParam(event, 'id')
  if (!userId) throw createError({ status: 400, statusText: 'User ID wajib disertakan' })

  setHeader(event, 'Cache-Control', 'private, max-age=60, stale-while-revalidate=120')

  const cached = getCachedUserPermissionsDetail(userId)
  if (cached) {
    return cached as UserPermissionsResponse
  }

  const client = serverSupabaseServiceRole(event)

  // 1. Fetch user from Supabase Auth
  const { data: userData, error: userError } = await client.auth.admin.getUserById(userId)
  if (userError || !userData.user) {
    throw createError({ status: 404, statusText: 'Pengguna tidak ditemukan' })
  }

  // 2. Fetch user's current role
  const { data: userRoleData } = await client
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
    .single()

  const currentRole = (userRoleData?.roles as any) || {
    id: '',
    code: userData.user.user_metadata?.role || 'cashier',
    name: userData.user.user_metadata?.role === 'admin' ? 'Administrator' : 'Kasir',
    role_permissions: [],
  }

  const rolePermissionCodes = new Set<string>(
    (currentRole.role_permissions || []).map((rp: any) => rp.permissions?.code).filter(Boolean)
  )

  // 3. Fetch user overrides
  const { data: overridesData } = await client
    .from('user_permissions')
    .select('permission_id, is_granted')
    .eq('user_id', userId)

  const overridesMap = new Map<string, boolean>()
  for (const item of (overridesData || [])) {
    overridesMap.set(item.permission_id, item.is_granted)
  }

  // 4. Fetch effective permissions via RPC
  const { data: effectiveData } = await client.rpc('get_user_effective_permissions', {
    p_user_id: userId
  })
  const effectivePermissions = ((effectiveData as any[]) || []).map(p => p.permission_code)

  // 5. Fetch all permissions catalog
  const { data: allPerms } = await client
    .from('permissions')
    .select('id, code, name, module, description')
    .order('module', { ascending: true })
    .order('code', { ascending: true })

  const permissionsList: UserPermissionOverrideItem[] = (allPerms || []).map(p => {
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

  setCachedUserPermissionsDetail(userId, response)
  return response
})
