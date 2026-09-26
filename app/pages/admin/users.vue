<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useToast } from '~/composables/useToast'
import { useApi } from '~/composables/useApi'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'
import type { 
  UserRecord, 
  RoleRecord, 
  CreateUserResponse,
  UserPermissionsResponse,
  UserPermissionOverrideItem,
  UpdateUserPermissionsBody
} from '~/shared/types/users'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const authStore = useAuthStore()
const { addToast } = useToast()
const { apiFetch } = useApi()

// State
const users = ref<UserRecord[]>([])
const availableRoles = ref<RoleRecord[]>([])
const isLoading = ref(false)
const searchQuery = ref('')

const filteredUsers = computed(() => {
  if (!searchQuery.value.trim()) return users.value
  const query = searchQuery.value.toLowerCase().trim()
  return users.value.filter(u => 
    u.email.toLowerCase().includes(query) || 
    u.role.toLowerCase().includes(query) ||
    (u.role_name && u.role_name.toLowerCase().includes(query)) ||
    u.id.toLowerCase().includes(query)
  )
})

// Modals
const isCreateOpen = ref(false)
const createEmail = ref('')
const createRole = ref<string>('cashier')
const isCreating = ref(false)

const createdPassword = ref('')
const isPasswordModalOpen = ref(false)

const isEditOpen = ref(false)
const editingUser = ref<UserRecord | null>(null)
const editEmail = ref('')
const editPassword = ref('')
const editRole = ref<string>('cashier')
const isUpdating = ref(false)

const isDeleteOpen = ref(false)
const deletingUser = ref<UserRecord | null>(null)
const isDeleting = ref(false)

// User Permissions Override Modal State
const isPermissionsModalOpen = ref(false)
const isLoadingPermissions = ref(false)
const isSavingPermissions = ref(false)
const targetUserPermissions = ref<UserPermissionsResponse | null>(null)
const selectedRoleForOverride = ref<string>('')
const overrideItems = ref<UserPermissionOverrideItem[]>([])
const permissionSearchQuery = ref('')

const moduleLabels: Record<string, string> = {
  pos: 'Kasir & Transaksi',
  catalog: 'Katalog & Produk',
  session: 'Operasional Sesi',
  finance: 'Keuangan & Kas',
  reports: 'Laporan & WhatsApp',
  users: 'Pengguna & Hak Akses',
  roles: 'Peran & Izin'
}

const modalGroupedPermissions = computed(() => {
  if (!overrideItems.value) return {}
  const query = permissionSearchQuery.value.toLowerCase().trim()
  const groups: Record<string, UserPermissionOverrideItem[]> = {}

  for (const item of overrideItems.value) {
    if (query) {
      const match = item.name.toLowerCase().includes(query) ||
                    item.code.toLowerCase().includes(query) ||
                    item.module.toLowerCase().includes(query)
      if (!match) continue
    }
    if (!groups[item.module]) {
      groups[item.module] = []
    }
    groups[item.module].push(item)
  }

  return groups
})

const directOverridesCount = computed(() => {
  return overrideItems.value.filter(item => item.is_granted !== null).length
})

const isPermissionActive = (item: UserPermissionOverrideItem): boolean => {
  if (item.is_granted === true) return true
  if (item.is_granted === false) return false
  return item.inherited_from_role
}

const toggleUserPermission = (item: UserPermissionOverrideItem) => {
  const currentActive = isPermissionActive(item)
  if (currentActive) {
    if (item.inherited_from_role) {
      item.is_granted = false
    } else {
      item.is_granted = null
    }
  } else {
    if (item.inherited_from_role) {
      item.is_granted = null
    } else {
      item.is_granted = true
    }
  }
}

const resetPermissionOverride = (item: UserPermissionOverrideItem) => {
  item.is_granted = null
}

