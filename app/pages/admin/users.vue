<!-- pages/admin/users.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'

definePageMeta({
  middleware: ['auth', 'admin']
})

const authStore = useAuthStore()
const { addToast } = useToast()
const supabase = useSupabase()

interface UserRecord {
  id: string
  email: string
  role: 'admin' | 'cashier'
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
}

// State
const users = ref<UserRecord[]>([])
const isLoading = ref(false)

// Modals
const isCreateOpen = ref(false)
const createEmail = ref('')
const createPassword = ref('')
const createRole = ref<'admin' | 'cashier'>('cashier')
const isCreating = ref(false)

const isEditOpen = ref(false)
const editingUser = ref<UserRecord | null>(null)
const editEmail = ref('')
const editPassword = ref('')
const editRole = ref<'admin' | 'cashier'>('cashier')
const isUpdating = ref(false)

const isDeleteOpen = ref(false)
const deletingUser = ref<UserRecord | null>(null)
const isDeleting = ref(false)

// Fetch Users
const fetchUsers = async () => {
  isLoading.value = true
  try {
    const { data, error } = await (supabase.rpc as any)('get_all_users')
    if (error) throw error
    users.value = (data as any) || []
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal memuat daftar pengguna' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})

// Handlers
const handleOpenCreate = () => {
  createEmail.value = ''
  createPassword.value = ''
  createRole.value = 'cashier'
  isCreateOpen.value = true
}

const handleCreateSubmit = async () => {
  if (!createEmail.value.trim()) {
    addToast({ type: 'warning', message: 'Harap masukkan alamat email' })
    return
  }
  isCreating.value = true
  try {
    // Generate a random temporary password (the user will reset it via email link anyway)
    const tempPassword = crypto.randomUUID()

    const { error } = await (supabase.rpc as any)('admin_create_user', {
      p_email: createEmail.value.trim(),
      p_password: tempPassword,
      p_role: createRole.value
    })
    if (error) throw error

    // Send reset password email to the new user
    const redirectUrl = `${window.location.origin}/reset-password`
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(createEmail.value.trim(), {
      redirectTo: redirectUrl
    })

    if (resetError) {
      console.warn('Gagal mengirim email reset password:', resetError.message)
      addToast({ type: 'warning', message: 'User dibuat, tetapi gagal mengirim email link setel ulang sandi.' })
    } else {
      addToast({ type: 'success', message: 'Pengguna berhasil dibuat & email setel ulang sandi dikirim!' })
    }

    isCreateOpen.value = false
    await fetchUsers()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal membuat pengguna' })
  } finally {
    isCreating.value = false
  }
}

const handleOpenEdit = (user: UserRecord) => {
  editingUser.value = user
  editEmail.value = user.email
  editPassword.value = ''
  editRole.value = user.role
  isEditOpen.value = true
}

const handleEditSubmit = async () => {
  if (!editingUser.value || !editEmail.value.trim()) {
    addToast({ type: 'warning', message: 'Email tidak boleh kosong' })
    return
  }
  isUpdating.value = true
  try {
    const { error } = await (supabase.rpc as any)('admin_update_user', {
      p_user_id: editingUser.value.id,
      p_email: editEmail.value.trim(),
      p_password: editPassword.value || null,
      p_role: editRole.value
    })
    if (error) throw error
    addToast({ type: 'success', message: 'Detail pengguna berhasil diperbarui' })
    isEditOpen.value = false
    await fetchUsers()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal memperbarui pengguna' })
  } finally {
    isUpdating.value = false
  }
}

const handleOpenDelete = (user: UserRecord) => {
  if (user.id === authStore.user?.id) {
    addToast({ type: 'warning', message: 'Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif' })
    return
  }
  deletingUser.value = user
  isDeleteOpen.value = true
}

const handleDeleteSubmit = async () => {
  if (!deletingUser.value) return
  isDeleting.value = true
  try {
    const { error } = await (supabase.rpc as any)('admin_delete_user', {
      p_user_id: deletingUser.value.id
    })
    if (error) throw error
    addToast({ type: 'success', message: 'Pengguna berhasil dihapus' })
    isDeleteOpen.value = false
    await fetchUsers()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal menghapus pengguna' })
  } finally {
    isDeleting.value = false
  }
}

const handleSendResetEmail = async (email: string) => {
  try {
    const redirectUrl = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    })
    if (error) throw error
    addToast({ type: 'success', message: `Email link reset sandi terkirim ke ${email}!` })
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal mengirim email reset sandi' })
  }
}

