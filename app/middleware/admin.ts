// middleware/admin.ts
import { useAuthStore } from '~/stores/auth'

export default defineNuxtRouteMiddleware((to, from) => {
  const user = useSupabaseUser()
  const authStore = useAuthStore()

  authStore.initializeRole()

  if (!user.value) {
    return navigateTo('/login')
  }

  // Admin superuser bypass
  if (authStore.role === 'admin' || authStore.isSuperAdmin) {
    return
  }

  // Check specific route permission if defined
  const requiredPermission = to?.meta?.permission as string | undefined
  if (requiredPermission) {
    if (!authStore.can(requiredPermission)) {
      return navigateTo('/pos')
    }
    return
  }

  // If no specific permission specified, ensure user has at least one administrative permission
  const hasAnyAdminPerm = authStore.permissions.some(p => p !== 'pos:transact')
  if (!hasAnyAdminPerm) {
    return navigateTo('/pos')
  }
})
