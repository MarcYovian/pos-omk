import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockNavigateTo = vi.fn()
const mockUserRef: { value: any } = { value: null }

const mockRpc = vi.fn()

vi.stubGlobal('useSupabase', () => ({
  auth: {
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
  },
  rpc: mockRpc,
}))

vi.stubGlobal('useSupabaseUser', () => mockUserRef)
vi.stubGlobal('navigateTo', mockNavigateTo)

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockUserRef.value = null
  })

  it('has default role null and loading false', () => {
    const auth = useAuthStore()
    expect(auth.role).toBeNull()
    expect(auth.isLoading).toBe(false)
  })

  describe('getRole', () => {
    it('returns cashier when metadata has no role', () => {
      mockUserRef.value = { user_metadata: {} }
      const auth = useAuthStore()
      expect(auth.getRole()).toBe('cashier')
    })

    it('returns admin when metadata.role is admin', () => {
      mockUserRef.value = { user_metadata: { role: 'admin' } }
      const auth = useAuthStore()
      expect(auth.getRole()).toBe('admin')
    })

    it('returns cashier when metadata.role is cashier', () => {
      mockUserRef.value = { user_metadata: { role: 'cashier' } }
      const auth = useAuthStore()
      expect(auth.getRole()).toBe('cashier')
    })

    it('returns cashier for unknown role', () => {
      mockUserRef.value = { user_metadata: { role: 'manager' } }
      const auth = useAuthStore()
      expect(auth.getRole()).toBe('cashier')
    })
  })

  describe('login', () => {
    it('succeeds with admin credentials and sets role', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { user_metadata: { role: 'admin' } } },
        error: null,
      })
      const auth = useAuthStore()
      const result = await auth.login('admin@test.com', 'password')

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'admin@test.com',
        password: 'password',
      })
      expect(auth.role).toBe('admin')
      expect(result).toBeDefined()
      expect(auth.isLoading).toBe(false)
    })

    it('succeeds with cashier credentials and sets role', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: { user_metadata: { role: 'cashier' } } },
        error: null,
      })
      const auth = useAuthStore()
      await auth.login('cashier@test.com', 'password')

      expect(auth.role).toBe('cashier')
    })

    it('fails and throws error without setting role', async () => {
      const testError = new Error('Invalid credentials')
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null },
        error: testError,
      })
      const auth = useAuthStore()

      await expect(auth.login('bad@test.com', 'wrong')).rejects.toThrow('Invalid credentials')
      expect(auth.role).toBeNull()
      expect(auth.isLoading).toBe(false)
    })
  })

  describe('logout', () => {
    it('calls signOut, clears role, and navigates to /login', async () => {
      mockSignOut.mockResolvedValue({ error: null })
      const auth = useAuthStore()
      auth.role = 'admin'

      await auth.logout()

      expect(mockSignOut).toHaveBeenCalled()
      expect(auth.role).toBeNull()
      expect(mockNavigateTo).toHaveBeenCalledWith('/login')
      expect(auth.isLoading).toBe(false)
    })
  })

  describe('initializeRole', () => {
    it('sets role from user metadata when user exists', () => {
      mockUserRef.value = { user_metadata: { role: 'admin' } }
      const auth = useAuthStore()
      auth.initializeRole()
      expect(auth.role).toBe('admin')
    })

    it('sets role to null when no user', () => {
      const auth = useAuthStore()
      auth.initializeRole()
      expect(auth.role).toBeNull()
    })

    it('defaults to cashier for unknown metadata roles', () => {
      mockUserRef.value = { user_metadata: { role: 'superuser' } }
      const auth = useAuthStore()
      auth.initializeRole()
      expect(auth.role).toBe('cashier')
    })
  })

  describe('can and isSuperAdmin', () => {
    it('returns true for any permission when role is admin (superuser bypass)', () => {
      const auth = useAuthStore()
      auth.role = 'admin'
      expect(auth.isSuperAdmin).toBe(true)
      expect(auth.can('pos:transact')).toBe(true)
      expect(auth.can('roles:manage')).toBe(true)
      expect(auth.can('nonexistent:perm')).toBe(true)
    })

    it('returns true only for granted permissions when role is not admin', () => {
      const auth = useAuthStore()
      auth.role = 'cashier'
      auth.permissions = ['pos:transact']
      expect(auth.isSuperAdmin).toBe(false)
      expect(auth.can('pos:transact')).toBe(true)
      expect(auth.can('cashflow:view')).toBe(false)
    })
  })

  describe('fetchUserPermissions (caching & deduplication)', () => {
    it('deduplicates concurrent calls to a single RPC call', async () => {
      mockUserRef.value = { id: 'u-1', email: 'test@pos.com' }
      mockRpc.mockResolvedValue({
        data: [{ permission_code: 'pos:transact' }],
        error: null,
      })

      const auth = useAuthStore()

      // Fire 3 simultaneous calls
      await Promise.all([
        auth.fetchUserPermissions(true),
        auth.fetchUserPermissions(),
        auth.fetchUserPermissions(),
      ])

      // Only 1 RPC call should have been made
      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(auth.permissions).toEqual(['pos:transact'])
    })

    it('reuses cached permissions within 60s without re-querying RPC', async () => {
      mockUserRef.value = { id: 'u-1', email: 'test@pos.com' }
      mockRpc.mockResolvedValue({
        data: [{ permission_code: 'pos:transact' }],
        error: null,
      })

      const auth = useAuthStore()
      await auth.fetchUserPermissions(true)
      expect(mockRpc).toHaveBeenCalledTimes(1)

      // Second call immediately after
      await auth.fetchUserPermissions()
      expect(mockRpc).toHaveBeenCalledTimes(1) // Still 1!
    })

    it('re-fetches from RPC when force=true', async () => {
      mockUserRef.value = { id: 'u-1', email: 'test@pos.com' }
      mockRpc.mockResolvedValue({
        data: [{ permission_code: 'pos:transact' }],
        error: null,
      })

      const auth = useAuthStore()
      await auth.fetchUserPermissions(true)
      expect(mockRpc).toHaveBeenCalledTimes(1)

      await auth.fetchUserPermissions(true)
      expect(mockRpc).toHaveBeenCalledTimes(2) // Forced refresh
    })
  })
})

