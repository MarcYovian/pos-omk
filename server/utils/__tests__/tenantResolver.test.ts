import { describe, it, expect, beforeEach, vi } from 'vitest'
import { resolveActiveCompany, SUPER_ADMIN_EMAIL } from '../tenantResolver'

const mockResolveAuthUser = vi.fn()
const mockServerSupabaseServiceRole = vi.fn()
const mockGetRequestHeader = vi.fn()
const mockCreateError = vi.fn()

vi.mock('../rbacCache', () => ({
  resolveAuthUser: (...args: unknown[]) => mockResolveAuthUser(...args),
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: (...args: unknown[]) => mockServerSupabaseServiceRole(...args),
}))

vi.stubGlobal('getRequestHeader', mockGetRequestHeader)
vi.stubGlobal('createError', mockCreateError)

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

describe('tenantResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateError.mockImplementation(makeCreateError())
  })

  it('returns cached event.context.tenant if already present', async () => {
    const existingTenant = {
      companyId: 'comp-123',
      companyName: 'Paroki Test',
      companySlug: 'paroki-test',
      roleCode: 'admin',
      isSuperAdmin: false,
    }
    const event = mockEvent({ context: { tenant: existingTenant } })

    const result = await resolveActiveCompany(event)
    expect(result).toBe(existingTenant)
    expect(mockResolveAuthUser).not.toHaveBeenCalled()
  })

  it('throws 401 when user is not authenticated', async () => {
    mockResolveAuthUser.mockResolvedValue(null)
    const event = mockEvent()

    await expect(resolveActiveCompany(event)).rejects.toThrow('Unauthorized: Sesi tidak ditemukan')
  })

  it('resolves active company for regular user via X-Company-Id header', async () => {
    const regularUser = { id: 'user-1', email: 'cashier@test.com' }
    mockResolveAuthUser.mockResolvedValue(regularUser)
    mockGetRequestHeader.mockReturnValue('comp-header-id')

    const mockMembership = {
      company_id: 'comp-header-id',
      is_active: true,
      roles: { code: 'cashier' },
      companies: { id: 'comp-header-id', name: 'Paroki Header', slug: 'paroki-header', is_active: true },
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockMembership, error: null }),
      }),
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const event = mockEvent()
    const result = await resolveActiveCompany(event)

    expect(result).toMatchObject({
      companyId: 'comp-header-id',
      companyName: 'Paroki Header',
      companySlug: 'paroki-header',
      roleCode: 'cashier',
      isSuperAdmin: false,
    })
    expect(event.context.tenant).toBeDefined()
  })

  it('resolves any company for Super Admin via X-Company-Id header', async () => {
    const superAdminUser = { id: 'super-1', email: SUPER_ADMIN_EMAIL }
    mockResolveAuthUser.mockResolvedValue(superAdminUser)
    mockGetRequestHeader.mockReturnValue('any-comp-id')

    const mockCompany = {
      id: 'any-comp-id',
      name: 'Any Paroki',
      slug: 'any-paroki',
      is_active: true,
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockCompany, error: null }),
      }),
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const event = mockEvent()
    const result = await resolveActiveCompany(event)

    expect(result).toMatchObject({
      companyId: 'any-comp-id',
      companyName: 'Any Paroki',
      companySlug: 'any-paroki',
      roleCode: 'admin',
      isSuperAdmin: true,
    })
  })

  it('falls back to default membership if no X-Company-Id header provided', async () => {
    const regularUser = { id: 'user-2', email: 'user2@test.com' }
    mockResolveAuthUser.mockResolvedValue(regularUser)
    mockGetRequestHeader.mockReturnValue(undefined)

    const defaultMembership = {
      company_id: 'default-comp-id',
      roles: { code: 'admin' },
      companies: { id: 'default-comp-id', name: 'Default Paroki', slug: 'default-paroki', is_active: true },
    }

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: defaultMembership, error: null }),
      }),
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const event = mockEvent()
    const result = await resolveActiveCompany(event)

    expect(result).toMatchObject({
      companyId: 'default-comp-id',
      companyName: 'Default Paroki',
      companySlug: 'default-paroki',
      roleCode: 'admin',
      isSuperAdmin: false,
    })
  })

  it('throws 403 when regular user is not a member of any active company', async () => {
    const regularUser = { id: 'user-unassigned', email: 'orphan@test.com' }
    mockResolveAuthUser.mockResolvedValue(regularUser)
    mockGetRequestHeader.mockReturnValue(undefined)

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const event = mockEvent()
    await expect(resolveActiveCompany(event)).rejects.toThrow('Forbidden: Anda tidak terdaftar aktif di organisasi manapun.')
  })
})
