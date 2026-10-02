import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockCreateError = vi.fn()
const mockGetRouterParam = vi.fn()
const mockServerSupabaseServiceRole = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseServiceRole: (...args: unknown[]) => mockServerSupabaseServiceRole(...args),
}))

vi.stubGlobal('defineEventHandler', (cb: Function) => cb)
vi.stubGlobal('createError', mockCreateError)
vi.stubGlobal('getRouterParam', mockGetRouterParam)

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

describe('GET /api/public/umkm-performance/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateError.mockImplementation(makeCreateError())
  })

  it('returns umkm public performance data', async () => {
    mockGetRouterParam.mockReturnValue('umkm-1')

    const fakeUmkm = { id: 'umkm-1', nama_umkm: 'Kue Basah Ibu Maria', is_active: true }
    const fakeProducts = [{ master_product_id: 'p1', nama_produk: 'Lemper', total_terjual: 20 }]
    const fakeSessions = [{ session_id: 's1', session_date: '2026-09-19', total_terjual: 20 }]

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: fakeUmkm, error: null }),
      }),
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (fnName === 'get_umkm_product_performance') {
          return Promise.resolve({ data: fakeProducts, error: null })
        }
        if (fnName === 'get_umkm_session_history') {
          return Promise.resolve({ data: fakeSessions, error: null })
        }
        return Promise.resolve({ data: [], error: null })
      }),
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../umkm-performance/[id].get')).default
    const result = await handler(mockEvent())

    expect(result).toEqual({
      umkm: { id: 'umkm-1', nama_umkm: 'Kue Basah Ibu Maria' },
      products: fakeProducts,
      sessions: fakeSessions,
    })
    expect(mockClient.rpc).toHaveBeenCalledWith('get_umkm_product_performance', { p_umkm_id: 'umkm-1' })
    expect(mockClient.rpc).toHaveBeenCalledWith('get_umkm_session_history', { p_umkm_id: 'umkm-1' })
  })

  it('throws 400 when UMKM ID is missing', async () => {
    mockGetRouterParam.mockReturnValue(null)

    const handler = (await import('../umkm-performance/[id].get')).default
    await expect(handler(mockEvent())).rejects.toThrow('ID UMKM diperlukan')
  })

  it('throws 404 when UMKM is not found', async () => {
    mockGetRouterParam.mockReturnValue('umkm-unknown')

    const mockClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') }),
      }),
    }
    mockServerSupabaseServiceRole.mockReturnValue(mockClient)

    const handler = (await import('../umkm-performance/[id].get')).default
    await expect(handler(mockEvent())).rejects.toThrow('Mitra UMKM tidak ditemukan')
  })
})
