<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useToast } from '~/composables/useToast'
import { useApi } from '~/composables/useApi'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'
import type { PermissionRecord } from '~/shared/types/users'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin'],
  permission: 'roles:manage'
})

const { addToast } = useToast()
const { apiFetch } = useApi()

// State
const permissions = ref<PermissionRecord[]>([])
const isLoading = ref(false)
const searchQuery = ref('')

const defaultCodes = [
  'pos:transact', 'products:manage', 'session_stock:manage', 
  'session:manage', 'session:reset', 'cashflow:view', 
  'cashflow:manage', 'umkm:payout', 'reports:view', 
  'users:manage', 'roles:manage'
]

const filteredPermissions = computed(() => {
  if (!searchQuery.value.trim()) return permissions.value
  const q = searchQuery.value.toLowerCase().trim()
  return permissions.value.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.code.toLowerCase().includes(q) ||
    p.module.toLowerCase().includes(q) ||
    (p.description && p.description.toLowerCase().includes(q))
  )
})

// Modals
const isCreateOpen = ref(false)
const isCreating = ref(false)
const createName = ref('')
const createCode = ref('')
const createModule = ref('')
const createDescription = ref('')

const isEditOpen = ref(false)
const isUpdating = ref(false)
const editingPermission = ref<PermissionRecord | null>(null)
const editName = ref('')
const editModule = ref('')
const editDescription = ref('')

const isDeleteOpen = ref(false)
const isDeleting = ref(false)
const deletingPermission = ref<PermissionRecord | null>(null)

// Module Presets
const modulePresets = [
  { value: 'pos', label: 'Kasir & POS' },
  { value: 'catalog', label: 'Katalog & Produk' },
  { value: 'session', label: 'Operasional Sesi' },
  { value: 'finance', label: 'Keuangan & Kas' },
  { value: 'reports', label: 'Laporan & WhatsApp' },
  { value: 'users', label: 'Pengguna & Hak Akses' },
]

const formatModuleLabel = (moduleKey: string) => {
  const match = modulePresets.find(m => m.value === moduleKey)
  return match ? match.label : moduleKey
}

const fetchPermissions = async () => {
  isLoading.value = true
  try {
    const data = await apiFetch<PermissionRecord[]>('/api/permissions')
    permissions.value = data
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal memuat permission' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchPermissions()
})

const handleOpenCreate = () => {
  createName.value = ''
  createCode.value = ''
  createModule.value = 'pos'
  createDescription.value = ''
  isCreateOpen.value = true
}

const handleCreateSubmit = async () => {
  if (!createName.value.trim()) {
    addToast({ type: 'warning', message: 'Nama permission wajib diisi' })
    return
  }
  if (!createCode.value.trim()) {
    addToast({ type: 'warning', message: 'Kode permission wajib diisi' })
    return
  }

  isCreating.value = true
  try {
    await apiFetch('/api/permissions', {
      method: 'POST',
      body: {
        name: createName.value.trim(),
        code: createCode.value.trim(),
        module: createModule.value.trim(),
        description: createDescription.value.trim() || undefined,
      }
    })

    addToast({ type: 'success', message: 'Permission baru berhasil ditambahkan' })
    isCreateOpen.value = false
    await fetchPermissions()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal menambahkan permission' })
  } finally {
    isCreating.value = false
  }
}

const handleOpenEdit = (p: PermissionRecord) => {
  editingPermission.value = p
  editName.value = p.name
  editModule.value = p.module
  editDescription.value = p.description || ''
  isEditOpen.value = true
}

const handleEditSubmit = async () => {
  if (!editingPermission.value || !editName.value.trim()) return

  isUpdating.value = true
  try {
    await apiFetch(`/api/permissions/${editingPermission.value.id}`, {
      method: 'PUT',
      body: {
        name: editName.value.trim(),
        module: editModule.value.trim(),
        description: editDescription.value.trim() || undefined,
      }
    })

    addToast({ type: 'success', message: 'Permission berhasil diperbarui' })
    isEditOpen.value = false
    await fetchPermissions()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal memperbarui permission' })
  } finally {
    isUpdating.value = false
  }
}

const handleOpenDelete = (p: PermissionRecord) => {
  if (defaultCodes.includes(p.code)) {
    addToast({ type: 'warning', message: 'Permission bawaan sistem tidak dapat dihapus' })
    return
  }
  deletingPermission.value = p
  isDeleteOpen.value = true
}

