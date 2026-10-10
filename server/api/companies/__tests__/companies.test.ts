import { describe, it, expect, beforeEach, vi } from 'vitest'
import { clearAllRbacCache } from '../../../utils/rbacCache'

const mockCreateError = vi.fn()
const mockReadBody = vi.fn()
const mockGetRouterParam = vi.fn()
const mockSetResponseStatus = vi.fn()
const mockResolveAuthUser = vi.fn()
const mockResolveActiveCompany = vi.fn()
const mockRequireAdmin = vi.fn()
const mockCheckUserIsSuperAdmin = vi.fn()
const mockServerSupabaseServiceRole = vi.fn()

vi.mock('../../../utils/rbacCache', async () => {
  const actual = await vi.importActual('../../../utils/rbacCache')
  return {
    ...actual,
    resolveAuthUser: (...args: unknown[]) => mockResolveAuthUser(...args),
  }
})

vi.mock('../../../utils/tenantResolver', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/tenantResolver')>()
  return {
    ...actual,
    resolveActiveCompany: (...args: unknown[]) => mockResolveActiveCompany(...args),
    checkUserIsSuperAdmin: (...args: unknown[]) => mockCheckUserIsSuperAdmin(...args),
  }
})

vi.mock('../../../utils/requireAdmin', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: (...args: unknown[]) => mockServerSupabaseServiceRole(...args),
}))

vi.stubGlobal('defineEventHandler', (cb: Function) => cb)
vi.stubGlobal('createError', mockCreateError)
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('getRouterParam', mockGetRouterParam)
vi.stubGlobal('setResponseStatus', mockSetResponseStatus)

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

