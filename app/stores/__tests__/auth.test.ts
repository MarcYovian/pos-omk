import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockNavigateTo = vi.fn()
const mockUserRef: { value: any } = { value: null }

vi.stubGlobal('useSupabase', () => ({
  auth: {
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
  },
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
})
