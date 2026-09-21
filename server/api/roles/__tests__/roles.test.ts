import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockCreateError = vi.fn()
const mockReadBody = vi.fn()
const mockGetRouterParam = vi.fn()
const mockRequirePermission = vi.fn()
const mockServerSupabaseServiceRole = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: (...args: unknown[]) => mockServerSupabaseServiceRole(...args),
}))

vi.stubGlobal('defineEventHandler', (cb: Function) => cb)
vi.stubGlobal('createError', mockCreateError)
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('getRouterParam', mockGetRouterParam)
vi.stubGlobal('requirePermission', mockRequirePermission)

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

describe('Roles API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateError.mockImplementation(makeCreateError())
    mockRequirePermission.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
  })

  describe('GET /api/roles', () => {
    it('returns formatted roles list with permission codes', async () => {
      const fakeRolesData = [
        {
          id: 'role-1',
          code: 'admin',
          name: 'Administrator',
          description: 'Full access',
          is_system: true,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
          role_permissions: [
            { permissions: { code: 'pos:transact' } },
            { permissions: { code: 'cashflow:view' } },
          ],
        },
      ]

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: fakeRolesData, error: null }),
            }),
          }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../index.get')).default
      const result = await handler(mockEvent())

      expect(result).toHaveLength(1)
      expect(result[0].code).toBe('admin')
      expect(result[0].permissions).toEqual(['pos:transact', 'cashflow:view'])
    })
  })

  describe('POST /api/roles', () => {
    it('creates custom role and maps permissions', async () => {
      mockReadBody.mockResolvedValue({
        name: 'Staff Kas',
        code: 'staff_kas',
        description: 'Kasir & Kas',
        permissions: ['pos:transact', 'cashflow:view'],
      })

      const insertedRole = {
        id: 'role-new',
        code: 'staff_kas',
        name: 'Staff Kas',
        description: 'Kasir & Kas',
        is_system: false,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }

      const insertRoleMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: insertedRole, error: null }),
        }),
      })

      const insertMappingsMock = vi.fn().mockResolvedValue({ error: null })

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'roles') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }), // not existing
                }),
              }),
              insert: insertRoleMock,
            }
          }
          if (table === 'permissions') {
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'p1', code: 'pos:transact' },
                    { id: 'p2', code: 'cashflow:view' },
                  ],
                }),
              }),
            }
          }
          if (table === 'role_permissions') {
            return {
              insert: insertMappingsMock,
            }
          }
          return {}
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../index.post')).default
      const result = await handler(mockEvent())

      expect(result.code).toBe('staff_kas')
      expect(result.permissions).toEqual(['pos:transact', 'cashflow:view'])
      expect(insertRoleMock).toHaveBeenCalled()
      expect(insertMappingsMock).toHaveBeenCalled()
    })

    it('throws 400 when name is missing', async () => {
      mockReadBody.mockResolvedValue({ name: '', permissions: [] })
      const handler = (await import('../index.post')).default
      await expect(handler(mockEvent())).rejects.toThrow('Nama peran wajib diisi')
    })
  })

  describe('DELETE /api/roles/[id]', () => {
    it('prevents deleting system role', async () => {
      mockGetRouterParam.mockReturnValue('role-admin')
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'role-admin', code: 'admin', is_system: true },
                error: null,
              }),
            }),
          }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../[id].delete')).default
      await expect(handler(mockEvent())).rejects.toThrow('Peran bawaan sistem tidak dapat dihapus')
    })
  })
})
