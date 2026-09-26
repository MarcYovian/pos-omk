import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useApi } from '~/composables/useApi'

const mockGetSession = vi.fn()
const mockSupabase = {
  auth: {
    getSession: mockGetSession
  }
}

vi.stubGlobal('useSupabase', () => mockSupabase)

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('attaches Authorization header with access_token when session exists', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { access_token: 'fake-token-xyz' }
      }
    })
    mockFetch.mockResolvedValue({ success: true })

    const { apiFetch } = useApi()
    const res = await apiFetch('/api/test', { method: 'GET' })

    expect(res).toEqual({ success: true })
    expect(mockFetch).toHaveBeenCalledWith('/api/test', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer fake-token-xyz'
      }
    })
  })

  it('preserves existing custom headers and adds Authorization header', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { access_token: 'my-token' }
      }
    })
    mockFetch.mockResolvedValue({ ok: true })

    const { apiFetch } = useApi()
    await apiFetch('/api/resource', {
      headers: { 'X-Custom-Header': 'custom-val' }
    })

    expect(mockFetch).toHaveBeenCalledWith('/api/resource', {
      headers: {
        'X-Custom-Header': 'custom-val',
        Authorization: 'Bearer my-token'
      }
    })
  })

  it('works when session is null without setting Authorization header', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null }
    })
    mockFetch.mockResolvedValue({ status: 'anonymous' })

    const { apiFetch } = useApi()
    const res = await apiFetch('/api/public')

    expect(res).toEqual({ status: 'anonymous' })
    expect(mockFetch).toHaveBeenCalledWith('/api/public', {
      headers: {}
    })
  })

  it('handles getSession errors gracefully without throwing', async () => {
    mockGetSession.mockRejectedValue(new Error('Auth network failed'))
    mockFetch.mockResolvedValue({ fallback: true })

    const { apiFetch } = useApi()
    const res = await apiFetch('/api/error-test')

    expect(res).toEqual({ fallback: true })
    expect(mockFetch).toHaveBeenCalledWith('/api/error-test', {
      headers: {}
    })
  })
})