describe('Company Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAllRbacCache()
    mockCreateError.mockImplementation(makeCreateError())
  })

  describe('GET /api/companies/my-companies', () => {
    it('returns all active companies for Super Admin', async () => {
      mockResolveAuthUser.mockResolvedValue({ id: 'super-1', email: 'super@pos.com', isSuperAdmin: true })
      mockCheckUserIsSuperAdmin.mockResolvedValue(true)
      const fakeCompanies = [
        { id: 'c1', name: 'Paroki A', slug: 'paroki-a', is_active: true, settings: {} },
        { id: 'c2', name: 'Paroki B', slug: 'paroki-b', is_active: true, settings: {} },
      ]
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: fakeCompanies, error: null }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../my-companies.get')).default
      const result = await handler(mockEvent())

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({ id: 'c1', role_code: 'admin' })
      expect(result[1]).toMatchObject({ id: 'c2', role_code: 'admin' })
    })

    it('returns user memberships for regular user', async () => {
      mockResolveAuthUser.mockResolvedValue({ id: 'user-1', email: 'user@test.com', isSuperAdmin: false })
      mockCheckUserIsSuperAdmin.mockResolvedValue(false)
      const fakeMemberships = [
        {
          company_id: 'c1',
          is_default: true,
          is_active: true,
          roles: { code: 'cashier', name: 'Kasir' },
          companies: { id: 'c1', name: 'Paroki A', slug: 'paroki-a', is_active: true, settings: {} },
        },
      ]
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: fakeMemberships, error: null }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../my-companies.get')).default
      const result = await handler(mockEvent())

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'c1',
        name: 'Paroki A',
        is_default: true,
        role_code: 'cashier',
      })
    })

    it('throws 401 when not authenticated', async () => {
      mockResolveAuthUser.mockResolvedValue(null)
      const handler = (await import('../my-companies.get')).default
      await expect(handler(mockEvent())).rejects.toThrow('Unauthorized')
    })
  })

  describe('GET /api/companies/active', () => {
    it('returns active company profile for current tenant', async () => {
      mockResolveActiveCompany.mockResolvedValue({
        companyId: 'c1',
        companyName: 'Paroki A',
        roleCode: 'admin',
        isSuperAdmin: false,
      })

      const companyData = {
        id: 'c1',
        name: 'Paroki A',
        slug: 'paroki-a',
        address: 'Jl. Gereja No. 1',
        phone: '08123456789',
        is_active: true,
        settings: {},
      }

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: companyData, error: null }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../active.get')).default
      const result = await handler(mockEvent())

      expect(result).toMatchObject({
        id: 'c1',
        name: 'Paroki A',
        role_code: 'admin',
      })
    })
  })

  describe('PATCH /api/companies/active', () => {
    it('updates company profile for admin', async () => {
      mockRequireAdmin.mockResolvedValue({
        companyId: 'c1',
        roleCode: 'admin',
      })

      mockReadBody.mockResolvedValue({
        name: 'Paroki A Baru',
        address: 'Alamat Baru',
      })

      const updatedCompany = {
        id: 'c1',
        name: 'Paroki A Baru',
        address: 'Alamat Baru',
      }

      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: updatedCompany, error: null }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../active.patch')).default
      const result = await handler(mockEvent())

      expect(result).toEqual({ success: true, company: updatedCompany })
    })

    it('throws 400 when name is empty', async () => {
      mockRequireAdmin.mockResolvedValue({ companyId: 'c1' })
      mockReadBody.mockResolvedValue({ name: '  ' })

      const handler = (await import('../active.patch')).default
      await expect(handler(mockEvent())).rejects.toThrow('Nama organisasi tidak boleh kosong')
    })
  })

  describe('POST /api/companies', () => {
    it('allows Super Admin to create a new company', async () => {
      mockResolveAuthUser.mockResolvedValue({ id: 'super-1', email: 'super@pos.com', isSuperAdmin: true })
      mockCheckUserIsSuperAdmin.mockResolvedValue(true)
      mockReadBody.mockResolvedValue({ name: 'Paroki Baru' })

      const createdCompany = { id: 'new-c', name: 'Paroki Baru', slug: 'paroki-baru' }
      const mockClient = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: createdCompany, error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'role-admin' }, error: null }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../index.post')).default
      const result = await handler(mockEvent())

      expect(result).toMatchObject({ success: true, company: createdCompany })
      expect(mockSetResponseStatus).toHaveBeenCalledWith(expect.anything(), 201)
    })

    it('throws 403 when non-super-admin tries to create company', async () => {
      mockResolveAuthUser.mockResolvedValue({ id: 'user-1', email: 'regular@test.com', isSuperAdmin: false })
      mockCheckUserIsSuperAdmin.mockResolvedValue(false)
      mockReadBody.mockResolvedValue({ name: 'Paroki Baru' })

      const handler = (await import('../index.post')).default
      await expect(handler(mockEvent())).rejects.toThrow('Forbidden: Super Admin required')
    })
  })

  describe('PATCH /api/companies/[id]/toggle-active', () => {
    it('allows Super Admin to toggle company active status', async () => {
      mockResolveAuthUser.mockResolvedValue({ id: 'super-1', email: 'super@pos.com', isSuperAdmin: true })
      mockCheckUserIsSuperAdmin.mockResolvedValue(true)
      mockGetRouterParam.mockReturnValue('comp-1')
      mockReadBody.mockResolvedValue({ is_active: false })

      const updated = { id: 'comp-1', is_active: false }
      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: updated, error: null }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../[id]/toggle-active.patch')).default
      const result = await handler(mockEvent())

      expect(result).toEqual({ success: true, company: updated })
    })

    it('throws 403 when non-super-admin tries to toggle company active status', async () => {
      mockResolveAuthUser.mockResolvedValue({ id: 'user-1', email: 'cashier@test.com', isSuperAdmin: false })
      mockCheckUserIsSuperAdmin.mockResolvedValue(false)
      mockGetRouterParam.mockReturnValue('comp-1')
      mockReadBody.mockResolvedValue({ is_active: false })

      const handler = (await import('../[id]/toggle-active.patch')).default
      await expect(handler(mockEvent())).rejects.toThrow('Forbidden: Super Admin required')
    })
  })
})
