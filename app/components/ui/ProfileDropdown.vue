<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

const props = withDefaults(defineProps<{
  variant?: 'dark' | 'light'
}>(), {
  variant: 'dark',
})

const authStore = useAuthStore()
const open = ref(false)

const initials = computed(() => {
  const email = authStore.user?.email ?? ''
  return email.charAt(0).toUpperCase()
})

const toggle = () => {
  open.value = !open.value
}

const handleLogout = async () => {
  open.value = false
  await authStore.logout()
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (open.value && !target.closest('[data-profile-dropdown]')) {
    open.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div data-profile-dropdown class="relative inline-block">
    <button
      @click.stop="toggle"
      class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition shrink-0"
      :class="variant === 'dark' ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'"
      :title="authStore.user?.email ?? ''"
    >
      {{ initials }}
    </button>

    <div
      v-if="open"
      class="absolute right-0 top-full mt-2 z-50 min-w-[200px] bg-white border border-slate-150 rounded-2xl shadow-xl py-2"
      @click.stop
    >
      <div class="px-4 py-2 border-b border-slate-100">
        <p class="text-xs font-bold text-slate-500 truncate">{{ authStore.user?.email }}</p>
        <p class="text-[10px] font-semibold text-slate-400 capitalize mt-0.5">{{ authStore.role }}</p>
      </div>

      <NuxtLink
        to="/change-password"
        @click="open = false"
        class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
      >
        <Icon name="heroicons:key" class="w-4 h-4 text-slate-400" />
        Ganti Password
      </NuxtLink>

      <button
        @click="handleLogout"
        class="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-danger hover:bg-red-50 transition w-full text-left"
      >
        <Icon name="heroicons:arrow-right-on-rectangle" class="w-4 h-4" />
        Keluar
      </button>
    </div>
  </div>
</template>
