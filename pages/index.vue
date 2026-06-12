<!-- pages/index.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['auth']
})

const authStore = useAuthStore()

onMounted(() => {
  authStore.initializeRole()
  if (authStore.role === 'admin') {
    navigateTo('/admin')
  } else {
    navigateTo('/pos')
  }
})
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-slate-50">
    <div class="text-center">
      <svg class="animate-spin h-8 w-8 text-brand-900 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p class="text-slate-600 font-medium">Memuat aplikasi...</p>
    </div>
  </div>
</template>
