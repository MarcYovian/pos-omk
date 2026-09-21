import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '~/stores/auth'

const mockUserRef: { value: any } = { value: null }
const mockNavigateTo = vi.fn()

vi.stubGlobal('useSupabaseUser', () => mockUserRef)
vi.stubGlobal('navigateTo', mockNavigateTo)
vi.stubGlobal('defineNuxtRouteMiddleware', (cb: Function) => cb)
vi.stubGlobal('useSupabase', () => ({
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
}))

describe('permission middleware', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockUserRef.value = null
  })

  it('redirects to /login when no user', async () => {
    const middleware = (await import('~/middleware/permission')).default
    await middleware({ meta: {} } as any)
    expect(mockNavigateTo).toHaveBeenCalledWith('/login')
  })

  it('allows navigation when user is admin (superuser bypass)', async () => {
    mockUserRef.value = { id: 'admin-1', user_metadata: { role: 'admin' } }
    const auth = useAuthStore()
    auth.role = 'admin'

    const middleware = (await import('~/middleware/permission')).default
    await middleware({ meta: { permission: 'roles:manage' } } as any)
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('allows navigation when user has the required permission', async () => {
    mockUserRef.value = { id: 'user-1', user_metadata: { role: 'treasurer' } }
    const auth = useAuthStore()
    auth.role = 'treasurer'
    auth.permissions = ['cashflow:view']

    const middleware = (await import('~/middleware/permission')).default
    await middleware({ meta: { permission: 'cashflow:view' } } as any)
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('redirects to /pos when user lacks the required permission', async () => {
    mockUserRef.value = { id: 'user-1', user_metadata: { role: 'cashier' } }
    const auth = useAuthStore()
    auth.role = 'cashier'
    auth.permissions = ['pos:transact']

    const middleware = (await import('~/middleware/permission')).default
    await middleware({ meta: { permission: 'cashflow:view' } } as any)
    expect(mockNavigateTo).toHaveBeenCalledWith('/pos')
  })
})
