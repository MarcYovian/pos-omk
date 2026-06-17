import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = await readBody<CreateUserBody>(event)

  if (!body.email?.trim()) {
    throw createError({ status: 400, statusText: 'Email is required' })
  }
  if (body.role !== 'admin' && body.role !== 'cashier') {
    throw createError({ status: 400, statusText: 'Role must be admin or cashier' })
  }

  const client = serverSupabaseServiceRole(event)
  const password = generatePassword()

  const { data, error } = await client.auth.admin.createUser({
    email: body.email.trim(),
    password,
    email_confirm: false,
    user_metadata: {
      role: body.role,
      is_active: true,
      force_password_change: true,
    },
  })

  if (error) throw createError({ status: 500, statusText: error.message })

  const redirectUrl = `${getRequestProtocol(event)}://${getRequestHost(event)}/reset-password`
  const { error: resetError } = await client.auth.admin.generateLink({
    type: 'recovery',
    email: body.email.trim(),
    options: { redirectTo: redirectUrl },
  })

  if (resetError) {
    console.warn('User created but failed to generate reset link:', resetError.message)
  }

  setResponseStatus(event, 201)
  return {
    id: data.user.id,
    email: data.user.email,
    password,
    role: body.role,
    is_active: true,
    created_at: data.user.created_at,
    last_sign_in_at: null,
    email_confirmed_at: null,
  }
})
