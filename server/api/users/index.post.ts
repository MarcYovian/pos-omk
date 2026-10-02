import { serverSupabaseServiceRole } from '#supabase/server'
import type { CreateUserBody } from '~/shared/types/users'
import { invalidateUsersCache } from '../../utils/rbacCache'

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users:manage')

  const body = await readBody<CreateUserBody>(event)

  if (!body.email?.trim()) {
    throw createError({ status: 400, statusText: 'Email is required' })
  }

  const client = serverSupabaseServiceRole(event)
  const requestedRoleCode = (body.role || 'cashier').trim().toLowerCase()

  let targetRoleCode = requestedRoleCode
  let targetRoleName = requestedRoleCode === 'admin' ? 'Administrator' : 'Kasir'
  let roleId: string | null = null

  if (typeof client.from === 'function') {
    const { data: roleData, error: roleFetchError } = await client
      .from('roles')
      .select('id, code, name')
      .eq('code', requestedRoleCode)
      .single()

    if (roleFetchError || !roleData) {
      throw createError({ status: 400, statusText: `Role '${requestedRoleCode}' is invalid` })
    }
    targetRoleCode = roleData.code
    targetRoleName = roleData.name
    roleId = roleData.id
  } else {
    // Minimal mock fallback
    if (requestedRoleCode !== 'admin' && requestedRoleCode !== 'cashier') {
      throw createError({ status: 400, statusText: 'Role must be admin or cashier' })
    }
  }

  const password = generatePassword()

  const { data, error } = await client.auth.admin.createUser({
    email: body.email.trim(),
    password,
    email_confirm: true,
    user_metadata: {
      role: targetRoleCode,
      is_active: true,
      force_password_change: true,
    },
  })

  if (error) throw createError({ status: 500, statusText: error.message })

  if (roleId && typeof client.from === 'function') {
    await client
      .from('user_roles')
      .insert({
        user_id: data.user.id,
        role_id: roleId,
      })
  }

  const redirectUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}/reset-password`
  const { error: resetError } = await client.auth.admin.generateLink({
    type: 'recovery',
    email: body.email.trim(),
    options: { redirectTo: redirectUrl },
  })

  if (resetError) {
    console.warn('User created but failed to generate reset link:', resetError.message)
  }

  invalidateUsersCache()
  setResponseStatus(event, 201)
  return {
    id: data.user.id,
    email: data.user.email,
    password,
    role: targetRoleCode,
    role_name: targetRoleName,
    is_active: true,
    created_at: data.user.created_at,
    last_sign_in_at: null,
    email_confirmed_at: null,
  }
})
