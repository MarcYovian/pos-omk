// stores/auth.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const supabase = useSupabase()
  const user = useSupabaseUser() // Auto-imported from @nuxtjs/supabase
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
    user,
    role,
    isLoading,
    getRole,
    login,
    logout,
    initializeRole
  }
})
