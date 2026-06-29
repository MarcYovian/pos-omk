<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useUmkmStore } from '~/stores/umkm'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const umkmStore = useUmkmStore()
const { addToast } = useToast()

// State
const searchQuery = ref('')
const isAddOpen = ref(false)
const isEditOpen = ref(false)

// Add Form State
const newName = ref('')
const newWa = ref('')
const isCreating = ref(false)

// Edit Form State
const editingUmkm = ref<any>(null)
const editName = ref('')
const editWa = ref('')
const editIsActive = ref(true)
const isUpdating = ref(false)

// Computed
const filteredUmkmList = computed(() => {
  if (!searchQuery.value.trim()) return umkmStore.umkmList
  const query = searchQuery.value.toLowerCase().trim()
  return umkmStore.umkmList.filter(u => 
    u.nama_umkm.toLowerCase().includes(query) || 
    u.kontak_wa.toLowerCase().includes(query)
  )
})

// Lifecycle
onMounted(async () => {
  try {
    await umkmStore.fetchAll()
    umkmStore.subscribeRealtime()
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat data mitra UMKM' })
  }
})

onUnmounted(() => {
  umkmStore.unsubscribeRealtime()
})

// Handlers
const openAddModal = () => {
  newName.value = ''
  newWa.value = ''
  isAddOpen.value = true
}

const handleAddSubmit = async () => {
  if (!newName.value.trim() || !newWa.value.trim()) {
    addToast({ type: 'warning', message: 'Semua kolom harus diisi' })
    return
  }

  // Sanitize and validate WA number
  const waClean = newWa.value.replace(/[^0-9]/g, '')
  if (!waClean.startsWith('62')) {
    addToast({ type: 'warning', message: 'Nomor WhatsApp harus diawali dengan kode negara 62' })
    return
  }

  isCreating.value = true
  try {
    await umkmStore.addUmkm(newName.value.trim(), waClean)
    isAddOpen.value = false
    addToast({ type: 'success', message: 'Mitra UMKM berhasil terdaftar' })
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal mendaftarkan mitra UMKM' })
  } finally {
    isCreating.value = false
  }
}

const openEditModal = (umkm: any) => {
  editingUmkm.value = umkm
  editName.value = umkm.nama_umkm
  editWa.value = umkm.kontak_wa
  editIsActive.value = umkm.is_active
  isEditOpen.value = true
}