const handleDeleteSubmit = async () => {
  if (!deletingPermission.value) return

  isDeleting.value = true
  try {
    await apiFetch(`/api/permissions/${deletingPermission.value.id}`, {
      method: 'DELETE'
    })

    addToast({ type: 'success', message: 'Permission berhasil dihapus' })
    isDeleteOpen.value = false
    await fetchPermissions()
  } catch (e: any) {
    addToast({ type: 'danger', message: e.statusMessage || e.message || 'Gagal menghapus permission' })
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Permission</h1>
      <p class="text-sm text-slate-500 mt-1">
        Kelola hak akses dan izin pengguna dalam sistem.
      </p>
    </div>

    <!-- Action Bar (Purple Button + Search Input matching reference) -->
    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <button
        type="button"
        @click="handleOpenCreate"
        class="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-sm transition min-h-touch shrink-0"
      >
        <Icon name="heroicons:plus" class="w-4 h-4" />
        Tambah Permission
      </button>

      <div class="relative flex-grow">
        <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari group, nama, route..."
          class="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 min-h-touch"
        />
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-900 mb-2"></div>
      <p class="text-sm text-slate-500">Memuat daftar permission...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredPermissions.length === 0" class="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
      <Icon name="heroicons:key" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <h3 class="text-base font-semibold text-slate-800">Tidak ada permission ditemukan</h3>
      <p class="text-sm text-slate-500 mt-1">Coba kata kunci pencarian lain atau tambahkan permission baru.</p>
    </div>

    <!-- Data Table Card (Matching Screenshot 1) -->
    <div v-else class="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 class="text-xs font-extrabold tracking-wider uppercase text-slate-500">DATA PERMISSION</h3>
        <span class="text-xs font-semibold text-slate-400">{{ filteredPermissions.length }} Total</span>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100">
          <thead class="bg-slate-50/80">
            <tr>
              <th class="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-16">NO</th>
              <th class="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">GROUP</th>
              <th class="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">NAME</th>
              <th class="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">ROUTE NAME</th>
              <th class="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">DEFAULT</th>
              <th class="px-6 py-3.5 text-right text-[11px] font-extrabold text-slate-400 uppercase tracking-wider w-28">ACTIONS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr
              v-for="(p, index) in filteredPermissions"
              :key="p.id"
              class="hover:bg-slate-50/70 transition-colors"
            >
              <td class="px-6 py-4 text-xs font-semibold text-slate-500">{{ index + 1 }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                  {{ formatModuleLabel(p.module) }}
                </span>
              </td>
              <td class="px-6 py-4">
                <div class="text-xs font-bold text-slate-800">{{ p.name }}</div>
                <div v-if="p.description" class="text-[11px] text-slate-400 mt-0.5">{{ p.description }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <code class="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-mono font-semibold">{{ p.code }}</code>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span
                  class="text-xs font-semibold"
                  :class="defaultCodes.includes(p.code) ? 'text-slate-500' : 'text-purple-600'"
                >
                  {{ defaultCodes.includes(p.code) ? 'Default' : 'Non-Default' }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right space-x-1.5">
                <!-- Yellow Edit Button -->
                <button
                  type="button"
                  @click="handleOpenEdit(p)"
                  class="p-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm inline-flex items-center justify-center min-h-[34px] min-w-[34px]"
                  title="Edit Permission"
                >
                  <Icon name="heroicons:pencil-square" class="w-4 h-4" />
                </button>
                <!-- Red Delete Button -->
                <button
                  type="button"
                  @click="handleOpenDelete(p)"
                  :disabled="defaultCodes.includes(p.code)"
                  class="p-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white transition shadow-sm inline-flex items-center justify-center min-h-[34px] min-w-[34px] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Hapus Permission"
                >
                  <Icon name="heroicons:trash" class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Tambah Permission -->
    <AppModal
      v-model="isCreateOpen"
      title="Tambah Permission Baru"
    >
      <div class="space-y-4 py-1">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Nama Permission *</label>
          <AppInput
            v-model="createName"
            placeholder="Contoh: view reports"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Route / Kode Name *</label>
          <AppInput
            v-model="createCode"
            placeholder="Contoh: reports:view atau admin.reports.index"
            class="w-full"
          />
          <p class="text-[11px] text-slate-400 mt-1">Gunakan kode unik berupa huruf kecil dan titik/titik dua.</p>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Group / Modul *</label>
          <select
            v-model="createModule"
            class="w-full text-xs font-semibold px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white min-h-touch"
          >
            <option v-for="m in modulePresets" :key="m.value" :value="m.value">
              {{ m.label }} ({{ m.value }})
            </option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
          <textarea
            v-model="createDescription"
            rows="2"
            placeholder="Tuliskan fungsi hak akses ini..."
            class="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isCreateOpen = false">Batal</AppButton>
        <AppButton :loading="isCreating" @click="handleCreateSubmit">Simpan Permission</AppButton>
      </template>
    </AppModal>

    <!-- Modal Ubah Permission -->
    <AppModal
      v-model="isEditOpen"
      :title="`Edit Permission: ${editingPermission?.name || ''}`"
    >
      <div v-if="editingPermission" class="space-y-4 py-1">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Nama Permission *</label>
          <AppInput
            v-model="editName"
            class="w-full"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Kode (Tidak dapat diubah)</label>
          <input
            :value="editingPermission.code"
            disabled
            class="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-xl text-xs font-mono text-slate-500 cursor-not-allowed"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1">Group / Modul *</label>
          <select
            v-model="editModule"
            class="w-full text-xs font-semibold px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white min-h-touch"
          >
            <option v-for="m in modulePresets" :key="m.value" :value="m.value">
              {{ m.label }} ({{ m.value }})
            </option>
          </select>
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

    <!-- Modal Hapus Permission -->
    <AppModal
      v-model="isDeleteOpen"
      title="Hapus Permission"
    >
      <div v-if="deletingPermission" class="space-y-3 py-1">
        <p class="text-sm text-slate-600">
          Apakah Anda yakin ingin menghapus permission <strong class="text-slate-900 font-bold">{{ deletingPermission.name }}</strong> (<code>{{ deletingPermission.code }}</code>)?
        </p>
        <p class="text-xs text-rose-600 font-semibold">
          ⚠️ Tindakan ini permanen. Seluruh relasi peran ke permission ini akan otomatis terhapus.
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
