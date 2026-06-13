// middleware/admin.ts
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser()
  const authStore = useAuthStore()

  authStore.initializeRole()

  if (!user.value) {
    return navigateTo('/login')
  }

  if (authStore.role !== 'admin') {
    return navigateTo('/pos')
  }
})
