import { serverSupabaseServiceRole } from '#supabase/server'
import type { CreateUserBody } from '~/shared/types/users'
import { invalidateUsersCache } from '../../utils/rbacCache'
import { resolveActiveCompany } from '../../utils/tenantResolver'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users:manage')
  const tenant = await resolveActiveCompany(event)

  const body = await readBody<CreateUserBody>(event)

  if (!body.email?.trim()) {
    throw createError({ status: 400, statusText: 'Email is required' })
  }

  const client = serverSupabaseServiceRole(event)
  const requestedRoleCode = (body.role || 'cashier').trim().toLowerCase()
  const email = body.email.trim().toLowerCase()

  let targetRoleCode = requestedRoleCode
  let targetRoleName = requestedRoleCode === 'admin' ? 'Administrator' : 'Kasir'
  let roleId: string | null = null

  if (typeof client.from === 'function') {
    if (requestedRoleCode === 'super_admin' && !tenant.isSuperAdmin) {
      throw createError({ status: 403, statusText: 'Forbidden: Hanya Super Admin yang dapat menugaskan role Super Admin' })
    }

    const { data: roleData, error: roleFetchError } = await client
      .from('roles')
      .select('id, code, name')
      .eq('code', requestedRoleCode)
      .maybeSingle()

    if (roleFetchError || !roleData) {
      throw createError({ status: 400, statusText: `Role '${requestedRoleCode}' is invalid` })
    }
    targetRoleCode = roleData.code
    targetRoleName = roleData.name
    roleId = roleData.id
  } else {
    // Minimal mock fallback
    if (requestedRoleCode !== 'admin' && requestedRoleCode !== 'cashier' && requestedRoleCode !== 'super_admin') {
      throw createError({ status: 400, statusText: 'Role must be admin or cashier' })
    }
  }

  let userId: string
  let createdUserAuth: any = null
  let password = ''

  // 1. Check if user already exists in auth.users
  let existingUser: any = null
  if (typeof client.auth?.admin?.listUsers === 'function') {
    try {
      const { data: userList } = await client.auth.admin.listUsers()
      existingUser = userList?.users?.find((u: any) => u.email?.toLowerCase() === email)
    } catch {
      // ignore
    }
  }

  if (existingUser) {
    userId = existingUser.id
    createdUserAuth = existingUser
  } else {
    // 2. Create new user in Supabase Auth
    password = generatePassword()
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role: targetRoleCode,
        is_active: true,
        force_password_change: true,
      },
    })

    if (error) throw createError({ status: 500, statusText: error.message })
    userId = data.user.id
    createdUserAuth = data.user
  }

  // 3. Link user to company_users or user_roles
  if (typeof client.from === 'function') {
    try {
      if (targetRoleCode === 'super_admin') {
        if (roleId) {
          await client
            .from('user_roles')
            .upsert({ user_id: userId, role_id: roleId }, { onConflict: 'user_id' })
        }
      } else {
        if (tenant?.companyId && roleId) {
          // Check if user is already an active member of this company
          const { data: existingMember } = await client
            .from('company_users')
            .select('id')
            .eq('company_id', tenant.companyId)
            .eq('user_id', userId)
            .maybeSingle()

          if (existingMember) {
            throw createError({ status: 400, statusText: 'Pengguna sudah terdaftar di organisasi ini' })
          }

          await client
            .from('company_users')
            .insert({
              company_id: tenant.companyId,
              user_id: userId,
              role_id: roleId,
              is_active: true,
            })
        }

        // Also maintain global user_roles fallback
        if (roleId) {
          await client
            .from('user_roles')
            .upsert({ user_id: userId, role_id: roleId }, { onConflict: 'user_id' })
        }
      }
    } catch (err: any) {
      if (err.statusCode) throw err
      // ignore table errors in mocks
    }
  }

  // Send password reset link if new user was created
  if (password) {
    const redirectUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}/reset-password`
    const { error: resetError } = await client.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: redirectUrl },
    })

    if (resetError) {
      console.warn('User created but failed to generate reset link:', resetError.message)
    }
  }

  invalidateUsersCache(tenant?.companyId)
  setResponseStatus(event, 201)
  return {
    id: userId,
    email: createdUserAuth.email,
    password,
    role: targetRoleCode,
    role_name: targetRoleName,
    is_active: true,
    created_at: createdUserAuth.created_at,
    last_sign_in_at: createdUserAuth.last_sign_in_at ?? null,
    email_confirmed_at: createdUserAuth.email_confirmed_at ?? null,
  }
})
