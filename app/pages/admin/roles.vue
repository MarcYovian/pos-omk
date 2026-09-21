<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'
import { useApi } from '~/composables/useApi'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'
import type { RoleRecord, PermissionRecord, CreateRoleBody, UpdateRoleBody } from '~/shared/types/users'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  permission: 'roles:manage'
})

const { addToast } = useToast()
const { apiFetch } = useApi()

// State
const roles = ref<RoleRecord[]>([])
const allPermissions = ref<PermissionRecord[]>([])
const isLoading = ref(false)
const searchQuery = ref('')

const moduleLabels: Record<string, string> = {
  pos: 'Kasir & Transaksi',
  catalog: 'Katalog & Produk',
  session: 'Operasional Sesi',
  finance: 'Keuangan & Kas',
  reports: 'Laporan & WhatsApp',
  users: 'Pengguna & Hak Akses',
}

const filteredRoles = computed(() => {
  if (!searchQuery.value.trim()) return roles.value
  const q = searchQuery.value.toLowerCase().trim()
  return roles.value.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.code.toLowerCase().includes(q) ||
    (r.description && r.description.toLowerCase().includes(q))
  )
})

// Create Role Modal
const isCreateOpen = ref(false)
const isCreating = ref(false)
const createName = ref('')
const createCode = ref('')
const createDescription = ref('')

// Edit Role Modal
const isEditOpen = ref(false)
const isUpdating = ref(false)
const editingRole = ref<RoleRecord | null>(null)
const editName = ref('')
const editDescription = ref('')

// Delete Role Modal
const isDeleteOpen = ref(false)
const isDeleting = ref(false)
const deletingRole = ref<RoleRecord | null>(null)

// Manage Permissions Modal (Screenshot 3 Reference)
const isPermissionsModalOpen = ref(false)
const isSavingPermissions = ref(false)
const targetRole = ref<RoleRecord | null>(null)
const permissionSearchQuery = ref('')
const selectedPermissionCodes = ref<string[]>([])

// Filtered Grouped Permissions for Modal
const modalGroupedPermissions = computed(() => {
  const query = permissionSearchQuery.value.toLowerCase().trim()
  const groups: Record<string, PermissionRecord[]> = {}

  for (const p of allPermissions.value) {
    if (query) {
      const match = p.name.toLowerCase().includes(query) || 
                    p.code.toLowerCase().includes(query) || 
                    p.module.toLowerCase().includes(query)
      if (!match) continue
    }
    if (!groups[p.module]) {
      groups[p.module] = []
    }
    groups[p.module].push(p)
  }

  return groups
})

// Total selected count for top badge
const selectedCount = computed(() => selectedPermissionCodes.value.length)

