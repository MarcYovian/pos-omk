// middleware/permission.ts
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware(async (to) => {
  const user = useSupabaseUser()
  const authStore = useAuthStore()

  if (!user.value) {
    return navigateTo('/login')
  }

  if (authStore.permissions.length === 0 && !authStore.isSuperAdmin) {
    await authStore.fetchUserPermissions()
  }

  const requiredPermission = to.meta.permission as string | undefined

  if (requiredPermission && !authStore.can(requiredPermission)) {
    return navigateTo('/pos')
  }
})
