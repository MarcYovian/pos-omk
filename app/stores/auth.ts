// stores/auth.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const supabase = useSupabase()
  const user = useSupabaseUser() // Auto-imported from @nuxtjs/supabase
  const currentUser = computed(() => {
    if (!user.value) return null
    return {
      ...user.value,
      id: user.value.id || (user.value as any).sub
    }
  })

  const role = ref<'admin' | 'cashier' | string | null>(null)
  const permissions = ref<string[]>([])
  const isLoading = ref(false)
  const passwordChangeCompleted = ref(false)

  const isSuperAdmin = computed(() => {
    return role.value === 'super_admin' || permissions.value.includes('platform:manage')
  })

  const can = (permissionCode: string): boolean => {
    if (isSuperAdmin.value) return true
    if (role.value === 'admin') {
      if (permissionCode.startsWith('platform:') || permissionCode === 'users:manage_platform') {
        return permissions.value.includes(permissionCode)
      }
      return true
    }
    return permissions.value.includes(permissionCode)
  }

  const hasRole = (roleCode: string): boolean => {
    return role.value === roleCode
  }

  const needsPasswordChange = computed(() => {
    if (passwordChangeCompleted.value) return false
    return user.value?.user_metadata?.force_password_change === true
  })

  const markPasswordChangeCompleted = () => {
    passwordChangeCompleted.value = true
  }

  const getRole = (): 'admin' | 'cashier' => {
    if (isSuperAdmin.value || role.value === 'admin' || role.value === 'super_admin') {
      return 'admin'
    }
    if (role.value === 'cashier') return 'cashier'
    const r = (user.value as any)?.role || user.value?.user_metadata?.role
    return (r === 'admin' || r === 'cashier') ? r : 'cashier'
  }

  // Client-side cache & request deduplication state
  let inFlightPermsPromise: Promise<void> | null = null
  let lastPermissionsFetch = 0
  const PERMISSIONS_CACHE_TTL = 60_000 // 60s freshness threshold

  const fetchUserRole = async (targetUser?: any): Promise<void> => {
    const u = targetUser || user.value
    if (!u) {
      role.value = null
      return
    }

    const fallbackRole = (u as any)?.role || u?.user_metadata?.role
    if (fallbackRole) {
      role.value = (fallbackRole === 'admin' || fallbackRole === 'cashier' || fallbackRole === 'super_admin') 
        ? fallbackRole 
        : 'cashier'
    } else if (!role.value) {
      role.value = 'cashier'
    }

    if (typeof (supabase as any)?.rpc === 'function') {
      try {
        const res = await (supabase as any).rpc('get_user_role')
        if (res && !res.error && res.data) {
          role.value = res.data
        }
      } catch (e) {
        console.warn('Gagal memuat peran pengguna:', e)
      }
    }
  }

  const fetchUserPermissions = async (force: boolean = false): Promise<void> => {
    if (!user.value) {
      permissions.value = []
      lastPermissionsFetch = 0
      return
    }

    // 1. Fresh cache hit: reuse existing permissions if within TTL
    if (!force && permissions.value.length > 0 && (Date.now() - lastPermissionsFetch < PERMISSIONS_CACHE_TTL)) {
      return
    }

    // 2. In-flight request deduplication: reuse active promise
    if (inFlightPermsPromise) {
      return inFlightPermsPromise
    }

    inFlightPermsPromise = (async () => {
      if (typeof (supabase as any)?.rpc === 'function') {
        try {
          const userId = user.value.id || (user.value as any).sub
          const res = await (supabase as any).rpc('get_user_effective_permissions', {
            p_user_id: userId
          })
          if (res && !res.error && res.data) {
            permissions.value = (res.data as Array<{ permission_code: string }>).map(p => p.permission_code)
            lastPermissionsFetch = Date.now()
          }
        } catch (e) {
          console.warn('Gagal memuat izin pengguna:', e)
        }
      }
    })().finally(() => {
      inFlightPermsPromise = null
    })

    return inFlightPermsPromise
  }

  const login = async (email: string, password: string) => {
    isLoading.value = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      if (data.user?.user_metadata?.is_active === false) {
        await supabase.auth.signOut()
        throw new Error('Akun Anda dinonaktifkan. Silakan hubungi admin.')
      }

      await fetchUserRole(data.user)
      await fetchUserPermissions(true)
      return data
    } finally {
      isLoading.value = false
    }
  }

  const logout = async () => {
    isLoading.value = true
    try {
      await supabase.auth.signOut()
      role.value = null
      permissions.value = []
      lastPermissionsFetch = 0
      inFlightPermsPromise = null
      try {
        const companyStore = useCompanyStore()
        companyStore.reset()
      } catch {
        // ignore
      }
      navigateTo('/login')
    } finally {
      isLoading.value = false
    }
  }

  const initializeRole = async () => {
    if (user.value) {
      const fallbackRole = (user.value as any)?.role || user.value?.user_metadata?.role
      role.value = (fallbackRole === 'admin' || fallbackRole === 'cashier' || fallbackRole === 'super_admin') 
        ? fallbackRole 
        : 'cashier'
      await fetchUserRole()
      await fetchUserPermissions()
    } else {
      role.value = null
      permissions.value = []
    }
  }

  return {
    user: currentUser,
    role,
    permissions,
    isSuperAdmin,
    can,
    hasRole,
    isLoading,
    needsPasswordChange,
    markPasswordChangeCompleted,
    getRole,
    fetchUserPermissions,
    login,
    logout,
    initializeRole
  }
})
