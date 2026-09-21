<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'
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

// State
const roles = ref<RoleRecord[]>([])
const permissions = ref<PermissionRecord[]>([])
const isLoading = ref(false)
const searchQuery = ref('')

// Module labels for friendly Indonesian display
const moduleLabels: Record<string, { label: string; icon: string }> = {
  pos: { label: 'Kasir & Transaksi', icon: 'heroicons:shopping-cart' },
  catalog: { label: 'Katalog & Produk', icon: 'heroicons:building-storefront' },
  session: { label: 'Operasional Sesi', icon: 'heroicons:calendar' },
  finance: { label: 'Keuangan & Kas', icon: 'heroicons:banknotes' },
  reports: { label: 'Laporan & WhatsApp', icon: 'heroicons:chat-bubble-bottom-center-text' },
  users: { label: 'Pengguna & Otorisasi', icon: 'heroicons:shield-check' },
}

const groupedPermissions = computed(() => {
  const groups: Record<string, PermissionRecord[]> = {}
  for (const p of permissions.value) {
    if (!groups[p.module]) {
      groups[p.module] = []
    }
    groups[p.module].push(p)
  }
  return groups
})

const filteredRoles = computed(() => {
  if (!searchQuery.value.trim()) return roles.value
  const q = searchQuery.value.toLowerCase().trim()
  return roles.value.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.code.toLowerCase().includes(q) ||
    (r.description && r.description.toLowerCase().includes(q))
  )
})

// Create Modal State
const isCreateOpen = ref(false)
const isCreating = ref(false)
const createName = ref('')
const createCode = ref('')
const createDescription = ref('')
const createSelectedPermissions = ref<string[]>([])

// Edit Modal State
const isEditOpen = ref(false)
const isUpdating = ref(false)
const editingRole = ref<RoleRecord | null>(null)
const editName = ref('')
const editDescription = ref('')
const editSelectedPermissions = ref<string[]>([])

// Delete Modal State
const isDeleteOpen = ref(false)
const isDeleting = ref(false)
const deletingRole = ref<RoleRecord | null>(null)

// Load Data
const fetchData = async () => {
  isLoading.value = true
  try {
    const [rolesData, permsData] = await Promise.all([
      $fetch<RoleRecord[]>('/api/roles'),
      $fetch<PermissionRecord[]>('/api/permissions')
    ])
    roles.value = rolesData
    permissions.value = permsData
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal memuat data peran' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchData()
})