const handleEditSubmit = async () => {
  if (!editingUmkm.value || !editName.value.trim() || !editWa.value.trim()) {
    addToast({ type: 'warning', message: 'Semua kolom harus diisi' })
    return
  }

  const waClean = editWa.value.replace(/[^0-9]/g, '')
  if (!waClean.startsWith('62')) {
    addToast({ type: 'warning', message: 'Nomor WhatsApp harus diawali dengan kode negara 62' })
    return
  }

  isUpdating.value = true
  try {
    await umkmStore.updateUmkm(editingUmkm.value.id, {
      nama_umkm: editName.value.trim(),
      kontak_wa: waClean,
      is_active: editIsActive.value
    })
    isEditOpen.value = false
    addToast({ type: 'success', message: 'Detail mitra UMKM berhasil diperbarui' })
  } catch (e: any) {
    addToast({ type: 'danger', message: e.message || 'Gagal memperbarui mitra UMKM' })
  } finally {
    isUpdating.value = false
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <!-- Top Action Bar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
      <div>
        <h2 class="text-sm font-bold text-slate-800">Profil & Data Master UMKM</h2>
        <p class="text-xs text-slate-500 mt-0.5">Kelola data mitra konsinyasi OMK serta katalog produk master mereka</p>
      </div>
      
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <!-- Search -->
        <div class="relative w-full sm:w-64">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari nama mitra atau WA..."
            class="w-full text-xs font-semibold pl-8 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50/50"
          />
          <Icon name="heroicons:magnifying-glass" class="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
        
        <AppButton
          @click="openAddModal"
          variant="primary"
          size="sm"
          class="font-bold text-xs shadow-sm shrink-0"
        >
          Tambah UMKM
        </AppButton>
      </div>
    </div>

    <!-- Main List/Grid -->
    <div v-if="umkmStore.isLoading && umkmStore.umkmList.length === 0" class="text-center py-12 text-slate-400 text-sm font-medium">
      Memuat data mitra UMKM...
    </div>

    <div v-else-if="umkmStore.umkmList.length === 0" class="text-center py-12 bg-white rounded-2xl border border-slate-150 shadow-sm text-slate-400 text-sm">
      Belum ada mitra UMKM terdaftar di sistem.
    </div>

    <div v-else-if="filteredUmkmList.length === 0" class="text-center py-12 bg-white rounded-2xl border border-slate-150 shadow-sm text-slate-400 text-sm">
      Tidak ada mitra yang cocok dengan pencarian "{{ searchQuery }}".
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      <div
        v-for="u in filteredUmkmList"
        :key="u.id"
        class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-250 flex flex-col justify-between gap-4 group"
      >
        <div class="flex flex-col gap-2">
          <!-- Title & Status Badge -->
          <div class="flex items-start justify-between gap-2">
            <h3 class="font-extrabold text-slate-800 text-sm leading-snug group-hover:text-brand-900 transition-colors">
              {{ u.nama_umkm }}
            </h3>
            <span
              class="text-[9px] font-black px-2.5 py-0.5 rounded-full border tracking-wide uppercase shrink-0"
              :class="u.is_active 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                : 'bg-slate-50 text-slate-400 border-slate-200'"
            >
              {{ u.is_active ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>

          <!-- Contact info -->
          <div class="flex items-center gap-2 mt-1">
            <div class="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
              <Icon name="heroicons:chat-bubble-left-right" class="w-4 h-4" />
            </div>
            <div class="flex flex-col">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono">WhatsApp</span>
              <a 
                :href="`https://wa.me/${u.kontak_wa}`" 
                target="_blank" 
                class="text-xs font-mono font-bold text-slate-700 hover:text-brand-600 transition-colors"
              >
                +{{ u.kontak_wa }}
              </a>
            </div>
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="border-t border-slate-100 pt-3 flex items-center gap-2">
          <button
            @click="openEditModal(u)"
            class="p-2 text-slate-400 hover:text-brand-900 hover:bg-slate-100 border border-slate-150 bg-slate-50 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
            title="Edit UMKM"
          >
            <Icon name="heroicons:pencil-square" class="w-4.5 h-4.5" />
          </button>
          
          <NuxtLink :to="`/admin/umkm/${u.id}`" class="flex-grow">
            <AppButton 
              variant="primary" 
              size="sm" 
              class="w-full font-bold text-xs whitespace-nowrap !rounded-xl"
            >
              <Icon name="heroicons:gift" class="w-4 h-4 mr-1.5 shrink-0" />
              Katalog Master
            </AppButton>
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <AppModal v-model="isAddOpen" title="Daftarkan UMKM Baru">
      <form @submit.prevent="handleAddSubmit" class="flex flex-col gap-4 py-2">
        <AppInput
          v-model="newName"
          label="Nama UMKM / Pemilik"
          placeholder="Contoh: Ibu Sari"
          required
        />
        <AppInput
          v-model="newWa"
          label="Nomor WhatsApp"
          placeholder="Contoh: 628123456789"
          hint="Harus diawali 62 (kode negara), tanpa spasi, tanda tambah (+) atau strip"
          required
        />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="isAddOpen = false">Batal</AppButton>
        <AppButton :loading="isCreating" @click="handleAddSubmit">Simpan</AppButton>
      </template>
    </AppModal>

    <!-- Edit Modal -->
    <AppModal v-model="isEditOpen" title="Edit Mitra UMKM">
      <form @submit.prevent="handleEditSubmit" class="flex flex-col gap-4 py-2">
        <AppInput
          v-model="editName"
          label="Nama UMKM / Pemilik"
          placeholder="Contoh: Ibu Sari"
          required
        />
        <AppInput
          v-model="editWa"
          label="Nomor WhatsApp"
          placeholder="Contoh: 628123456789"
          hint="Harus diawali 62, tanpa spasi/tanda tambah/strip"
          required
        />
        
        <!-- Toggle Active Status -->
        <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-150">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-slate-800">Status Kemitraan</span>
            <span class="text-[10px] text-slate-400 font-semibold mt-0.5">Nonaktifkan untuk menyembunyikan mitra dari setup sesi baru</span>
          </div>
          <button
            type="button"
            @click="editIsActive = !editIsActive"
            class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none"
            :class="editIsActive ? 'bg-emerald-500' : 'bg-slate-200'"
          >
            <span
              class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
              :class="editIsActive ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="isEditOpen = false">Batal</AppButton>
        <AppButton :loading="isUpdating" @click="handleEditSubmit">Simpan Perubahan</AppButton>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>
