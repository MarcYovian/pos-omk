<!-- pages/reset-password.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppToast from '~/components/ui/AppToast.vue'

definePageMeta({
  middleware: [] // Public page to allow landing with recovery tokens
})

const { addToast } = useToast()
const supabase = useSupabase()

const newPassword = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)

const handleResetSubmit = async () => {
  if (!newPassword.value || !confirmPassword.value) {
    addToast({ type: 'warning', message: 'Harap isi semua kolom' })
    return
  }

  if (newPassword.value.length < 6) {
    addToast({ type: 'warning', message: 'Kata sandi minimal harus 6 karakter' })
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    addToast({ type: 'warning', message: 'Konfirmasi kata sandi tidak cocok' })
    return
  }

  isSubmitting.value = true
  try {
    // Update the password of the currently authenticated recovery session user
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value
    })

    if (error) throw error

    addToast({ type: 'success', message: 'Kata sandi berhasil diperbarui! Silakan masuk kembali.' })

    // Sign out to clear the temporary recovery session
    await supabase.auth.signOut()

    // Redirect to login page
    setTimeout(() => {
      navigateTo('/login')
    }, 1500)
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal memperbarui kata sandi' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <div class="bg-white border border-slate-150 p-8 rounded-3xl shadow-xl max-w-sm w-full flex flex-col gap-6">
      
      <!-- Brand Logo / Header -->
      <div class="text-center flex flex-col items-center gap-2">
        <div class="p-3 bg-brand-50 text-brand-900 rounded-2xl w-12 h-12 flex items-center justify-center">
          <Icon name="heroicons:key" class="w-6 h-6" />
        </div>
        <h1 class="text-xl font-black text-slate-800 tracking-tight mt-1">Setel Ulang Sandi</h1>
        <p class="text-xs font-semibold text-slate-400">
          Masukkan kata sandi baru Anda di bawah ini
        </p>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleResetSubmit" class="flex flex-col gap-4">
        <AppInput
          v-model="newPassword"
          label="Kata Sandi Baru"
          type="password"
          placeholder="Min. 6 karakter"
          required
        />

        <AppInput
          v-model="confirmPassword"
          label="Konfirmasi Kata Sandi"
          type="password"
          placeholder="Masukkan ulang kata sandi"
          required
        />

        <AppButton
          type="submit"
          :loading="isSubmitting"
          full-width
          class="mt-2"
        >
          Perbarui Kata Sandi
        </AppButton>
      </form>

    </div>
    <AppToast />
  </div>
</template>