// Fetch Users & Roles
const fetchUsers = async (silent: boolean = false) => {
  if (!silent && users.value.length === 0) {
    isLoading.value = true
  }
  try {
    const [usersData, rolesData] = await Promise.all([
      apiFetch<UserRecord[]>('/api/users'),
      apiFetch<RoleRecord[]>('/api/roles').catch(() => [])
    ])
    users.value = usersData
    if (rolesData && rolesData.length > 0) {
      availableRoles.value = rolesData
    } else {
      // Fallback
      availableRoles.value = [
        { id: '1', code: 'admin', name: 'Administrator', description: '', is_system: true, permissions: [] },
        { id: '2', code: 'cashier', name: 'Kasir', description: '', is_system: true, permissions: [] }
      ]
    }
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal memuat daftar pengguna' })
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
    const result = await apiFetch<CreateUserResponse>('/api/users', {
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
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal membuat pengguna' })
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
    await apiFetch(`/api/users/${editingUser.value.id}`, {
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
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal memperbarui pengguna' })
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
    await apiFetch(`/api/users/${deletingUser.value.id}`, {
      method: 'DELETE',
    })
    addToast({ type: 'success', message: 'Pengguna berhasil dihapus' })
    isDeleteOpen.value = false
    await fetchUsers()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal menghapus pengguna' })
  } finally {
    isDeleting.value = false
  }
}

const handleSendVerification = async (id: string) => {
  try {
    const result = await apiFetch<{ email: string }>(`/api/users/${id}/send-verification`, {
      method: 'POST',
    })
    addToast({ type: 'success', message: `Email verifikasi terkirim ke ${result.email}!` })
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal mengirim email verifikasi' })
  }
}

const handleSendResetEmail = async (id: string) => {
  try {
    const result = await apiFetch<{ email: string }>(`/api/users/${id}/send-reset`, {
      method: 'POST',
    })
    addToast({ type: 'success', message: `Email link reset sandi terkirim ke ${result.email}!` })
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal mengirim email reset sandi' })
  }
}

const isTogglingActive = ref<Record<string, boolean>>({})

const handleToggleActive = async (user: UserRecord) => {
  if (user.email === 'marcellinusyovian@gmail.com') return
  isTogglingActive.value[user.id] = true
  try {
    await apiFetch(`/api/users/${user.id}/toggle-active`, {
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
      message: e.statusMessage || e.message || 'Gagal mengubah status aktif pengguna',
    })
  } finally {
    isTogglingActive.value[user.id] = false
  }
}

// Open User Permissions Override Modal
const handleOpenPermissions = async (user: UserRecord) => {
  isLoadingPermissions.value = true
  isPermissionsModalOpen.value = true
  targetUserPermissions.value = null
  permissionSearchQuery.value = ''

  try {
    const res = await apiFetch<UserPermissionsResponse>(`/api/users/${user.id}/permissions`)
    targetUserPermissions.value = res
    selectedRoleForOverride.value = res.role_code
    overrideItems.value = res.permissions.map(p => ({ ...p }))
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal memuat izin pengguna' })
    isPermissionsModalOpen.value = false
  } finally {
    isLoadingPermissions.value = false
  }
}

const handleSavePermissions = async () => {
  if (!targetUserPermissions.value) return

  isSavingPermissions.value = true
  try {
    const payload: UpdateUserPermissionsBody = {
      role_code: selectedRoleForOverride.value,
      overrides: overrideItems.value.map(item => ({
        permission_id: item.permission_id,
        is_granted: item.is_granted
      }))
    }

    await apiFetch(`/api/users/${targetUserPermissions.value.user_id}/permissions`, {
      method: 'PUT',
      body: payload
    })

    addToast({ type: 'success', message: 'Kustomisasi hak akses berhasil disimpan' })
    isPermissionsModalOpen.value = false
    await fetchUsers()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal menyimpan hak akses' })
  } finally {
    isSavingPermissions.value = false
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    
    <!-- Action Top Bar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
      <div>
        <h2 class="text-sm font-bold text-slate-800">Daftar Pengguna Sistem</h2>
        <p class="text-xs text-slate-500 mt-0.5">Kelola akun pengguna, peran, dan kustomisasi izin</p>
      </div>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <!-- Search Input -->
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari email, role, atau ID..."
            class="w-full text-xs font-semibold pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50/50 min-h-touch"
          />
          <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
        <AppButton
          @click="handleOpenCreate"
          size="sm"
          variant="primary"
          class="font-bold text-xs shadow-sm shrink-0 min-h-touch"
        >
          Tambah User
        </AppButton>
      </div>
    </div>

    <div v-if="isLoading" class="text-center py-12 text-slate-400">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-900 mb-2"></div>
      <p>Memuat daftar pengguna...</p>
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
          <div class="flex flex-wrap gap-1.5 mt-1">
            <span
              class="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
              :class="u.role === 'admin' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-brand-50 text-brand-900 border border-brand-100'"
            >
              {{ u.role_name || u.role }}
            </span>
            <span
              v-if="u.custom_overrides_count && u.custom_overrides_count > 0"
              class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100"
              title="Pengguna memiliki kustomisasi izin khusus"
            >
              {{ u.custom_overrides_count }} override
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
            <!-- Permissions Override Button (Green PERMISSIONS with key icon) -->
            <button
              type="button"
              @click="handleOpenPermissions(u)"
              class="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] tracking-wide uppercase transition shadow-sm inline-flex items-center gap-1.5 min-h-[34px]"
              title="Atur Hak Akses / Permissions"
            >
              <Icon name="heroicons:key" class="w-3.5 h-3.5" />
              <span>PERMISSIONS</span>
            </button>

            <!-- Toggle active/inactive status (for marcellinusyovian@gmail.com only) -->
            <button
              v-if="authStore.user?.email === 'marcellinusyovian@gmail.com' && u.email !== 'marcellinusyovian@gmail.com'"
              type="button"
              @click="handleToggleActive(u)"
              :disabled="isTogglingActive[u.id]"
              class="p-2 rounded-lg transition min-h-[34px] min-w-[34px] flex items-center justify-center disabled:opacity-50 border border-slate-200 bg-slate-50"
              :class="u.is_active ? 'text-slate-400 hover:text-danger hover:bg-red-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-green-50'"
              :title="u.is_active ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'"
            >
              <Icon :name="u.is_active ? 'heroicons:no-symbol' : 'heroicons:check-circle'" class="w-4 h-4" />
            </button>

            <!-- Verification Email Button -->
            <button
              v-if="!u.email_confirmed_at"
              type="button"
              @click="handleSendVerification(u.id)"
              class="p-2 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition min-h-[34px] min-w-[34px] flex items-center justify-center"
              title="Kirim Email Verifikasi"
            >
              <Icon name="heroicons:envelope" class="w-4 h-4" />
            </button>

            <!-- Password Reset Button (Purple) -->
            <button
              type="button"
              @click="handleSendResetEmail(u.id)"
              class="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition shadow-sm inline-flex items-center justify-center min-h-[34px] min-w-[34px]"
              title="Kirim Link Reset Sandi"
            >
              <Icon name="heroicons:key" class="w-4 h-4" />
            </button>

            <!-- Edit Button (Yellow) -->
            <button
              type="button"
              @click="handleOpenEdit(u)"
              class="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm inline-flex items-center justify-center min-h-[34px] min-w-[34px]"
              title="Edit Pengguna"
            >
              <Icon name="heroicons:pencil-square" class="w-4 h-4" />
            </button>

            <!-- Delete Button (Red) -->
            <button
              type="button"
              @click="handleOpenDelete(u)"
              v-if="u.id !== authStore.user?.id"
              class="p-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition shadow-sm inline-flex items-center justify-center min-h-[34px] min-w-[34px]"
              title="Hapus Pengguna"
            >
              <Icon name="heroicons:trash" class="w-4 h-4" />
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
          <select
            v-model="createRole"
            class="w-full text-xs font-semibold px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white min-h-touch"
          >
            <option v-for="r in availableRoles" :key="r.id" :value="r.code">
              {{ r.name }} ({{ r.code }})
            </option>
          </select>
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
            class="mt-2 text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 self-start min-h-touch"
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
          <select
            v-model="editRole"
            class="w-full text-xs font-semibold px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white min-h-touch"
          >
            <option v-for="r in availableRoles" :key="r.id" :value="r.code">
              {{ r.name }} ({{ r.code }})
            </option>
          </select>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="isEditOpen = false">Batal</AppButton>
        <AppButton :loading="isUpdating" @click="handleEditSubmit">Simpan Perubahan</AppButton>
      </template>
    </AppModal>

    <!-- ============================================================================== -->
    <!-- MODAL: Manage Permissions for User (Matching Screenshot 4)                     -->
    <!-- ============================================================================== -->
    <AppModal
      v-model="isPermissionsModalOpen"
      size="xl"
    >
      <template #header>
        <div class="flex items-center justify-between w-full pr-3">
          <div>
            <h3 class="text-lg font-bold text-slate-900 leading-tight">Manage Permissions</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              User: <span class="font-bold text-brand-900">{{ targetUserPermissions?.email }}</span>
              <span v-if="targetUserPermissions?.role_name" class="text-slate-400 font-normal"> ({{ targetUserPermissions.role_name }})</span>
            </p>
          </div>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {{ directOverridesCount }} direct permissions
          </span>
        </div>
      </template>

      <div v-if="isLoadingPermissions" class="py-12 text-center text-slate-400">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-900 mb-2"></div>
        <p class="text-sm font-semibold">Memuat hak akses pengguna...</p>
      </div>

      <div v-else-if="targetUserPermissions" class="space-y-4 py-2">
        <!-- Search Input -->
        <div class="relative">
          <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="permissionSearchQuery"
            type="text"
            placeholder="Search permissions.."
            class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div v-if="targetUserPermissions.role_code === 'admin'" class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <Icon name="heroicons:information-circle" class="w-4 h-4 mr-1 inline-block" />
          Pengguna dengan peran Administrator otomatis memiliki izin penuh (superuser bypass).
        </div>

        <!-- 3-Column Card Grid (Matching Screenshot 4) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[60vh] overflow-y-auto pr-1">
          <div
            v-for="(perms, moduleKey) in modalGroupedPermissions"
            :key="moduleKey"
            class="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between"
          >
            <div>
              <!-- Card Header: Module Title & Badge Count -->
              <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                <h4 class="text-xs font-extrabold text-slate-800">
                  {{ moduleLabels[moduleKey] || moduleKey }}
                </h4>
                <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                  {{ perms.length }}
                </span>
              </div>

              <!-- Permission rows in card -->
              <div class="space-y-2">
                <div
                  v-for="item in perms"
                  :key="item.permission_id"
                  class="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-white transition"
                  :class="{
                    'bg-white shadow-xs': isPermissionActive(item)
                  }"
                >
                  <!-- Left: Permission Name & Code -->
                  <div class="min-w-0 flex-1">
                    <div class="text-xs font-medium text-slate-800 truncate" :title="item.name">
                      {{ item.name }}
                    </div>
                    <div class="text-[10px] text-slate-400 font-mono truncate" :title="item.code">
                      {{ item.code }}
                    </div>
                  </div>

                  <!-- Right: Role Inherited Indicator, Override Badges, & Switch -->
                  <div class="flex items-center gap-1.5 shrink-0">
                    <!-- Purple Shield Icon for Role Inherited -->
                    <div
                      v-if="item.inherited_from_role"
                      class="p-1 rounded text-purple-600 bg-purple-50"
                      :class="{ 'opacity-40': item.is_granted === false }"
                      title="Bawaan dari Peran (Role)"
                    >
                      <Icon name="heroicons:shield-check" class="w-4 h-4" />
                    </div>

                    <!-- Reset Override Button (if custom override exists) -->
                    <button
                      v-if="item.is_granted !== null"
                      type="button"
                      @click="resetPermissionOverride(item)"
                      class="p-0.5 text-slate-400 hover:text-slate-600 rounded transition"
                      title="Reset ke bawaan peran"
                    >
                      <Icon name="heroicons:arrow-path" class="w-3.5 h-3.5" />
                    </button>

                    <!-- Override Indicator Badge -->
                    <span
                      v-if="item.is_granted === true"
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800"
                    >
                      Direct
                    </span>
                    <span
                      v-else-if="item.is_granted === false"
                      class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800"
                    >
                      Dicabut
                    </span>

                    <!-- Toggle Switch (matching Screenshot 4) -->
                    <button
                      type="button"
                      role="switch"
                      :aria-checked="isPermissionActive(item)"
                      @click="toggleUserPermission(item)"
                      class="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                      :class="isPermissionActive(item) ? 'bg-indigo-600' : 'bg-slate-200'"
                      :title="isPermissionActive(item) ? 'Aktif (Klik untuk nonaktifkan)' : 'Nonaktif (Klik untuk aktifkan)'"
                    >
                      <span
                        class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out"
                        :class="isPermissionActive(item) ? 'translate-x-4' : 'translate-x-0'"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <AppButton variant="secondary" @click="isPermissionsModalOpen = false">CANCEL</AppButton>
        <AppButton :loading="isSavingPermissions" @click="handleSavePermissions">SAVE PERMISSIONS</AppButton>
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
