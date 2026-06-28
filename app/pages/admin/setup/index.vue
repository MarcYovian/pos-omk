<!-- pages/admin/setup.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useSessionStore } from '~/stores/session'
import { useUmkmStore } from '~/stores/umkm'
import { useProductStore } from '~/stores/products'
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
const sessionStore = useSessionStore()
const umkmStore = useUmkmStore()
const productStore = useProductStore()
const { addToast } = useToast()

const searchQuery = ref('')

const filteredUmkmList = computed(() => {
  if (!searchQuery.value.trim()) return umkmStore.umkmList
  const query = searchQuery.value.toLowerCase().trim()
  return umkmStore.umkmList.filter(u => 
    u.nama_umkm.toLowerCase().includes(query) || 
    u.kontak_wa.toLowerCase().includes(query)
  )
})

const isAddUmkmOpen = ref(false)
const newUmkmName = ref('')
const newUmkmWa = ref('')
const isSubmitting = ref(false)
const isReopening = ref(false)

const canReopen = computed(() => !!authStore.user?.user_metadata?.can_reopen_session)

const handleReopenSession = async () => {
  isReopening.value = true
  try {
    if (!authStore.user?.id) throw new Error('Admin tidak teridentifikasi')
    await sessionStore.reopenSession(authStore.user.id)
    addToast({
      type: 'success',
      message: 'Sesi berhasil dibuka kembali.'
    })
    await loadAllData()
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal membuka kembali sesi'
    })
  } finally {
    isReopening.value = false
  }
}

const loadAllData = async () => {
  try {
    await sessionStore.fetchTodaySession()
    await umkmStore.fetchAll()
    if (sessionStore.currentSession) {
      await productStore.fetchTodayProducts()
    }
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat data' })
  }
}

onMounted(() => {
  loadAllData()
})

const getProductCountForUmkm = (umkmId: string) => {
  return productStore.products.filter(p => p.umkm_id === umkmId).length
}

const handleOpenAddUmkm = () => {
  newUmkmName.value = ''
  newUmkmWa.value = ''
  isAddUmkmOpen.value = true
}

const handleAddUmkmSubmit = async () => {
  if (!newUmkmName.value.trim() || !newUmkmWa.value.trim()) return
  
  // Basic WA check (must be country code format without +, e.g., 628...)
  let waClean = newUmkmWa.value.replace(/[^0-9]/g, '')
  if (!waClean.startsWith('62')) {
    addToast({ type: 'warning', message: 'Nomor WhatsApp harus dimulai dengan kode negara 62' })
    return
  }

  isSubmitting.value = true
  try {
    await umkmStore.addUmkm(newUmkmName.value, waClean)
    isAddUmkmOpen.value = false
    addToast({ type: 'success', message: 'Mitra UMKM berhasil didaftarkan' })
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal mendaftarkan mitra' })
  } finally {
    isSubmitting.value = false
  }
}

// Edit UMKM State
const isEditUmkmOpen = ref(false)
const editingUmkm = ref<any>(null)
const editUmkmName = ref('')
const editUmkmWa = ref('')
const isEditSubmitting = ref(false)

const handleOpenEditUmkm = (umkm: any) => {
  editingUmkm.value = umkm
  editUmkmName.value = umkm.nama_umkm
  editUmkmWa.value = umkm.kontak_wa
  isEditUmkmOpen.value = true
}