// Open Create Modal
const handleOpenCreate = () => {
  createName.value = ''
  createCode.value = ''
  createDescription.value = ''
  createSelectedPermissions.value = []
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
      permissions: createSelectedPermissions.value,
    }

    await $fetch('/api/roles', {
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

// Open Edit Modal
const handleOpenEdit = (role: RoleRecord) => {
  editingRole.value = role
  editName.value = role.name
  editDescription.value = role.description || ''
  editSelectedPermissions.value = [...role.permissions]
  isEditOpen.value = true
}

const handleEditSubmit = async () => {
  if (!editingRole.value) return
  if (!editName.value.trim()) {
    addToast({ type: 'warning', message: 'Nama peran wajib diisi' })
    return
  }

  isUpdating.value = true
  try {
    const payload: UpdateRoleBody = {
      name: editName.value.trim(),
      description: editDescription.value.trim() || undefined,
      permissions: editSelectedPermissions.value,
    }

    await $fetch(`/api/roles/${editingRole.value.id}`, {
      method: 'PUT',
      body: payload
    })

    addToast({ type: 'success', message: 'Peran berhasil diperbarui' })
    isEditOpen.value = false
    await fetchData()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal memperbarui peran' })
  } finally {
    isUpdating.value = false
  }
}

// Open Delete Modal
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
    await $fetch(`/api/roles/${deletingRole.value.id}`, {
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

// Helper toggles
const togglePermissionInCreate = (code: string) => {
  const idx = createSelectedPermissions.value.indexOf(code)
  if (idx >= 0) {
    createSelectedPermissions.value.splice(idx, 1)
  } else {
    createSelectedPermissions.value.push(code)
  }
}

const togglePermissionInEdit = (code: string) => {
  const idx = editSelectedPermissions.value.indexOf(code)
  if (idx >= 0) {
    editSelectedPermissions.value.splice(idx, 1)
  } else {
    editSelectedPermissions.value.push(code)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Peran & Hak Akses (RBAC)</h1>
        <p class="text-sm text-gray-500 mt-1">
          Kelola peran sistem dan konfigurasikan batasan hak akses pengguna secara modular.
        </p>
      </div>
      <div>
        <AppButton
          variant="primary"
          class="w-full sm:w-auto min-h-touch"
          @click="handleOpenCreate"
        >
          <Icon name="heroicons:plus-circle" class="w-5 h-5 mr-1.5 inline-block" />
          Tambah Peran
        </AppButton>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div class="relative max-w-md">
        <Icon name="heroicons:magnifying-glass" class="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari peran berdasarkan nama atau kode..."
          class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 min-h-touch"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-900"></div>
      <p class="text-sm text-gray-500 mt-3">Memuat data peran & izin...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredRoles.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
      <Icon name="heroicons:shield-exclamation" class="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-gray-900">Tidak ada peran ditemukan</h3>
      <p class="text-sm text-gray-500 mt-1">Coba kata kunci pencarian lain atau buat peran baru.</p>
    </div>

    <!-- Table (Desktop View) -->
    <div v-else class="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Peran</th>
            <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode</th>
            <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
            <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Jumlah Izin</th>
            <th class="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          <tr v-for="role in filteredRoles" :key="role.id" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4">
              <div class="font-medium text-gray-900">{{ role.name }}</div>
              <div class="text-xs text-gray-500 mt-0.5 max-w-xs truncate">{{ role.description || 'Tidak ada deskripsi' }}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <code class="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono font-semibold">{{ role.code }}</code>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span
                v-if="role.is_system"
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-900 border border-brand-200"
              >
                <Icon name="heroicons:lock-closed" class="w-3.5 h-3.5 mr-1" />
                Sistem
              </span>
              <span
                v-else
                class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
              >
                Kustom
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                {{ role.code === 'admin' ? 'Semua (Bypass)' : `${role.permissions.length} Izin` }}
              </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
              <button
                type="button"
                class="inline-flex items-center text-brand-600 hover:text-brand-900 py-1 px-2.5 rounded-md hover:bg-brand-50 transition-colors"
                @click="handleOpenEdit(role)"
              >
                <Icon name="heroicons:pencil-square" class="w-4 h-4 mr-1" />
                Ubah Izin
              </button>
              <button
                v-if="!role.is_system"
                type="button"
                class="inline-flex items-center text-red-600 hover:text-red-900 py-1 px-2.5 rounded-md hover:bg-red-50 transition-colors"
                @click="handleOpenDelete(role)"
              >
                <Icon name="heroicons:trash" class="w-4 h-4 mr-1" />
                Hapus
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Cards (Mobile View) -->
    <div v-if="!isLoading && filteredRoles.length > 0" class="block md:hidden space-y-3">
      <div
        v-for="role in filteredRoles"
        :key="role.id"
        class="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3"
      >
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-medium text-gray-900">{{ role.name }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ role.description || 'Tidak ada deskripsi' }}</p>
          </div>
          <span
            v-if="role.is_system"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-brand-50 text-brand-900 border border-brand-200"
          >
            Sistem
          </span>
          <span
            v-else
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
          >
            Kustom
          </span>
        </div>

        <div class="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <div>
            Kode: <code class="font-mono font-semibold text-gray-700">{{ role.code }}</code>
          </div>
          <div>
            {{ role.code === 'admin' ? 'Akses Penuh' : `${role.permissions.length} Izin` }}
          </div>
        </div>

        <div class="flex items-center gap-2 pt-2">
          <AppButton
            variant="outline"
            class="flex-1 min-h-touch text-xs"
            @click="handleOpenEdit(role)"
          >
            <Icon name="heroicons:pencil-square" class="w-4 h-4 mr-1 inline-block" />
            Ubah Izin
          </AppButton>
          <AppButton
            v-if="!role.is_system"
            variant="danger"
            class="min-h-touch px-3"
            @click="handleOpenDelete(role)"
          >
            <Icon name="heroicons:trash" class="w-4 h-4" />
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Modal Buat Peran -->
    <AppModal
      :isOpen="isCreateOpen"
      title="Tambah Peran Baru"
      @close="isCreateOpen = false"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nama Peran *</label>
          <AppInput
            v-model="createName"
            placeholder="Contoh: Bendahara Acara"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Kode Peran (Opsional)</label>
          <AppInput
            v-model="createCode"
            placeholder="Otomatis dari nama (contoh: bendahara_acara)"
            class="w-full"
          />
          <p class="text-xs text-gray-400 mt-1">Gunakan huruf kecil dan garis bawah.</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi Singkat</label>
          <textarea
            v-model="createDescription"
            rows="2"
            placeholder="Tuliskan tanggung jawab peran ini..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          ></textarea>
        </div>

        <div class="pt-3 border-t border-gray-200">
          <h4 class="text-sm font-semibold text-gray-900 mb-2">Pilih Hak Akses (Izin):</h4>
          <div class="space-y-4 max-h-64 overflow-y-auto pr-1">
            <div
              v-for="(perms, moduleKey) in groupedPermissions"
              :key="moduleKey"
              class="bg-gray-50 rounded-lg p-3 border border-gray-200"
            >
              <div class="flex items-center text-xs font-semibold text-gray-700 mb-2">
                <Icon :name="moduleLabels[moduleKey]?.icon || 'heroicons:folder'" class="w-4 h-4 mr-1.5 text-brand-900" />
                {{ moduleLabels[moduleKey]?.label || moduleKey }}
              </div>
              <div class="space-y-1.5">
                <label
                  v-for="p in perms"
                  :key="p.id"
                  class="flex items-start gap-2.5 p-1.5 rounded hover:bg-white cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="createSelectedPermissions.includes(p.code)"
                    class="mt-1 h-4 w-4 rounded border-gray-300 text-brand-900 focus:ring-brand-500"
                    @change="togglePermissionInCreate(p.code)"
                  />
                  <div class="text-xs">
                    <span class="font-medium text-gray-900">{{ p.name }}</span>
                    <p class="text-gray-500 text-[11px]">{{ p.description }}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <AppButton variant="outline" @click="isCreateOpen = false">Batal</AppButton>
          <AppButton variant="primary" :loading="isCreating" @click="handleCreateSubmit">Simpan Peran</AppButton>
        </div>
      </div>
    </AppModal>

    <!-- Modal Ubah Izin Peran -->
    <AppModal
      :isOpen="isEditOpen"
      :title="`Ubah Izin Peran: ${editingRole?.name || ''}`"
      @close="isEditOpen = false"
    >
      <div v-if="editingRole" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nama Peran *</label>
          <AppInput
            v-model="editName"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi Singkat</label>
          <textarea
            v-model="editDescription"
            rows="2"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          ></textarea>
        </div>

        <div v-if="editingRole.code === 'admin'" class="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
          <Icon name="heroicons:information-circle" class="w-4 h-4 mr-1 inline-block" />
          Peran Administrator memiliki akses superuser bypass ke seluruh modul sistem secara otomatis.
        </div>

        <div class="pt-3 border-t border-gray-200">
          <h4 class="text-sm font-semibold text-gray-900 mb-2">Konfigurasi Hak Akses:</h4>
          <div class="space-y-4 max-h-64 overflow-y-auto pr-1">
            <div
              v-for="(perms, moduleKey) in groupedPermissions"
              :key="moduleKey"
              class="bg-gray-50 rounded-lg p-3 border border-gray-200"
            >
              <div class="flex items-center text-xs font-semibold text-gray-700 mb-2">
                <Icon :name="moduleLabels[moduleKey]?.icon || 'heroicons:folder'" class="w-4 h-4 mr-1.5 text-brand-900" />
                {{ moduleLabels[moduleKey]?.label || moduleKey }}
              </div>
              <div class="space-y-1.5">
                <label
                  v-for="p in perms"
                  :key="p.id"
                  class="flex items-start gap-2.5 p-1.5 rounded hover:bg-white cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    :checked="editingRole.code === 'admin' || editSelectedPermissions.includes(p.code)"
                    :disabled="editingRole.code === 'admin'"
                    class="mt-1 h-4 w-4 rounded border-gray-300 text-brand-900 focus:ring-brand-500"
                    @change="togglePermissionInEdit(p.code)"
                  />
                  <div class="text-xs">
                    <span class="font-medium text-gray-900">{{ p.name }}</span>
                    <p class="text-gray-500 text-[11px]">{{ p.description }}</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <AppButton variant="outline" @click="isEditOpen = false">Batal</AppButton>
          <AppButton variant="primary" :loading="isUpdating" @click="handleEditSubmit">Perbarui Peran</AppButton>
        </div>
      </div>
    </AppModal>

    <!-- Modal Hapus Peran -->
    <AppModal
      :isOpen="isDeleteOpen"
      title="Konfirmasi Hapus Peran"
      @close="isDeleteOpen = false"
    >
      <div v-if="deletingRole" class="space-y-4">
        <p class="text-sm text-gray-600">
          Apakah Anda yakin ingin menghapus peran <strong class="text-gray-900 font-semibold">{{ deletingRole.name }}</strong>?
          Tindakan ini tidak dapat dibatalkan.
        </p>

        <div class="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <AppButton variant="outline" @click="isDeleteOpen = false">Batal</AppButton>
          <AppButton variant="danger" :loading="isDeleting" @click="handleDeleteSubmit">Hapus Peran</AppButton>
        </div>
      </div>
    </AppModal>

    <AppToast />
  </div>
</template>
