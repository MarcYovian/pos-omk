import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockCreateError = vi.fn()
const mockReadBody = vi.fn()
const mockGetRouterParam = vi.fn()
const mockSetResponseStatus = vi.fn()
const mockGetRequestProtocol = vi.fn()
const mockGetRequestHost = vi.fn()
const mockRequireAdmin = vi.fn()
const mockServerSupabaseServiceRole = vi.fn()
const mockGeneratePassword = vi.fn()

vi.stubGlobal('generatePassword', mockGeneratePassword)

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: (...args: unknown[]) => mockServerSupabaseServiceRole(...args),
}))

vi.stubGlobal('defineEventHandler', (cb: Function) => cb)
vi.stubGlobal('createError', mockCreateError)
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('getRouterParam', mockGetRouterParam)
vi.stubGlobal('setResponseStatus', mockSetResponseStatus)
vi.stubGlobal('getRequestProtocol', mockGetRequestProtocol)
vi.stubGlobal('getRequestHost', mockGetRequestHost)
vi.stubGlobal('requireAdmin', mockRequireAdmin)

function mockEvent(overrides: Record<string, unknown> = {}) {
  return { context: {}, ...overrides } as any
}

function makeCreateError() {
  return (opts: { status: number; statusText: string }) => {
    const err = new Error(opts.statusText) as Error & { statusCode: number; statusMessage: string }
    err.statusCode = opts.status
    err.statusMessage = opts.statusText
    throw err
  }
}

describe('GET /api/users', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateError.mockImplementation(makeCreateError())
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
  })

  it('returns list of users on success', async () => {
    const fakeUsers = [
      {
        id: 'user-1',
        email: 'cashier@test.com',
        user_metadata: { role: 'cashier', is_active: true },
        created_at: '2025-01-01T00:00:00Z',
        last_sign_in_at: '2025-06-01T00:00:00Z',
        email_confirmed_at: '2025-01-02T00:00:00Z',
      },
      {
        id: 'user-2',
        email: 'admin@test.com',
        user_metadata: { role: 'admin', is_active: true },
        created_at: '2025-01-01T00:00:00Z',
        last_sign_in_at: null,
        email_confirmed_at: null,
      },
    ]
    const mockClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({ data: { users: fakeUsers }, error: null }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../index.get')).default
    const result = await handler(mockEvent())

    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      id: 'user-1',
      email: 'cashier@test.com',
      role: 'cashier',
      is_active: true,
    })
    expect(result[1]).toMatchObject({
      id: 'user-2',
      email: 'admin@test.com',
      role: 'admin',
      is_active: true,
    })
  })

  it('defaults role to cashier when metadata role is invalid', async () => {
    const fakeUsers = [
      {
        id: 'user-1',
        email: 'test@test.com',
        user_metadata: { role: 'superadmin' },
        created_at: '2025-01-01T00:00:00Z',
        last_sign_in_at: null,
        email_confirmed_at: null,
      },
    ]
    const mockClient = {
      auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: fakeUsers }, error: null }) } },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../index.get')).default
    const result = await handler(mockEvent())

    expect(result[0].role).toBe('cashier')
  })

  it('defaults is_active to true when metadata is missing', async () => {
    const fakeUsers = [
      {
        id: 'user-1',
        email: 'test@test.com',
        user_metadata: {},
        created_at: '2025-01-01T00:00:00Z',
        last_sign_in_at: null,
        email_confirmed_at: null,
      },
    ]
    const mockClient = {
      auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: fakeUsers }, error: null }) } },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../index.get')).default
    const result = await handler(mockEvent())

    expect(result[0].is_active).toBe(true)
  })

  it('handles null email gracefully', async () => {
    const fakeUsers = [
      {
        id: 'user-1',
        email: null,
        user_metadata: { role: 'cashier', is_active: true },
        created_at: '2025-01-01T00:00:00Z',
        last_sign_in_at: null,
        email_confirmed_at: null,
      },
    ]
    const mockClient = {
      auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: { users: fakeUsers }, error: null }) } },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../index.get')).default
    const result = await handler(mockEvent())

    expect(result[0].email).toBe('')
  })

  it('throws 500 when Supabase listUsers fails', async () => {
    const mockClient = {
      auth: { admin: { listUsers: vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') }) } },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../index.get')).default
    await expect(handler(mockEvent())).rejects.toThrow('DB error')
  })

  it('throws when requireAdmin fails', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('Unauthorized'))

    const handler = (await import('../index.get')).default
    await expect(handler(mockEvent())).rejects.toThrow('Unauthorized')
  })
})

