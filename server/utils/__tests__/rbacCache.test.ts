import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  cacheGet,
  cacheSet,
  cacheDelete,
  cacheDeletePrefix,
  getCachedUser,
  setCachedUser,
  getCachedUserPermissions,
  setCachedUserPermissions,
  getCachedRoles,
  setCachedRoles,
  getCachedPermissionsCatalog,
  setCachedPermissionsCatalog,
  invalidateUserCache,
  invalidateRolesCache,
  invalidatePermissionsCatalogCache,
  clearAllRbacCache,
  resolveAuthUser,
} from '../rbacCache'

const mockServerSupabaseUser = vi.fn()
const mockServerSupabaseServiceRole = vi.fn()
const mockGetRequestHeader = vi.fn()

vi.mock('#supabase/server', () => ({
  serverSupabaseUser: (...args: unknown[]) => mockServerSupabaseUser(...args),
  serverSupabaseServiceRole: (...args: unknown[]) => mockServerSupabaseServiceRole(...args),
}))

vi.stubGlobal('getRequestHeader', mockGetRequestHeader)

function mockEvent(overrides: Record<string, unknown> = {}) {
  return { context: {}, ...overrides } as any
}

describe('rbacCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAllRbacCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    clearAllRbacCache()
  })

  describe('Core Cache Operations', () => {
    it('sets and gets cached item within TTL', () => {
      cacheSet('test:key', { foo: 'bar' }, 10)
      expect(cacheGet('test:key')).toEqual({ foo: 'bar' })
    })

    it('returns null when item is expired', () => {
      cacheSet('test:expire', 'val', 5)
      expect(cacheGet('test:expire')).toBe('val')

      // Advance clock past TTL (5 seconds + 1ms)
      vi.advanceTimersByTime(5001)
      expect(cacheGet('test:expire')).toBeNull()
    })

    it('deletes specific key', () => {
      cacheSet('key-1', 'a', 60)
      cacheDelete('key-1')
      expect(cacheGet('key-1')).toBeNull()
    })

    it('deletes keys by prefix', () => {
      cacheSet('prefix:1', 'a', 60)
      cacheSet('prefix:2', 'b', 60)
      cacheSet('other:1', 'c', 60)

      cacheDeletePrefix('prefix:')
      expect(cacheGet('prefix:1')).toBeNull()
      expect(cacheGet('prefix:2')).toBeNull()
      expect(cacheGet('other:1')).toBe('c')
    })
  })

  describe('Domain Helpers', () => {
    it('caches and retrieves user token', () => {
      const user = { id: 'u1', email: 'test@pos.com' }
      setCachedUser('token-123', user, 60)
      expect(getCachedUser('token-123')).toEqual(user)
    })

    it('caches and retrieves user effective permissions', () => {
      setCachedUserPermissions('u1', ['pos:transact', 'reports:view'], 120)
      expect(getCachedUserPermissions('u1')).toEqual(['pos:transact', 'reports:view'])
    })

    it('caches and retrieves roles catalog', () => {
      const roles = [{ id: 'r1', code: 'cashier', name: 'Kasir' }]
      setCachedRoles(roles, 300)
      expect(getCachedRoles()).toEqual(roles)
    })

    it('caches and retrieves permissions master catalog', () => {
      const perms = [{ id: 'p1', code: 'pos:transact' }]
      setCachedPermissionsCatalog(perms, 300)
      expect(getCachedPermissionsCatalog()).toEqual(perms)
    })
  })

  describe('Event-Driven Cache Invalidation', () => {
    it('invalidates specific user cache and associated tokens', () => {
      setCachedUserPermissions('user-1', ['pos:transact'])
      setCachedUser('tok-u1', { id: 'user-1', email: 'u1@test.com' })
      setCachedUser('tok-u2', { id: 'user-2', email: 'u2@test.com' })

      invalidateUserCache('user-1')

      expect(getCachedUserPermissions('user-1')).toBeNull()
      expect(getCachedUser('tok-u1')).toBeNull()
      expect(getCachedUser('tok-u2')).toEqual({ id: 'user-2', email: 'u2@test.com' })
    })

    it('invalidates roles catalog and all user permissions', () => {
      setCachedRoles([{ id: 'r1' }])
      setCachedUserPermissions('u1', ['pos:transact'])
      setCachedUserPermissions('u2', ['cashflow:view'])

      invalidateRolesCache()

      expect(getCachedRoles()).toBeNull()
      expect(getCachedUserPermissions('u1')).toBeNull()
      expect(getCachedUserPermissions('u2')).toBeNull()
    })

    it('invalidates permissions catalog', () => {
      setCachedPermissionsCatalog([{ id: 'p1' }])
      invalidatePermissionsCatalogCache()
      expect(getCachedPermissionsCatalog()).toBeNull()
    })
  })

  describe('resolveAuthUser', () => {
    it('resolves user directly from cookie if available', async () => {
      const mockUser = { id: 'cookie-user', email: 'cookie@pos.com' }
      mockServerSupabaseUser.mockResolvedValue(mockUser)

      const result = await resolveAuthUser(mockEvent())
      expect(result).toEqual(mockUser)
      expect(mockServerSupabaseServiceRole).not.toHaveBeenCalled()
    })

    it('resolves user from token cache if already cached', async () => {
      mockServerSupabaseUser.mockResolvedValue(null)
      mockGetRequestHeader.mockReturnValue('Bearer cached-token-abc')

      const cachedUser = { id: 'cached-user', email: 'cached@pos.com' }
      setCachedUser('cached-token-abc', cachedUser)

      const result = await resolveAuthUser(mockEvent())
      expect(result).toEqual(cachedUser)
      expect(mockServerSupabaseServiceRole).not.toHaveBeenCalled()
    })

    it('fetches and caches user from Supabase client on token cache miss', async () => {
      mockServerSupabaseUser.mockResolvedValue(null)
      mockGetRequestHeader.mockReturnValue('Bearer fresh-token-xyz')

      const freshUser = { id: 'fresh-user', email: 'fresh@pos.com' }
      const mockClient = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: freshUser }, error: null }),
        },
      }
      mockServerSupabaseServiceRole.mockReturnValue(mockClient)

      const result = await resolveAuthUser(mockEvent())
      expect(result).toEqual(freshUser)
      expect(mockClient.auth.getUser).toHaveBeenCalledWith('fresh-token-xyz')

      // Verify it was added to cache
      expect(getCachedUser('fresh-token-xyz')).toEqual(freshUser)
    })

    it('returns null if neither cookie nor token is present', async () => {
      mockServerSupabaseUser.mockResolvedValue(null)
      mockGetRequestHeader.mockReturnValue(undefined)

      const result = await resolveAuthUser(mockEvent())
      expect(result).toBeNull()
    })
  })
})