const handleEditUmkmSubmit = async () => {
  if (!editingUmkm.value || !editUmkmName.value.trim() || !editUmkmWa.value.trim()) return

  let waClean = editUmkmWa.value.replace(/[^0-9]/g, '')
  if (!waClean.startsWith('62')) {
    addToast({ type: 'warning', message: 'Nomor WhatsApp harus dimulai dengan kode negara 62' })
    return
  }

  isEditSubmitting.value = true
  try {
    await umkmStore.updateUmkm(editingUmkm.value.id, {
      nama_umkm: editUmkmName.value.trim(),
      kontak_wa: waClean
    })
    isEditUmkmOpen.value = false
    addToast({ type: 'success', message: 'Mitra UMKM berhasil diperbarui' })
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memperbarui mitra' })
  } finally {
    isEditSubmitting.value = false
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    
    <!-- Action Top Bar -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
      <div>
        <h2 class="text-sm font-bold text-slate-800">Setup Katalog & Mitra</h2>
        <p class="text-xs text-slate-500 mt-0.5">Kelola mitra UMKM dan inventori kue sesi ini</p>
      </div>
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
        <!-- Search Input -->
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
          @click="handleOpenAddUmkm"
          variant="primary"
          size="sm"
          v-if="!sessionStore.isClosed"
          class="font-bold text-xs shadow-sm shrink-0"
        >
          Tambah UMKM
        </AppButton>
      </div>
    </div>

    <!-- Session Action Card -->
    <div v-if="!sessionStore.currentSession" class="bg-white border p-6 rounded-2xl shadow-sm text-center flex flex-col items-center gap-4">
      <Icon name="heroicons:calendar-days" class="w-12 h-12 text-slate-400" />
      <h2 class="text-md font-bold text-slate-800">Mulai Sesi Baru</h2>
      <p class="text-xs text-slate-500 font-medium max-w-md">
        Belum ada sesi penjualan yang dibuat untuk hari ini ({{ useSessionDate().formattedToday.value }}). Silakan buat sesi terlebih dahulu.
      </p>
      <AppButton @click="sessionStore.openSession(authStore.user?.id || '')">
        Buat Sesi Hari Ini
      </AppButton>
    </div>

    <template v-else>
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-bold text-slate-700">Daftar Mitra UMKM (Hari Ini)</h2>
        <span class="text-xs text-slate-500 font-mono font-bold">{{ sessionStore.sessionDate }}</span>
      </div>

      <div v-if="umkmStore.umkmList.length === 0" class="text-center py-12 bg-white rounded-2xl border border-dashed text-slate-400 text-sm">
        Belum ada mitra UMKM terdaftar.
      </div>

      <div v-else-if="filteredUmkmList.length === 0" class="text-center py-12 bg-white rounded-2xl border border-dashed text-slate-400 text-sm">
        Tidak ada mitra yang cocok dengan pencarian "{{ searchQuery }}".
      </div>

      <!-- UMKM List Cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="u in filteredUmkmList"
          :key="u.id"
          class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between gap-4"
        >
          <div class="flex flex-col gap-1">
            <h3 class="font-bold text-slate-800 text-sm leading-snug">{{ u.nama_umkm }}</h3>
            <p class="text-xs font-mono font-bold text-slate-400 mt-0.5">WA: {{ u.kontak_wa }}</p>
            <div class="mt-2">
              <span class="text-xs bg-brand-50 text-brand-900 font-bold px-2.5 py-0.5 rounded-full">
                {{ getProductCountForUmkm(u.id) }} Produk Hari Ini
              </span>
            </div>
          </div>
          <div class="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
            <button
              @click="handleOpenEditUmkm(u)"
              class="p-1.5 text-slate-400 hover:text-brand-900 hover:bg-slate-100 border border-slate-150 bg-slate-50 rounded-lg transition min-h-[32px] min-w-[32px] flex items-center justify-center shrink-0"
              title="Edit Mitra"
            >
              <Icon name="heroicons:pencil-square" class="w-5 h-5" />
            </button>
            <NuxtLink :to="`/admin/setup/${u.id}`" class="flex-grow sm:flex-grow-0">
              <AppButton variant="primary" size="sm" class="w-full font-bold text-xs whitespace-nowrap">
                Kelola Produk
              </AppButton>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- closed banner warning -->
      <div v-if="sessionStore.isClosed" class="p-4 bg-danger/10 border border-danger/20 rounded-xl text-xs font-semibold text-danger flex flex-col md:flex-row items-center justify-between gap-3">
        <span>Pemberitahuan: Sesi sudah ditutup. Anda tidak dapat memodifikasi katalog produk atau stok lagi.</span>
        <AppButton
          v-if="canReopen"
          @click="handleReopenSession"
          variant="danger"
          size="sm"
          class="text-xs font-bold font-sans self-center !bg-danger/25 !text-danger hover:!bg-danger/40 border-0"
          :loading="isReopening"
        >
          Buka Kembali Sesi
        </AppButton>
      </div>
    </template>

    <!-- Add UMKM Modal -->
    <AppModal
      v-model="isAddUmkmOpen"
      title="Daftarkan UMKM Baru"
    >
      <div class="flex flex-col gap-4 py-2">
        <AppInput
          v-model="newUmkmName"
          label="Nama UMKM / Pemilik"
          placeholder="Contoh: Ibu Sari"
          required
        />

        <AppInput
          v-model="newUmkmWa"
          label="Nomor WhatsApp"
          placeholder="Contoh: 6281234567890"
          hint="Gunakan kode negara (62) di depan, tanpa spasi/karakter spesial"
          required
        />

      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isAddUmkmOpen = false">Batal</AppButton>
        <AppButton :loading="isSubmitting" @click="handleAddUmkmSubmit">Simpan</AppButton>
      </template>
    </AppModal>

    <!-- Edit UMKM Modal -->
    <AppModal
      v-model="isEditUmkmOpen"
      title="Edit Mitra UMKM"
    >
      <div class="flex flex-col gap-4 py-2">
        <AppInput
          v-model="editUmkmName"
          label="Nama UMKM / Pemilik"
          placeholder="Contoh: Ibu Sari"
          required
        />

        <AppInput
          v-model="editUmkmWa"
          label="Nomor WhatsApp"
          placeholder="Contoh: 6281234567890"
          hint="Gunakan kode negara (62) di depan, tanpa spasi/karakter spesial"
          required
        />
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isEditUmkmOpen = false">Batal</AppButton>
        <AppButton :loading="isEditSubmitting" @click="handleEditUmkmSubmit">Simpan Perubahan</AppButton>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>