describe('POST /api/users', () => {
  const VALID_BODY = { email: 'newuser@test.com', role: 'cashier' as const }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateError.mockImplementation(makeCreateError())
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
    mockReadBody.mockResolvedValue(VALID_BODY)
    mockGetRequestProtocol.mockReturnValue('https')
    mockGetRequestHost.mockReturnValue('example.com')
    mockGeneratePassword.mockReturnValue('Ab3xK9mP')
  })

  it('creates user and returns user data on success', async () => {
    const mockClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-id', email: 'newuser@test.com', created_at: '2025-06-01T00:00:00Z' } },
            error: null,
          }),
          generateLink: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../index.post')).default
    const result = await handler(mockEvent())

    expect(result).toMatchObject({
      id: 'new-id',
      email: 'newuser@test.com',
      role: 'cashier',
      is_active: true,
    })
    expect(result.password).toBe('Ab3xK9mP')
    expect(result.last_sign_in_at).toBeNull()
    expect(result.email_confirmed_at).toBeNull()
    expect(mockSetResponseStatus).toHaveBeenCalledWith(expect.anything(), 201)
  })

  it('passes correct payload to createUser', async () => {
    const createUserMock = vi.fn().mockResolvedValue({
      data: { user: { id: 'new-id', email: 'newuser@test.com', created_at: '' } },
      error: null,
    })
    const mockClient = {
      auth: {
        admin: {
          createUser: createUserMock,
          generateLink: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../index.post')).default
    await handler(mockEvent())

    const callArgs = createUserMock.mock.calls[0][0]
    expect(callArgs.email).toBe('newuser@test.com')
    expect(callArgs.password).toBeDefined()
    expect(typeof callArgs.password).toBe('string')
    expect(callArgs.email_confirm).toBe(false)
    expect(callArgs.user_metadata).toEqual({ role: 'cashier', is_active: true, force_password_change: true })
  })

  it('sends reset password link after creation', async () => {
    const generateLinkMock = vi.fn().mockResolvedValue({ data: {}, error: null })
    const mockClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-id', email: 'newuser@test.com', created_at: '' } },
            error: null,
          }),
          generateLink: generateLinkMock,
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../index.post')).default
    await handler(mockEvent())

    expect(generateLinkMock).toHaveBeenCalledWith({
      type: 'recovery',
      email: 'newuser@test.com',
      options: { redirectTo: 'https://example.com/reset-password' },
    })
  })

  it('warns but does not fail when generateLink fails', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mockClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-id', email: 'newuser@test.com', created_at: '' } },
            error: null,
          }),
          generateLink: vi.fn().mockResolvedValue({ data: null, error: new Error('Email service down') }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../index.post')).default
    const result = await handler(mockEvent())

    expect(result).toBeDefined()
    expect(result.id).toBe('new-id')
    expect(consoleWarnSpy).toHaveBeenCalled()
    consoleWarnSpy.mockRestore()
  })

  it('throws 400 when email is missing', async () => {
    mockReadBody.mockResolvedValue({ email: '', role: 'cashier' })

    const handler = (await import('../index.post')).default
    await expect(handler(mockEvent())).rejects.toThrow('Email is required')
  })

  it('throws 400 when role is invalid', async () => {
    mockReadBody.mockResolvedValue({ email: 'test@test.com', role: 'manager' })

    const handler = (await import('../index.post')).default
    await expect(handler(mockEvent())).rejects.toThrow('Role must be admin or cashier')
  })

  it('throws 500 when Supabase createUser fails', async () => {
    const mockClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({ data: null, error: new Error('Email already registered') }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../index.post')).default
    await expect(handler(mockEvent())).rejects.toThrow('Email already registered')
  })
})

