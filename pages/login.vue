<!-- pages/login.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppToast from '~/components/ui/AppToast.vue'

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const authStore = useAuthStore()
const { addToast } = useToast()
const user = useSupabaseUser()

onMounted(() => {
  // If user is already authenticated, redirect to role home
  if (user.value) {
    authStore.initializeRole()
    if (authStore.role === 'admin') {
      navigateTo('/admin')
    } else {
      navigateTo('/pos')
    }
  }
})

const handleLogin = async () => {
  isLoading.value = true
  errorMessage.value = null

  try {
    await authStore.login(email.value, password.value)
    
    addToast({
      type: 'success',
      message: 'Login berhasil!'
    })

    if (authStore.role === 'admin') {
      navigateTo('/admin')
    } else {
      navigateTo('/pos')
    }
  } catch (error: any) {
    errorMessage.value = 'Email atau password salah'
    addToast({
      type: 'danger',
      message: 'Email atau password salah'
    })
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-slate-900 px-4">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 flex flex-col gap-6">
      <div class="text-center flex flex-col gap-2">
        <h1 class="text-2xl font-black text-brand-900 tracking-tight">OMK POS</h1>
        <p class="text-sm text-slate-500 font-medium">Sistem POS Konsinyasi Marketplace OMK</p>
      </div>

      <form @submit.prevent="handleLogin" class="flex flex-col gap-4">
        <AppInput
          v-model="email"
          label="Email"
          type="email"
          placeholder="nama@email.com"
          required
        />
        
        <AppInput
          v-model="password"
          label="Kata Sandi"
          type="password"
          placeholder="••••••••"
          required
        />

        <div v-if="errorMessage" class="text-xs text-danger font-semibold text-center mt-2">
          {{ errorMessage }}
        </div>

        <AppButton
          type="submit"
          :loading="isLoading"
          full-width
          class="mt-4"
        >
          Masuk
        </AppButton>
      </form>
    </div>
    <AppToast />
  </div>
</template>
