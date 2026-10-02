// server/utils/rbacCache.ts
import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

interface CacheEntry<T> {
  value: T
  expiresAt: number
}

// Global in-memory cache store
const cacheStore = new Map<string, CacheEntry<any>>()

// Default TTL configurations (in seconds)
export const RBAC_CACHE_TTL = {
  AUTH_TOKEN: 60,       // 60s for verified auth tokens
  USER_PERMS: 120,      // 120s for user effective permissions
  USERS_LIST: 120,      // 120s for users list
  ROLES_CATALOG: 300,   // 300s (5m) for system roles
  PERMS_CATALOG: 300,   // 300s (5m) for master permissions catalog
} as const

/**
 * Retrieve cached value if valid and not expired.
 */
export function cacheGet<T>(key: string): T | null {
  const entry = cacheStore.get(key)
  if (!entry) return null

  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key)
    return null
  }

  return entry.value as T
}

/**
 * Store a value in cache with a TTL in seconds.
 */
export function cacheSet<T>(key: string, value: T, ttlSeconds: number): void {
  cacheStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000
  })
}

/**
 * Delete a specific key from cache.
 */
export function cacheDelete(key: string): void {
  cacheStore.delete(key)
}

/**
 * Delete all keys matching a specific prefix.
 */
export function cacheDeletePrefix(prefix: string): void {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key)
    }
  }
}

// -------------------------------------------------------------
// Typed Domain Cache Helpers & User Resolver
// -------------------------------------------------------------

/**
 * Resolves user from Supabase session cookies or cached Bearer token.
 */
export async function resolveAuthUser(event: H3Event): Promise<any> {
  let user: any = null

  // 1. Try resolving user from cookies via @nuxtjs/supabase
  try {
    user = await serverSupabaseUser(event)
    if (user) return user
  } catch {
    // Cookie parsing failed or absent, proceed to header fallback
  }

  // 2. Fallback to Authorization: Bearer <token> header with cache
  const authHeader = getRequestHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim()

    // Check in-memory cache first
    const cached = getCachedUser(token)
    if (cached) return cached

    const client = serverSupabaseServiceRole(event)
    const { data, error } = await client.auth.getUser(token)
    if (!error && data?.user) {
      setCachedUser(token, data.user)
      return data.user
    }
  }

  return null
}

// 1. Auth Token Cache
export function getCachedUser(token: string) {
  return cacheGet<any>(`auth:token:${token}`)
}

export function setCachedUser(token: string, user: any, ttlSeconds: number = RBAC_CACHE_TTL.AUTH_TOKEN) {
  cacheSet(`auth:token:${token}`, user, ttlSeconds)
}

// 2. User Effective Permissions Cache
export function getCachedUserPermissions(userId: string): string[] | null {
  return cacheGet<string[]>(`rbac:user_perms:${userId}`)
}

export function setCachedUserPermissions(userId: string, perms: string[], ttlSeconds: number = RBAC_CACHE_TTL.USER_PERMS) {
  cacheSet(`rbac:user_perms:${userId}`, perms, ttlSeconds)
}

// 3. Roles Catalog Cache
export function getCachedRoles(): any[] | null {
  return cacheGet<any[]>('rbac:roles_catalog')
}

export function setCachedRoles(roles: any[], ttlSeconds: number = RBAC_CACHE_TTL.ROLES_CATALOG) {
  cacheSet('rbac:roles_catalog', roles, ttlSeconds)
}

// 4. Permissions Master Catalog Cache
export function getCachedPermissionsCatalog(): any[] | null {
  return cacheGet<any[]>('rbac:perms_catalog')
}

export function setCachedPermissionsCatalog(perms: any[], ttlSeconds: number = RBAC_CACHE_TTL.PERMS_CATALOG) {
  cacheSet('rbac:perms_catalog', perms, ttlSeconds)
}

// 5. Users List Cache
export function getCachedUsers(): any[] | null {
  return cacheGet<any[]>('rbac:users_list')
}

export function setCachedUsers(users: any[], ttlSeconds: number = RBAC_CACHE_TTL.USERS_LIST) {
  cacheSet('rbac:users_list', users, ttlSeconds)
}

// 6. User Permissions Detail Cache
export function getCachedUserPermissionsDetail(userId: string): any | null {
  return cacheGet<any>(`rbac:user_perms_detail:${userId}`)
}

export function setCachedUserPermissionsDetail(userId: string, data: any, ttlSeconds: number = RBAC_CACHE_TTL.USER_PERMS) {
  cacheSet(`rbac:user_perms_detail:${userId}`, data, ttlSeconds)
}

// -------------------------------------------------------------
// Invalidation Helpers (Event-Driven)
// -------------------------------------------------------------

/**
 * Invalidate cached users list.
 */
export function invalidateUsersCache(): void {
  cacheDelete('rbac:users_list')
}

/**
 * Invalidate cache for a specific user (effective permissions, detail, and cached tokens).
 */
export function invalidateUserCache(userId: string): void {
  cacheDelete(`rbac:user_perms:${userId}`)
  cacheDelete(`rbac:user_perms_detail:${userId}`)
  // Purge any tokens associated with this user
  for (const [key, entry] of cacheStore.entries()) {
    if (key.startsWith('auth:token:') && entry.value?.id === userId) {
      cacheStore.delete(key)
    }
  }
}

/**
 * Invalidate roles catalog, all user permissions, and user list.
 * Modifying or deleting a role affects all users who inherit that role.
 */
export function invalidateRolesCache(): void {
  cacheDelete('rbac:roles_catalog')
  cacheDelete('rbac:users_list')
  cacheDeletePrefix('rbac:user_perms:')
  cacheDeletePrefix('rbac:user_perms_detail:')
}

/**
 * Invalidate permissions catalog and user permissions detail cache.
 */
export function invalidatePermissionsCatalogCache(): void {
  cacheDelete('rbac:perms_catalog')
  cacheDeletePrefix('rbac:user_perms_detail:')
}

/**
 * Clear entire RBAC & Auth cache (useful for tests or hard resets).
 */
export function clearAllRbacCache(): void {
  cacheStore.clear()
}
