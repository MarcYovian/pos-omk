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
  const role = ref<'admin' | 'cashier' | null>(null)
  const isLoading = ref(false)

  const getRole = (): 'admin' | 'cashier' => {
    const r = user.value?.user_metadata?.role
    return (r === 'admin' || r === 'cashier') ? r : 'cashier'
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

      const userRole = data.user?.user_metadata?.role
      role.value = (userRole === 'admin' || userRole === 'cashier') ? userRole : 'cashier'
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
      navigateTo('/login')
    } finally {
      isLoading.value = false
    }
  }

  const initializeRole = () => {
    if (user.value) {
      const r = user.value.user_metadata?.role
      role.value = (r === 'admin' || r === 'cashier') ? r : 'cashier'
    } else {
      role.value = null
    }
  }

  return {
    user: currentUser,
    role,
    isLoading,
    getRole,
    login,
    logout,
    initializeRole
  }
})
