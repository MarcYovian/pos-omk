import { describe, it, expect, beforeEach, vi } from 'vitest'
import { clearAllRbacCache } from '../../../utils/rbacCache'

const mockCreateError = vi.fn()
const mockReadBody = vi.fn()
const mockGetRouterParam = vi.fn()
const mockRequirePermission = vi.fn()
const mockServerSupabaseServiceRole = vi.fn()
const mockSetHeader = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: (...args: unknown[]) => mockServerSupabaseServiceRole(...args),
}))

vi.stubGlobal('defineEventHandler', (cb: Function) => cb)
vi.stubGlobal('createError', mockCreateError)
vi.stubGlobal('readBody', mockReadBody)
vi.stubGlobal('getRouterParam', mockGetRouterParam)
vi.stubGlobal('requirePermission', mockRequirePermission)
vi.stubGlobal('setHeader', mockSetHeader)

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

describe('Permissions API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAllRbacCache()
    mockCreateError.mockImplementation(makeCreateError())
    mockRequirePermission.mockResolvedValue({ id: 'admin-1', email: 'admin@test.com' })
  })

  describe('GET /api/permissions', () => {
    it('returns catalog of permissions ordered by module and code', async () => {
      const fakePerms = [
        { id: 'p1', code: 'pos:transact', name: 'Transaksi Kasir', module: 'pos', description: 'Buka transaksi' },
        { id: 'p2', code: 'roles:manage', name: 'Kelola Role', module: 'roles', description: null },
      ]

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: fakePerms, error: null }),
            }),
          }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../index.get')).default
      const result = await handler(mockEvent())

      expect(mockRequirePermission).toHaveBeenCalledWith(expect.anything(), 'roles:manage')
      expect(result).toEqual(fakePerms)
      expect(result).toHaveLength(2)
    })

    it('throws 500 when database error occurs', async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB down' } }),
            }),
          }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../index.get')).default
      await expect(handler(mockEvent())).rejects.toThrow('DB down')
    })
  })

  describe('POST /api/permissions', () => {
    it('creates a new permission successfully', async () => {
      mockReadBody.mockResolvedValue({
        code: 'custom:action',
        name: 'Custom Action',
        module: 'custom',
        description: 'Testing action',
      })

      const insertedRecord = {
        id: 'p-new',
        code: 'custom:action',
        name: 'Custom Action',
        module: 'custom',
        description: 'Testing action',
      }

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null }), // does not exist
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: insertedRecord, error: null }),
            }),
          }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../index.post')).default
      const result = await handler(mockEvent())

      expect(result).toEqual(insertedRecord)
    })

    it('validates required fields', async () => {
      const handler = (await import('../index.post')).default

      mockReadBody.mockResolvedValue({ name: '', code: 'code', module: 'mod' })
      await expect(handler(mockEvent())).rejects.toThrow('Nama permission wajib diisi')

      mockReadBody.mockResolvedValue({ name: 'Name', code: '', module: 'mod' })
      await expect(handler(mockEvent())).rejects.toThrow('Kode permission wajib diisi')

      mockReadBody.mockResolvedValue({ name: 'Name', code: 'code', module: '' })
      await expect(handler(mockEvent())).rejects.toThrow('Group / Modul wajib diisi')
    })

    it('rejects duplicate permission code', async () => {
      mockReadBody.mockResolvedValue({
        code: 'pos:transact',
        name: 'Transaksi Kasir',
        module: 'pos',
      })

      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'existing-id' }, error: null }),
            }),
          }),
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../index.post')).default
      await expect(handler(mockEvent())).rejects.toThrow("Kode permission 'pos:transact' sudah digunakan")
    })
  })

  describe('PUT /api/permissions/[id]', () => {
    it('updates permission attributes', async () => {
      mockGetRouterParam.mockReturnValue('p-123')
      mockReadBody.mockResolvedValue({
        name: 'Updated Name',
        module: 'new-mod',
        description: 'Updated desc',
      })

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockClient = {
        from: vi.fn().mockReturnValue({
          update: updateMock,
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../[id].put')).default
      const result = await handler(mockEvent())

      expect(result).toEqual({ success: true })
      expect(updateMock).toHaveBeenCalledWith({
        name: 'Updated Name',
        module: 'new-mod',
        description: 'Updated desc',
      })
    })

    it('throws 400 when id param is missing', async () => {
      mockGetRouterParam.mockReturnValue(undefined)
      const handler = (await import('../[id].put')).default
      await expect(handler(mockEvent())).rejects.toThrow('ID permission wajib disertakan')
    })
  })

  describe('DELETE /api/permissions/[id]', () => {
    it('deletes permission by id', async () => {
      mockGetRouterParam.mockReturnValue('p-123')

      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      const mockClient = {
        from: vi.fn().mockReturnValue({
          delete: deleteMock,
        }),
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const handler = (await import('../[id].delete')).default
      const result = await handler(mockEvent())

      expect(result).toEqual({ success: true })
    })

    it('throws 400 when id param is missing', async () => {
      mockGetRouterParam.mockReturnValue(undefined)
      const handler = (await import('../[id].delete')).default
      await expect(handler(mockEvent())).rejects.toThrow('ID permission wajib disertakan')
    })
  })
})
