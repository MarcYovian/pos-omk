<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppToast from '~/components/ui/AppToast.vue'

definePageMeta({
  middleware: ['auth'],
})

const authStore = useAuthStore()
const { addToast } = useToast()
const supabase = useSupabase()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const isSubmitting = ref(false)

const handleSubmit = async () => {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    addToast({ type: 'warning', message: 'Harap isi semua kolom' })
    return
  }

  if (newPassword.value.length < 6) {
    addToast({ type: 'warning', message: 'Kata sandi baru minimal harus 6 karakter' })
    return
  }

  if (newPassword.value !== confirmPassword.value) {
    addToast({ type: 'warning', message: 'Konfirmasi kata sandi tidak cocok' })
    return
  }

  if (currentPassword.value === newPassword.value) {
    addToast({ type: 'warning', message: 'Kata sandi baru tidak boleh sama dengan kata sandi saat ini' })
    return
  }

  isSubmitting.value = true
  try {
    const email = authStore.user?.email
    if (!email) throw new Error('User email not found')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword.value,
    })

    if (signInError) throw new Error('Password saat ini salah')

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword.value,
    })

    if (updateError) throw updateError

    if (authStore.user?.id) {
      try {
        await $fetch(`/api/users/${authStore.user.id}/password-changed`, {
          method: 'POST',
        })
      } catch {
        // non-critical, proceed anyway
      }
    }

    addToast({ type: 'success', message: 'Kata sandi berhasil diperbarui!' })

    setTimeout(() => {
      if (authStore.role === 'admin') {
        navigateTo('/admin')
      } else {
        navigateTo('/pos')
      }
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
      <div class="text-center flex flex-col items-center gap-2">
        <div class="p-3 bg-brand-50 text-brand-900 rounded-2xl w-12 h-12 flex items-center justify-center">
          <Icon name="heroicons:key" class="w-6 h-6" />
        </div>
        <h1 class="text-xl font-black text-slate-800 tracking-tight mt-1">Ganti Kata Sandi</h1>
        <p class="text-xs font-semibold text-slate-400">
          Masukkan password saat ini dan password baru
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <AppInput
          v-model="currentPassword"
          label="Kata Sandi Saat Ini"
          type="password"
          placeholder="Masukkan password saat ini"
          required
        />

        <AppInput
          v-model="newPassword"
          label="Kata Sandi Baru"
          type="password"
          placeholder="Min. 6 karakter"
          required
        />

        <AppInput
          v-model="confirmPassword"
          label="Konfirmasi Kata Sandi Baru"
          type="password"
          placeholder="Masukkan ulang kata sandi baru"
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
