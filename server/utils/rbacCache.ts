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
  COMPANY_PROFILE: 300, // 300s (5m) for company profile
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
  let authHeader: string | undefined
  try {
    authHeader = typeof getRequestHeader === 'function'
      ? getRequestHeader(event, 'authorization')
      : (event?.node?.req?.headers ? event.node.req.headers['authorization'] : undefined)
  } catch {
    authHeader = event?.node?.req?.headers ? event.node.req.headers['authorization'] : undefined
  }
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

// 2. User Effective Permissions Cache (Scoped per tenant)
export function getCachedUserPermissions(userId: string, companyId?: string): string[] | null {
  const key = companyId ? `rbac:user_perms:${userId}:${companyId}` : `rbac:user_perms:${userId}`
  return cacheGet<string[]>(key)
}

export function setCachedUserPermissions(
  userId: string,
  companyIdOrPerms: string | string[],
  permsOrTtl?: string[] | number,
  ttlSeconds: number = RBAC_CACHE_TTL.USER_PERMS
) {
  if (Array.isArray(companyIdOrPerms)) {
    const ttl = typeof permsOrTtl === 'number' ? permsOrTtl : ttlSeconds
    cacheSet(`rbac:user_perms:${userId}`, companyIdOrPerms, ttl)
  } else {
    const perms = Array.isArray(permsOrTtl) ? permsOrTtl : []
    cacheSet(`rbac:user_perms:${userId}:${companyIdOrPerms}`, perms, ttlSeconds)
  }
}

// 3. Roles Catalog Cache
export function getCachedRoles(companyId?: string): any[] | null {
  const key = companyId ? `rbac:roles_catalog:${companyId}` : 'rbac:roles_catalog'
  return cacheGet<any[]>(key)
}

export function setCachedRoles(
  companyIdOrRoles: string | any[],
  rolesOrTtl?: any[] | number,
  ttlSeconds: number = RBAC_CACHE_TTL.ROLES_CATALOG
) {
  if (Array.isArray(companyIdOrRoles)) {
    const ttl = typeof rolesOrTtl === 'number' ? rolesOrTtl : ttlSeconds
    cacheSet('rbac:roles_catalog', companyIdOrRoles, ttl)
  } else {
    const roles = Array.isArray(rolesOrTtl) ? rolesOrTtl : []
    cacheSet(`rbac:roles_catalog:${companyIdOrRoles}`, roles, ttlSeconds)
  }
}

// 4. Permissions Master Catalog Cache (Global)
export function getCachedPermissionsCatalog(): any[] | null {
  return cacheGet<any[]>('rbac:perms_catalog')
}

export function setCachedPermissionsCatalog(perms: any[], ttlSeconds: number = RBAC_CACHE_TTL.PERMS_CATALOG) {
  cacheSet('rbac:perms_catalog', perms, ttlSeconds)
}

// 5. Users List Cache (Scoped per tenant)
export function getCachedUsers(companyId?: string): any[] | null {
  const key = companyId ? `rbac:users_list:${companyId}` : 'rbac:users_list'
  return cacheGet<any[]>(key)
}

export function setCachedUsers(
  companyIdOrUsers: string | any[],
  usersOrTtl?: any[] | number,
  ttlSeconds: number = RBAC_CACHE_TTL.USERS_LIST
) {
  if (Array.isArray(companyIdOrUsers)) {
    const ttl = typeof usersOrTtl === 'number' ? usersOrTtl : ttlSeconds
    cacheSet('rbac:users_list', companyIdOrUsers, ttl)
  } else if (!companyIdOrUsers) {
    const users = Array.isArray(usersOrTtl) ? usersOrTtl : []
    cacheSet('rbac:users_list', users, ttlSeconds)
  } else {
    const users = Array.isArray(usersOrTtl) ? usersOrTtl : []
    cacheSet(`rbac:users_list:${companyIdOrUsers}`, users, ttlSeconds)
  }
}

// 6. User Permissions Detail Cache
export function getCachedUserPermissionsDetail(userId: string, companyId?: string): any | null {
  const key = companyId ? `rbac:user_perms_detail:${userId}:${companyId}` : `rbac:user_perms_detail:${userId}`
  return cacheGet<any>(key)
}