describe('PATCH /api/users/[id]', () => {
  const VALID_BODY = { email: 'updated@test.com', role: 'admin' as const }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateError.mockImplementation(makeCreateError())
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
    mockGetRouterParam.mockReturnValue('user-123')
    mockReadBody.mockResolvedValue(VALID_BODY)
  })

  it('updates user and returns success', async () => {
    const updateUserMock = vi.fn().mockResolvedValue({ error: null })
    const mockClient = {
      auth: { admin: { updateUserById: updateUserMock } },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/index.patch')).default
    const result = await handler(mockEvent())

    expect(result).toEqual({ success: true })
    expect(updateUserMock).toHaveBeenCalledWith('user-123', {
      email: 'updated@test.com',
      user_metadata: { role: 'admin' },
    })
  })

  it('includes password in update payload when provided', async () => {
    mockReadBody.mockResolvedValue({ email: 'test@test.com', password: 'newpass123', role: 'cashier' })
    const updateUserMock = vi.fn().mockResolvedValue({ error: null })
    const mockClient = {
      auth: { admin: { updateUserById: updateUserMock } },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/index.patch')).default
    await handler(mockEvent())

    expect(updateUserMock).toHaveBeenCalledWith('user-123', {
      email: 'test@test.com',
      password: 'newpass123',
      user_metadata: { role: 'cashier' },
    })
  })

  it('does not include password in payload when empty string', async () => {
    mockReadBody.mockResolvedValue({ email: 'test@test.com', password: '', role: 'cashier' })
    const updateUserMock = vi.fn().mockResolvedValue({ error: null })
    const mockClient = {
      auth: { admin: { updateUserById: updateUserMock } },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/index.patch')).default
    await handler(mockEvent())

    const payload = updateUserMock.mock.calls[0][1]
    expect(payload.password).toBeUndefined()
  })

  it('throws 400 when userId is missing', async () => {
    mockGetRouterParam.mockReturnValue(null)

    const handler = (await import('../[id]/index.patch')).default
    await expect(handler(mockEvent())).rejects.toThrow('User ID is required')
  })

  it('throws 400 when email is empty string', async () => {
    mockReadBody.mockResolvedValue({ email: '  ' })

    const handler = (await import('../[id]/index.patch')).default
    await expect(handler(mockEvent())).rejects.toThrow('Email cannot be empty')
  })

  it('throws 400 when no fields to update', async () => {
    mockReadBody.mockResolvedValue({})

    const handler = (await import('../[id]/index.patch')).default
    await expect(handler(mockEvent())).rejects.toThrow('No fields to update')
  })

  it('throws 500 when Supabase update fails', async () => {
    const mockClient = {
      auth: { admin: { updateUserById: vi.fn().mockResolvedValue({ error: new Error('Update failed') }) } },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/index.patch')).default
    await expect(handler(mockEvent())).rejects.toThrow('Update failed')
  })
})

describe('DELETE /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateError.mockImplementation(makeCreateError())
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
    mockGetRouterParam.mockReturnValue('user-123')
  })

  it('deletes user and returns success', async () => {
    const deleteUserMock = vi.fn().mockResolvedValue({ error: null })
    const mockClient = {
      auth: { admin: { deleteUser: deleteUserMock } },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/index.delete')).default
    const result = await handler(mockEvent())

    expect(result).toEqual({ success: true })
    expect(deleteUserMock).toHaveBeenCalledWith('user-123')
  })

  it('throws 400 when userId is missing', async () => {
    mockGetRouterParam.mockReturnValue(null)

    const handler = (await import('../[id]/index.delete')).default
    await expect(handler(mockEvent())).rejects.toThrow('User ID is required')
  })

  it('throws 400 when deleting own account', async () => {
    mockGetRouterParam.mockReturnValue('admin-1')

    const handler = (await import('../[id]/index.delete')).default
    await expect(handler(mockEvent())).rejects.toThrow('Cannot delete your own account')
  })

  it('throws 500 when Supabase delete fails', async () => {
    const mockClient = {
      auth: { admin: { deleteUser: vi.fn().mockResolvedValue({ error: new Error('Delete failed') }) } },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/index.delete')).default
    await expect(handler(mockEvent())).rejects.toThrow('Delete failed')
  })
})

describe('PATCH /api/users/[id]/toggle-active', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateError.mockImplementation(makeCreateError())
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'marcellinusyovian@gmail.com' })
    mockGetRouterParam.mockReturnValue('user-123')
    mockReadBody.mockResolvedValue({ is_active: false })
  })

  it('toggles active status and returns success', async () => {
    const updateUserMock = vi.fn().mockResolvedValue({ error: null })
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'cashier@test.com' } },
            error: null,
          }),
          updateUserById: updateUserMock,
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/toggle-active.patch')).default
    const result = await handler(mockEvent())

    expect(result).toEqual({ success: true })
    expect(updateUserMock).toHaveBeenCalledWith('user-123', {
      user_metadata: { is_active: false },
    })
  })

  it('throws 400 when userId is missing', async () => {
    mockGetRouterParam.mockReturnValue(null)

    const handler = (await import('../[id]/toggle-active.patch')).default
    await expect(handler(mockEvent())).rejects.toThrow('User ID is required')
  })

  it('throws 400 when is_active is not boolean', async () => {
    mockReadBody.mockResolvedValue({ is_active: 'yes' })

    const handler = (await import('../[id]/toggle-active.patch')).default
    await expect(handler(mockEvent())).rejects.toThrow('is_active must be a boolean')
  })

  it('throws 403 when requester is not super admin', async () => {
    mockRequireAdmin.mockResolvedValue({ id: 'admin-2', email: 'regular@test.com' })

    const handler = (await import('../[id]/toggle-active.patch')).default
    await expect(handler(mockEvent())).rejects.toThrow('Only super admin can toggle user active status')
  })

  it('throws 400 when target user is super admin', async () => {
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'super', email: 'marcellinusyovian@gmail.com' } },
            error: null,
          }),
          updateUserById: vi.fn(),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)
    mockGetRouterParam.mockReturnValue('super')

    const handler = (await import('../[id]/toggle-active.patch')).default
    await expect(handler(mockEvent())).rejects.toThrow('Cannot toggle super admin status')
  })

  it('throws 500 when Supabase update fails', async () => {
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'cashier@test.com' } },
            error: null,
          }),
          updateUserById: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/toggle-active.patch')).default
    await expect(handler(mockEvent())).rejects.toThrow('Update failed')
  })
})