const isTogglingActive = ref<Record<string, boolean>>({})

const handleToggleActive = async (user: UserRecord) => {
  if (user.email === 'marcellinusyovian@gmail.com') return
  isTogglingActive.value[user.id] = true
  try {
    const { error } = await supabase.rpc('admin_toggle_user_active', {
      p_user_id: user.id,
      p_is_active: !user.is_active
    })
    if (error) throw error
    addToast({
      type: 'success',
      message: `Status pengguna ${user.email} berhasil diubah`
    })
    await fetchUsers()
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal mengubah status aktif pengguna'
    })
  } finally {
    isTogglingActive.value[user.id] = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-30 bg-gradient-to-r from-brand-900 to-brand-700 text-white px-4 py-4 shadow-md flex items-center justify-between backdrop-blur-md">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin" class="hover:bg-white/10 p-2 rounded-xl transition flex items-center justify-center">
          <Icon name="heroicons:arrow-left" class="w-5 h-5" />
        </NuxtLink>
        <div>
          <h1 class="text-lg font-black tracking-tight leading-none">Manajemen Pengguna</h1>
          <p class="text-[10px] text-brand-200 mt-1 font-medium font-mono">Layanan Pengelola</p>
        </div>
      </div>
      <AppButton
        @click="handleOpenCreate"
        size="sm"
        variant="secondary"
        class="!bg-white !text-brand-900 hover:!bg-slate-100 border-0 text-xs font-bold shadow-sm"
      >
        Tambah User
      </AppButton>
    </header>

    <!-- Content -->
    <main class="flex-grow p-6 max-w-4xl w-full mx-auto flex flex-col gap-6">
      
      <div v-if="isLoading" class="text-center py-12 text-slate-400">
        Memuat daftar pengguna...
      </div>

      <div v-else-if="users.length === 0" class="text-center py-12 bg-white border border-slate-150 rounded-2xl shadow-sm text-slate-400">
        Belum ada pengguna terdaftar.
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="u in users"
          :key="u.id"
          class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4"
        >
          <div class="flex flex-col gap-2">
            <!-- Email & Anda Badge -->
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-extrabold text-slate-800 text-sm leading-snug break-all flex-grow">
                {{ u.email }}
              </h3>
              <span v-if="u.id === authStore.user?.id" class="text-[9px] bg-brand-50 text-brand-900 border border-brand-100 font-extrabold px-2 py-0.5 rounded-full shrink-0">
                Anda
              </span>
            </div>

            <!-- User ID -->
            <p class="text-[10px] text-slate-400 font-semibold font-mono break-all">ID: {{ u.id }}</p>
            
            <!-- Badges -->
            <div class="flex flex-wrap gap-2 mt-1">
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
                :class="u.role === 'admin' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'"
              >
                {{ u.role }}
              </span>
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="u.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'"
              >
                {{ u.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
          </div>

          <!-- Actions & Timestamps Row -->
          <div class="border-t border-slate-100 pt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <!-- Timestamps -->
            <div class="flex justify-between sm:flex-col sm:gap-0.5 text-[10px] text-slate-400 font-semibold font-mono">
              <span>Dibuat: {{ new Date(u.created_at).toLocaleDateString('id-ID') }}</span>
              <span v-if="u.last_sign_in_at">Masuk: {{ new Date(u.last_sign_in_at).toLocaleDateString('id-ID') }}</span>
              <span v-else class="text-slate-300 font-normal">Belum masuk</span>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center justify-end gap-1.5 border-t border-slate-50 pt-2.5 sm:border-t-0 sm:pt-0">
              <!-- Toggle active/inactive status (for marcellinusyovian@gmail.com only) -->
              <button
                v-if="authStore.user?.email === 'marcellinusyovian@gmail.com' && u.email !== 'marcellinusyovian@gmail.com'"
                @click="handleToggleActive(u)"
                :disabled="isTogglingActive[u.id]"
                class="p-1.5 rounded-lg transition min-h-[32px] min-w-[32px] flex items-center justify-center disabled:opacity-50 border border-slate-150 bg-slate-50"
                :class="u.is_active ? 'text-slate-400 hover:text-danger hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-green-50'"
                :title="u.is_active ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'"
              >
                <Icon :name="u.is_active ? 'heroicons:no-symbol' : 'heroicons:check-circle'" class="w-4.5 h-4.5" />
              </button>
              <button
                @click="handleSendResetEmail(u.email)"
                class="p-1.5 text-slate-400 hover:text-warning hover:bg-amber-50 border border-slate-150 bg-slate-50 rounded-lg transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Kirim Link Reset Sandi"
              >
                <Icon name="heroicons:key" class="w-4.5 h-4.5" />
              </button>
              <button
                @click="handleOpenEdit(u)"
                class="p-1.5 text-slate-400 hover:text-brand-900 hover:bg-slate-100 border border-slate-150 bg-slate-50 rounded-lg transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Edit Pengguna"
              >
                <Icon name="heroicons:pencil-square" class="w-4.5 h-4.5" />
              </button>
              <button
                @click="handleOpenDelete(u)"
                v-if="u.id !== authStore.user?.id"
                class="p-1.5 text-slate-400 hover:text-danger hover:bg-red-50 border border-slate-150 bg-slate-50 rounded-lg transition min-h-[32px] min-w-[32px] flex items-center justify-center"
                title="Hapus Pengguna"
              >
                <Icon name="heroicons:trash" class="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

    </main>

    <!-- Create User Modal -->
    <AppModal v-model="isCreateOpen" title="Daftarkan Pengguna Baru">
      <form @submit.prevent="handleCreateSubmit" class="flex flex-col gap-4 py-2">
        <AppInput
          v-model="createEmail"
          label="Alamat Email"
          type="email"
          placeholder="email@example.com"
          required
        />
        
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-slate-500">Peran (Role)</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input type="radio" v-model="createRole" value="cashier" class="accent-brand-900 w-4 h-4" />
              <span>Kasir (Cashier)</span>
            </label>
            <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input type="radio" v-model="createRole" value="admin" class="accent-brand-900 w-4 h-4" />
              <span>Admin</span>
            </label>
          </div>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="isCreateOpen = false">Batal</AppButton>
        <AppButton :loading="isCreating" @click="handleCreateSubmit">Simpan</AppButton>
      </template>
    </AppModal>

    <!-- Edit User Modal -->
    <AppModal v-model="isEditOpen" title="Edit Detail Pengguna">
      <form @submit.prevent="handleEditSubmit" class="flex flex-col gap-4 py-2">
        <AppInput
          v-model="editEmail"
          label="Alamat Email"
          type="email"
          placeholder="email@example.com"
          required
        />
        <AppInput
          v-model="editPassword"
          label="Kata Sandi Baru"
          type="password"
          placeholder="Kosongkan jika tidak ingin diubah"
        />

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-bold text-slate-500">Peran (Role)</label>
          <div class="flex gap-4">
            <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input type="radio" v-model="editRole" value="cashier" class="accent-brand-900 w-4 h-4" />
              <span>Kasir (Cashier)</span>
            </label>
            <label class="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
              <input type="radio" v-model="editRole" value="admin" class="accent-brand-900 w-4 h-4" />
              <span>Admin</span>
            </label>
          </div>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="isEditOpen = false">Batal</AppButton>
        <AppButton :loading="isUpdating" @click="handleEditSubmit">Simpan Perubahan</AppButton>
      </template>
    </AppModal>

    <!-- Delete Confirmation Modal -->
    <AppModal v-model="isDeleteOpen" title="Hapus Pengguna">
      <div class="py-2 flex flex-col gap-3">
        <p class="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus akun pengguna berikut?
        </p>
        <div class="bg-red-50 border border-red-150 p-4 rounded-xl">
          <span class="text-xs font-bold text-slate-400 block">EMAIL PENGGUNA</span>
          <span class="font-bold text-red-700 text-sm leading-relaxed block mt-0.5">{{ deletingUser?.email }}</span>
        </div>
        <p class="text-xs font-semibold text-danger">
          ⚠️ Tindakan ini permanen dan tidak dapat dibatalkan.
        </p>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isDeleteOpen = false">Batal</AppButton>
        <AppButton variant="danger" :loading="isDeleting" @click="handleDeleteSubmit">Hapus Sekarang</AppButton>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>