export function setCachedUserPermissionsDetail(
  userId: string,
  companyIdOrData: string | any,
  dataOrTtl?: any,
  ttlSeconds: number = RBAC_CACHE_TTL.USER_PERMS
) {
  if (typeof companyIdOrData === 'object' && companyIdOrData !== null) {
    const ttl = typeof dataOrTtl === 'number' ? dataOrTtl : ttlSeconds
    cacheSet(`rbac:user_perms_detail:${userId}`, companyIdOrData, ttl)
  } else {
    cacheSet(`rbac:user_perms_detail:${userId}:${companyIdOrData}`, dataOrTtl, ttlSeconds)
  }
}

// 7. Company Profile Cache
export function getCachedCompanyProfile(companyId: string): any | null {
  return cacheGet<any>(`company:profile:${companyId}`)
}

export function setCachedCompanyProfile(companyId: string, data: any, ttlSeconds: number = RBAC_CACHE_TTL.COMPANY_PROFILE) {
  cacheSet(`company:profile:${companyId}`, data, ttlSeconds)
}

// -------------------------------------------------------------
// Invalidation Helpers (Event-Driven & Multi-Tenant)
// -------------------------------------------------------------

export function invalidateCompanyUsersCache(companyId: string): void {
  cacheDelete(`rbac:users_list:${companyId}`)
}

export function invalidateCompanyUserCache(userId: string, companyId?: string): void {
  if (companyId) {
    cacheDelete(`rbac:user_perms:${userId}:${companyId}`)
    cacheDelete(`rbac:user_perms_detail:${userId}:${companyId}`)
  } else {
    cacheDelete(`rbac:user_perms:${userId}`)
    cacheDelete(`rbac:user_perms_detail:${userId}`)
    cacheDeletePrefix(`rbac:user_perms:${userId}:`)
    cacheDeletePrefix(`rbac:user_perms_detail:${userId}:`)
  }
}

export function invalidateCompanyRolesCache(companyId: string): void {
  cacheDelete(`rbac:roles_catalog:${companyId}`)
  cacheDeletePrefix('rbac:user_perms:')
  cacheDeletePrefix('rbac:user_perms_detail:')
  cacheDelete(`rbac:users_list:${companyId}`)
}

export function invalidateCompanyProfileCache(companyId: string): void {
  cacheDelete(`company:profile:${companyId}`)
}

export function invalidateAllCompanyCache(companyId: string): void {
  cacheDelete(`rbac:users_list:${companyId}`)
  cacheDelete(`rbac:roles_catalog:${companyId}`)
  cacheDelete(`company:profile:${companyId}`)
  cacheDeletePrefix('rbac:user_perms:')
  cacheDeletePrefix('rbac:user_perms_detail:')
}

/**
 * Invalidate cached users list (legacy + tenant-aware fallback).
 */
export function invalidateUsersCache(companyId?: string): void {
  if (companyId) {
    invalidateCompanyUsersCache(companyId)
  } else {
    cacheDelete('rbac:users_list')
    cacheDeletePrefix('rbac:users_list:')
  }
}

/**
 * Invalidate cache for a specific user (effective permissions, detail, and cached tokens).
 */
export function invalidateUserCache(userId: string, companyId?: string): void {
  invalidateCompanyUserCache(userId, companyId)
  // Purge any tokens associated with this user
  for (const [key, entry] of cacheStore.entries()) {
    if (key.startsWith('auth:token:') && entry.value?.id === userId) {
      cacheStore.delete(key)
    }
  }
}

/**
 * Invalidate roles catalog, all user permissions, and user list.
 */
export function invalidateRolesCache(companyId?: string): void {
  if (companyId) {
    invalidateCompanyRolesCache(companyId)
  } else {
    cacheDelete('rbac:roles_catalog')
    cacheDeletePrefix('rbac:roles_catalog:')
    cacheDelete('rbac:users_list')
    cacheDeletePrefix('rbac:users_list:')
    cacheDeletePrefix('rbac:user_perms:')
    cacheDeletePrefix('rbac:user_perms_detail:')
  }
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
