<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'
import ProfileDropdown from '~/components/ui/ProfileDropdown.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const authStore = useAuthStore()
const { addToast } = useToast()

// State
const users = ref<UserRecord[]>([])
const isLoading = ref(false)
const searchQuery = ref('')

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return users.value
  const query = searchQuery.value.toLowerCase().trim()
  return users.value.filter(u => 
    u.email.toLowerCase().includes(query) || 
    u.role.toLowerCase().includes(query) ||
    u.id.toLowerCase().includes(query)
  )
})

// Modals
const isCreateOpen = ref(false)
const createEmail = ref('')
const createRole = ref<'admin' | 'cashier'>('cashier')
const isCreating = ref(false)

const createdPassword = ref('')
const isPasswordModalOpen = ref(false)

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
    const data = await $fetch<UserRecord[]>('/api/users')
    users.value = data
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal memuat daftar pengguna' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})

const copyPassword = async () => {
  try {
    await navigator.clipboard.writeText(createdPassword.value)
    addToast({ type: 'success', message: 'Password berhasil disalin!' })
  } catch {
    addToast({ type: 'warning', message: 'Gagal menyalin password. Silakan salin manual.' })
  }
}

// Handlers
const handleOpenCreate = () => {
  createEmail.value = ''
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
    const result = await $fetch<CreateUserResponse>('/api/users', {
      method: 'POST',
      body: {
        email: createEmail.value.trim(),
        role: createRole.value,
      },
    })

    createdPassword.value = result.password
    isCreateOpen.value = false
    isPasswordModalOpen.value = true
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
    await $fetch(`/api/users/${editingUser.value.id}`, {
      method: 'PATCH',
      body: {
        email: editEmail.value.trim(),
        password: editPassword.value || undefined,
        role: editRole.value,
      },
    })
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
    await $fetch(`/api/users/${deletingUser.value.id}`, {
      method: 'DELETE',
    })
    addToast({ type: 'success', message: 'Pengguna berhasil dihapus' })
    isDeleteOpen.value = false
    await fetchUsers()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal menghapus pengguna' })
  } finally {
    isDeleting.value = false
  }
}

const handleSendVerification = async (id: string) => {
  try {
    const result = await $fetch<{ email: string }>(`/api/users/${id}/send-verification`, {
      method: 'POST',
    })
    addToast({ type: 'success', message: `Email verifikasi terkirim ke ${result.email}!` })
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal mengirim email verifikasi' })
  }
}

const handleSendResetEmail = async (id: string) => {
  try {
    const result = await $fetch<{ email: string }>(`/api/users/${id}/send-reset`, {
      method: 'POST',
    })
    addToast({ type: 'success', message: `Email link reset sandi terkirim ke ${result.email}!` })
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal mengirim email reset sandi' })
  }
}

const isTogglingActive = ref<Record<string, boolean>>({})

const handleToggleActive = async (user: UserRecord) => {
  if (user.email === 'marcellinusyovian@gmail.com') return
  isTogglingActive.value[user.id] = true
  try {
    await $fetch(`/api/users/${user.id}/toggle-active`, {
      method: 'PATCH',
      body: { is_active: !user.is_active },
    })
    addToast({
      type: 'success',
      message: `Status pengguna ${user.email} berhasil diubah`,
    })
    await fetchUsers()
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal mengubah status aktif pengguna',
    })
  } finally {
    isTogglingActive.value[user.id] = false
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    
    <!-- Action Top Bar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
      <div>
        <h2 class="text-sm font-bold text-slate-800">Daftar Pengguna Sistem</h2>
        <p class="text-xs text-slate-500 mt-0.5">Kelola akses kasir dan administrator</p>
      </div>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <!-- Search Input -->
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari email, role, atau ID..."
            class="w-full text-xs font-semibold pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50/50"
          />
          <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
        <AppButton
          @click="handleOpenCreate"
          size="sm"
          variant="primary"
          class="font-bold text-xs shadow-sm shrink-0"
        >
          Tambah User
        </AppButton>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-12 text-slate-400">
      Memuat daftar pengguna...
    </div>

    <div v-else-if="users.length === 0" class="text-center py-12 bg-white border border-slate-150 rounded-2xl shadow-sm text-slate-400">
      Belum ada pengguna terdaftar.
    </div>

    <div v-else-if="filteredUsers.length === 0" class="text-center py-12 bg-white border border-slate-150 rounded-2xl shadow-sm text-slate-400">
      Tidak ada pengguna yang cocok dengan pencarian "{{ searchQuery }}".
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="u in filteredUsers"
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
            <span
              class="text-[10px] font-bold px-2 py-0.5 rounded-full"
              :class="u.email_confirmed_at ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-amber-50 text-amber-700 border border-amber-100'"
            >
              {{ u.email_confirmed_at ? 'Terverifikasi' : 'Belum Verifikasi' }}
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
              v-if="!u.email_confirmed_at"
              @click="handleSendVerification(u.id)"
              class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-150 bg-slate-50 rounded-lg transition min-h-[32px] min-w-[32px] flex items-center justify-center"
              title="Kirim Email Verifikasi"
            >
              <Icon name="heroicons:envelope" class="w-4.5 h-4.5" />
            </button>
            <button
              @click="handleSendResetEmail(u.id)"
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

    <!-- Password Created Modal -->
    <AppModal v-model="isPasswordModalOpen" title="Pengguna Berhasil Dibuat">
      <div class="py-2 flex flex-col gap-4">
        <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-center gap-3">
          <Icon name="heroicons:check-circle" class="w-6 h-6 text-emerald-600 shrink-0" />
          <p class="text-sm font-semibold text-emerald-800">Akun pengguna berhasil dibuat!</p>
        </div>

        <div class="bg-slate-50 border border-slate-150 rounded-xl p-4 flex flex-col gap-2">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</p>
          <p class="text-sm font-bold text-slate-800 break-all">{{ createEmail }}</p>
        </div>

        <div class="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-col gap-2">
          <p class="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Password Sementara</p>
          <p class="text-base font-mono font-black text-amber-900 tracking-wider select-all break-all">{{ createdPassword }}</p>
          <button
            @click="copyPassword"
            class="mt-2 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 self-start"
          >
            <Icon name="heroicons:clipboard" class="w-3.5 h-3.5" />
            Salin Password
          </button>
        </div>

        <div class="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p class="text-[11px] font-semibold text-blue-700">
            Bagikan password ini ke pengguna. Setelah login, mereka akan diminta mengganti password.
          </p>
        </div>
      </div>
      <template #footer>
        <AppButton @click="isPasswordModalOpen = false">Tutup</AppButton>
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