describe('POST /api/users/[id]/send-reset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateError.mockImplementation(makeCreateError())
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
    mockGetRouterParam.mockReturnValue('user-123')
    mockGetRequestProtocol.mockReturnValue('https')
    mockGetRequestHost.mockReturnValue('example.com')
  })

  it('sends reset link and returns email', async () => {
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'cashier@test.com' } },
            error: null,
          }),
          generateLink: vi.fn().mockResolvedValue({
            data: { properties: {} },
            error: null,
          }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/send-reset.post')).default
    const result = await handler(mockEvent())

    expect(result).toEqual({ success: true, email: 'cashier@test.com' })
  })

  it('uses correct redirect URL', async () => {
    const generateLinkMock = vi.fn().mockResolvedValue({ data: {}, error: null })
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'cashier@test.com' } },
            error: null,
          }),
          generateLink: generateLinkMock,
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/send-reset.post')).default
    await handler(mockEvent())

    expect(generateLinkMock).toHaveBeenCalledWith({
      type: 'recovery',
      email: 'cashier@test.com',
      options: { redirectTo: 'https://example.com/reset-password' },
    })
  })

  it('throws 400 when userId is missing', async () => {
    mockGetRouterParam.mockReturnValue(null)

    const handler = (await import('../[id]/send-reset.post')).default
    await expect(handler(mockEvent())).rejects.toThrow('User ID is required')
  })

  it('throws 404 when user is not found', async () => {
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Not found'),
          }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/send-reset.post')).default
    await expect(handler(mockEvent())).rejects.toThrow('User not found')
  })

  it('throws 404 when user has no email', async () => {
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: null } },
            error: null,
          }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/send-reset.post')).default
    await expect(handler(mockEvent())).rejects.toThrow('User not found')
  })

  it('throws 500 when Supabase generateLink fails', async () => {
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'cashier@test.com' } },
            error: null,
          }),
          generateLink: vi.fn().mockResolvedValue({ data: null, error: new Error('Email error') }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/send-reset.post')).default
    await expect(handler(mockEvent())).rejects.toThrow('Email error')
  })
})

describe('POST /api/users/[id]/password-changed', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateError.mockImplementation(makeCreateError())
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
    mockGetRouterParam.mockReturnValue('user-123')
  })

  it('clears force_password_change flag and returns success', async () => {
    const updateUserMock = vi.fn().mockResolvedValue({ error: null })
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'cashier@test.com', user_metadata: { role: 'cashier', is_active: true, force_password_change: true } } },
            error: null,
          }),
          updateUserById: updateUserMock,
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/password-changed.post')).default
    const result = await handler(mockEvent())

    expect(result).toEqual({ success: true })
    expect(updateUserMock).toHaveBeenCalledWith('user-123', {
      user_metadata: { role: 'cashier', is_active: true, force_password_change: false },
    })
  })

  it('throws 400 when userId is missing', async () => {
    mockGetRouterParam.mockReturnValue(null)

    const handler = (await import('../[id]/password-changed.post')).default
    await expect(handler(mockEvent())).rejects.toThrow('User ID is required')
  })

  it('throws 404 when user not found', async () => {
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/password-changed.post')).default
    await expect(handler(mockEvent())).rejects.toThrow('User not found')
  })

  it('throws 500 when Supabase update fails', async () => {
    const mockClient = {
      auth: {
        admin: {
          getUserById: vi.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'cashier@test.com', user_metadata: {} } },
            error: null,
          }),
          updateUserById: vi.fn().mockResolvedValue({ error: new Error('Update failed') }),
        },
      },
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../[id]/password-changed.post')).default
    await expect(handler(mockEvent())).rejects.toThrow('Update failed')
  })
})
