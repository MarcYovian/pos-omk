// middleware/auth.ts
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser()
  const authStore = useAuthStore()

  // Initialize role state if user is logged in
  authStore.initializeRole()

  if (!user.value) {
    return navigateTo('/login')
  }

  if (user.value?.user_metadata?.is_active === false) {
    authStore.logout()
    return navigateTo('/login')
  }
})