// Load Data
const fetchData = async () => {
  isLoading.value = true
  try {
    const [rolesData, permsData] = await Promise.all([
      apiFetch<RoleRecord[]>('/api/roles'),
      apiFetch<PermissionRecord[]>('/api/permissions')
    ])
    roles.value = rolesData
    allPermissions.value = permsData
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal memuat data peran' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Handlers for Create Role
const handleOpenCreate = () => {
  createName.value = ''
  createCode.value = ''
  createDescription.value = ''
  isCreateOpen.value = true
}

const handleCreateSubmit = async () => {
  if (!createName.value.trim()) {
    addToast({ type: 'warning', message: 'Nama peran wajib diisi' })
    return
  }

  isCreating.value = true
  try {
    const payload: CreateRoleBody = {
      name: createName.value.trim(),
      code: createCode.value.trim() || createName.value.trim(),
      description: createDescription.value.trim() || undefined,
      permissions: [],
    }

    await apiFetch('/api/roles', {
      method: 'POST',
      body: payload
    })

    addToast({ type: 'success', message: 'Peran baru berhasil dibuat' })
    isCreateOpen.value = false
    await fetchData()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal membuat peran' })
  } finally {
    isCreating.value = false
  }
}

// Handlers for Edit Role
const handleOpenEdit = (role: RoleRecord) => {
  editingRole.value = role
  editName.value = role.name
  editDescription.value = role.description || ''
  isEditOpen.value = true
}

const handleEditSubmit = async () => {
  if (!editingRole.value || !editName.value.trim()) return

  isUpdating.value = true
  try {
    const payload: UpdateRoleBody = {
      name: editName.value.trim(),
      description: editDescription.value.trim() || undefined,
    }

    await apiFetch(`/api/roles/${editingRole.value.id}`, {
      method: 'PUT',
      body: payload
    })

    addToast({ type: 'success', message: 'Detail peran berhasil diperbarui' })
    isEditOpen.value = false
    await fetchData()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal memperbarui peran' })
  } finally {
    isUpdating.value = false
  }
}

// Handlers for Delete Role
const handleOpenDelete = (role: RoleRecord) => {
  if (role.is_system) {
    addToast({ type: 'warning', message: 'Peran bawaan sistem tidak dapat dihapus' })
    return
  }
  deletingRole.value = role
  isDeleteOpen.value = true
}

const handleDeleteSubmit = async () => {
  if (!deletingRole.value) return

  isDeleting.value = true
  try {
    await apiFetch(`/api/roles/${deletingRole.value.id}`, {
      method: 'DELETE'
    })

    addToast({ type: 'success', message: 'Peran berhasil dihapus' })
    isDeleteOpen.value = false
    await fetchData()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal menghapus peran' })
  } finally {
    isDeleting.value = false
  }
}

// Handlers for Manage Permissions Modal (Screenshot 3 Reference)
const handleOpenPermissions = (role: RoleRecord) => {
  targetRole.value = role
  permissionSearchQuery.value = ''
  selectedPermissionCodes.value = [...role.permissions]
  isPermissionsModalOpen.value = true
}

const togglePermission = (code: string) => {
  const idx = selectedPermissionCodes.value.indexOf(code)
  if (idx >= 0) {
    selectedPermissionCodes.value.splice(idx, 1)
  } else {
    selectedPermissionCodes.value.push(code)
  }
}

const isGroupAllSelected = (moduleKey: string) => {
  const perms = allPermissions.value.filter(p => p.module === moduleKey)
  if (perms.length === 0) return false
  return perms.every(p => selectedPermissionCodes.value.includes(p.code))
}

const toggleSelectAllGroup = (moduleKey: string) => {
  const perms = allPermissions.value.filter(p => p.module === moduleKey)
  const allSelected = isGroupAllSelected(moduleKey)

  if (allSelected) {
    // Deselect all
    for (const p of perms) {
      const idx = selectedPermissionCodes.value.indexOf(p.code)
      if (idx >= 0) selectedPermissionCodes.value.splice(idx, 1)
    }
  } else {
    // Select all
    for (const p of perms) {
      if (!selectedPermissionCodes.value.includes(p.code)) {
        selectedPermissionCodes.value.push(p.code)
      }
    }
  }
}

const handleSavePermissions = async () => {
  if (!targetRole.value) return

  isSavingPermissions.value = true
  try {
    await apiFetch(`/api/roles/${targetRole.value.id}`, {
      method: 'PUT',
      body: {
        permissions: selectedPermissionCodes.value
      }
    })

    addToast({ type: 'success', message: `Hak akses untuk peran ${targetRole.value.name} berhasil disimpan` })
    isPermissionsModalOpen.value = false
    await fetchData()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal menyimpan hak akses' })
  } finally {
    isSavingPermissions.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Role</h1>
      <p class="text-sm text-slate-500 mt-1">
        Kelola peran pengguna dan hak akses terkait.
      </p>
    </div>

    <!-- Action Top Bar (Screenshot 2 Reference) -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <button
        type="button"
        @click="handleOpenCreate"
        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition min-h-touch shrink-0"
      >
        <Icon name="heroicons:plus" class="w-4 h-4" />
        Tambah Role
      </button>

      <div class="relative flex-grow">
        <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari nama role..."
          class="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 min-h-touch"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-900 mb-2"></div>
      <p class="text-sm text-slate-500">Memuat daftar peran...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredRoles.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
      <Icon name="heroicons:shield-exclamation" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-slate-800">Tidak ada peran ditemukan</h3>
      <p class="text-sm text-slate-500 mt-1">Coba kata kunci pencarian lain atau tambahkan peran baru.</p>
    </div>

    <!-- Data Role Table (Matching Screenshot 2) -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="text-xs font-extrabold tracking-wider uppercase text-slate-500">DATA ROLE</h3>
        <span class="text-xs font-semibold text-slate-400">{{ filteredRoles.length }} Total</span>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100">
          <thead class="bg-slate-50/80">
            <tr>
              <th class="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-16">NO</th>
              <th class="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">NAME</th>
              <th class="px-6 py-3.5 text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-44">ACTIONS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr
              v-for="(r, index) in filteredRoles"
              :key="r.id"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <td class="px-6 py-4 text-xs font-semibold text-slate-500">{{ index + 1 }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-slate-800">{{ r.name }}</span>
                  <code class="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ r.code }}</code>
                  <span
                    v-if="r.is_system"
                    class="text-[9px] px-1.5 py-0.5 rounded bg-brand-50 text-brand-900 font-semibold border border-brand-100"
                  >
                    Sistem
                  </span>
                </div>
                <div v-if="r.description" class="text-[11px] text-slate-400 mt-0.5">{{ r.description }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right space-x-1.5">
                <!-- Green PERMISSIONS Button with Key Icon -->
                <button
                  type="button"
                  @click="handleOpenPermissions(r)"
                  class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] tracking-wide uppercase transition shadow-sm inline-flex items-center gap-1.5 min-h-[34px]"
                  title="Atur Hak Akses / Permissions"
                >
                  <Icon name="heroicons:key" class="w-3.5 h-3.5" />
                  <span>PERMISSIONS</span>
                </button>

                <!-- Yellow Edit Button with Pencil Icon -->
                <button
                  type="button"
                  @click="handleOpenEdit(r)"
                  class="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm inline-flex items-center justify-center min-h-[34px] min-w-[34px]"
                  title="Edit Detail Role"
                >
                  <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                </button>

                <!-- Red Delete Button with Trash Icon -->
                <button
                  type="button"
                  @click="handleOpenDelete(r)"
                  :disabled="r.is_system"
                  class="p-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition shadow-sm inline-flex items-center justify-center min-h-[34px] min-w-[34px] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Hapus Role"
                >
                  <Icon name="heroicons:trash" class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ============================================================================== -->
    <!-- MODAL 1: Manage Permissions Modal (Matching Screenshot 3)                     -->
    <!-- ============================================================================== -->
    <AppModal
      v-model="isPermissionsModalOpen"
      size="xl"
    >
      <template #header>
        <div class="flex items-center justify-between w-full pr-2">
          <div>
            <h3 class="text-lg font-bold text-slate-900 leading-tight">Manage Permissions</h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Role: <span class="font-bold text-brand-900">{{ targetRole?.name }}</span> (<code class="text-[11px]">{{ targetRole?.code }}</code>)
            </p>
          </div>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            {{ selectedCount }} selected
          </span>
        </div>
      </template>

      <div class="space-y-4 py-2">
        <!-- Search Input -->
        <div class="relative">
          <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="permissionSearchQuery"
            type="text"
            placeholder="Search permissions..."
            class="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div v-if="targetRole?.code === 'admin'" class="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
          <Icon name="heroicons:information-circle" class="w-4 h-4 mr-1 inline-block" />
          Peran Administrator memiliki akses superuser bypass ke semua izin secara default.
        </div>

        <!-- 3-Column Card Grid (Matching Screenshot 3) -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[60vh] overflow-y-auto pr-1">
          <div
            v-for="(perms, moduleKey) in modalGroupedPermissions"
            :key="moduleKey"
            class="bg-slate-50/70 border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between"
          >
            <!-- Card Header -->
            <div>
              <div class="flex items-center justify-between border-b border-slate-200 pb-2 mb-2.5">
                <h4 class="text-xs font-extrabold text-slate-800">
                  {{ moduleLabels[moduleKey] || moduleKey }}
                </h4>
                <button
                  type="button"
                  @click="toggleSelectAllGroup(moduleKey)"
                  class="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition"
                >
                  {{ isGroupAllSelected(moduleKey) ? 'Deselect All' : 'Select All' }}
                </button>
              </div>

              <!-- Checkbox List -->
              <div class="space-y-2">
                <label
                  v-for="p in perms"
                  :key="p.id"
                  class="flex items-start gap-2.5 p-1 rounded-lg hover:bg-white cursor-pointer transition select-none"
                >
                  <input
                    type="checkbox"
                    :checked="selectedPermissionCodes.includes(p.code)"
                    @change="togglePermission(p.code)"
                    class="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-900 focus:ring-brand-500"
                  />
                  <div class="text-xs leading-snug">
                    <span class="font-medium text-slate-800">{{ p.name }}</span>
                    <p class="text-[10px] text-slate-400 font-mono">{{ p.code }}</p>
                  </div>
                </label>
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

    <!-- ============================================================================== -->
    <!-- MODAL 2: Tambah Role                                                           -->
    <!-- ============================================================================== -->
    <AppModal
      v-model="isCreateOpen"
      title="Tambah Role Baru"
    >
      <div class="space-y-4 py-1">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Nama Role *</label>
          <AppInput
            v-model="createName"
            placeholder="Contoh: Bendahara Acara"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Kode Role (Opsional)</label>
          <AppInput
            v-model="createCode"
            placeholder="Otomatis dari nama (contoh: bendahara_acara)"
            class="w-full"
          />
          <p class="text-[11px] text-slate-400 mt-1">Gunakan huruf kecil dan garis bawah.</p>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
          <textarea
            v-model="createDescription"
            rows="2"
            placeholder="Tuliskan wewenang peran ini..."
            class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isCreateOpen = false">Batal</AppButton>
        <AppButton :loading="isCreating" @click="handleCreateSubmit">Simpan Role</AppButton>
      </template>
    </AppModal>

    <!-- ============================================================================== -->
    <!-- MODAL 3: Edit Detail Role                                                      -->
    <!-- ============================================================================== -->
    <AppModal
      v-model="isEditOpen"
      :title="`Edit Role: ${editingRole?.name || ''}`"
    >
      <div v-if="editingRole" class="space-y-4 py-1">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Nama Role *</label>
          <AppInput
            v-model="editName"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Kode (Tidak dapat diubah)</label>
          <input
            :value="editingRole.code"
            disabled
            class="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
          <textarea
            v-model="editDescription"
            rows="2"
            class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isEditOpen = false">Batal</AppButton>
        <AppButton :loading="isUpdating" @click="handleEditSubmit">Simpan Perubahan</AppButton>
      </template>
    </AppModal>

    <!-- ============================================================================== -->
    <!-- MODAL 4: Hapus Role                                                            -->
    <!-- ============================================================================== -->
    <AppModal
      v-model="isDeleteOpen"
      title="Hapus Role"
    >
      <div v-if="deletingRole" class="space-y-3 py-1">
        <p class="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus peran <strong class="text-slate-900 font-bold">{{ deletingRole.name }}</strong> (<code>{{ deletingRole.code }}</code>)?
        </p>
        <p class="text-xs text-rose-600 font-semibold">
          ⚠️ Tindakan ini permanen. Pengguna yang memiliki peran ini harus dialihkan terlebih dahulu.
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
