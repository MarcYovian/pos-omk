import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockUserRef: { value: any } = { value: null }
const mockNavigateTo = vi.fn()

vi.stubGlobal('useSupabaseUser', () => mockUserRef)
vi.stubGlobal('navigateTo', mockNavigateTo)
vi.stubGlobal('defineNuxtRouteMiddleware', (cb: Function) => cb)
vi.stubGlobal('useSupabase', () => ({
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
}))

describe('auth middleware', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockUserRef.value = null
  })

  it('redirects to /login when no user', async () => {
    const middleware = (await import('~/middleware/auth')).default
    middleware({} as any, {} as any)
    expect(mockNavigateTo).toHaveBeenCalledWith('/login')
  })

  it('allows navigation when user is present', async () => {
    mockUserRef.value = { id: 'user-1', user_metadata: { role: 'cashier' } }
    const middleware = (await import('~/middleware/auth')).default
    middleware({} as any, {} as any)
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })
})
