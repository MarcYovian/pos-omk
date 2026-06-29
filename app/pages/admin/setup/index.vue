<!-- pages/admin/setup/index.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useSessionStore } from '~/stores/session'
import { useUmkmStore } from '~/stores/umkm'
import { useProductStore } from '~/stores/products'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'

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
const isReopening = ref(false)

// State for partners manually added to the current session
const temporarilyAddedUmkmIds = ref<string[]>([])
const isAddMitraOpen = ref(false)
const selectedUmkmIdToAdd = ref('')

// Load manually added partners from localStorage
const loadTemporarilyAddedUmkm = () => {
  if (!sessionStore.sessionId) return
  const saved = localStorage.getItem(`session_umkm_${sessionStore.sessionId}`)
  if (saved) {
    try {
      temporarilyAddedUmkmIds.value = JSON.parse(saved)
    } catch {
      temporarilyAddedUmkmIds.value = []
    }
  } else {
    temporarilyAddedUmkmIds.value = []
  }
}

// Save manually added partners to localStorage
const saveTemporarilyAddedUmkm = () => {
  if (!sessionStore.sessionId) return
  localStorage.setItem(`session_umkm_${sessionStore.sessionId}`, JSON.stringify(temporarilyAddedUmkmIds.value))
}

const getProductCountForUmkm = (umkmId: string) => {
  return productStore.products.filter(p => p.umkm_id === umkmId).length
}

// Partners currently in the session (have products OR manually added)
const sessionUmkmList = computed(() => {
  return umkmStore.umkmList.filter(u => {
    return u.is_active && (getProductCountForUmkm(u.id) > 0 || temporarilyAddedUmkmIds.value.includes(u.id))
  })
})

const filteredUmkmList = computed(() => {
  if (!searchQuery.value.trim()) return sessionUmkmList.value
  const query = searchQuery.value.toLowerCase().trim()
  return sessionUmkmList.value.filter(u => 
    u.nama_umkm.toLowerCase().includes(query) || 
    u.kontak_wa.toLowerCase().includes(query)
  )
})

// Active partners not yet in the session
const availableUmkmToSelect = computed(() => {
  const currentIds = new Set(sessionUmkmList.value.map(u => u.id))
  return umkmStore.umkmList.filter(u => u.is_active && !currentIds.has(u.id))
})

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
      loadTemporarilyAddedUmkm()
    }
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat data' })
  }
}

onMounted(() => {
  loadAllData()
})

const handleAddMitraToSession = () => {
  if (!selectedUmkmIdToAdd.value) return
  
  if (!temporarilyAddedUmkmIds.value.includes(selectedUmkmIdToAdd.value)) {
    temporarilyAddedUmkmIds.value.push(selectedUmkmIdToAdd.value)
    saveTemporarilyAddedUmkm()
    addToast({ type: 'success', message: 'Mitra berhasil ditambahkan ke daftar sesi' })
  }
  isAddMitraOpen.value = false
  selectedUmkmIdToAdd.value = ''
}

const handleRemoveMitraFromSession = (umkmId: string) => {
  // Only allow removing if they have no products in the session
  if (getProductCountForUmkm(umkmId) > 0) {
    addToast({ type: 'warning', message: 'Tidak dapat menghapus mitra yang memiliki produk dalam sesi' })
    return
  }

  temporarilyAddedUmkmIds.value = temporarilyAddedUmkmIds.value.filter(id => id !== umkmId)
  saveTemporarilyAddedUmkm()
  addToast({ type: 'success', message: 'Mitra dikeluarkan dari daftar sesi' })
}
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    
    <!-- Session Action Card -->
    <div v-if="!sessionStore.currentSession" class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm text-center flex flex-col items-center gap-4">
      <Icon name="heroicons:calendar-days" class="w-12 h-12 text-slate-400" />
      <h2 class="text-md font-bold text-slate-800">Mulai Sesi Baru</h2>
      <p class="text-xs text-slate-500 font-medium max-w-md">
        Belum ada sesi penjualan yang dibuat untuk hari ini ({{ useSessionDate().formattedToday.value }}). Silakan buat sesi terlebih dahulu untuk mengaktifkan setup katalog.
      </p>
      <AppButton @click="sessionStore.openSession(authStore.user?.id || '')">
        Buat Sesi Hari Ini
      </AppButton>
    </div>

    <template v-else>
      <!-- Top Action Bar -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
        <div>
          <h2 class="text-sm font-bold text-slate-800">Setup Katalog Produk Sesi</h2>
          <p class="text-xs text-slate-500 mt-0.5">Pilih mitra UMKM dan alokasikan produk untuk sesi hari ini</p>
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
            v-if="!sessionStore.isClosed"
            @click="isAddMitraOpen = true"
            variant="primary"
            size="sm"
            class="font-bold text-xs shadow-sm shrink-0 !rounded-xl"
          >
            <Icon name="heroicons:plus" class="w-4 h-4 mr-1.5 shrink-0" />
            Pilih Mitra Sesi
          </AppButton>
        </div>
      </div>

      <!-- Section Title -->
      <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-150">
        <h2 class="text-xs font-bold text-slate-700">Mitra Berpartisipasi (Sesi Hari Ini)</h2>
        <span class="text-xs text-slate-500 font-mono font-bold">{{ sessionStore.sessionDate }}</span>
      </div>

      <!-- Empty States -->
      <div v-if="sessionUmkmList.length === 0" class="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-250 p-6 flex flex-col items-center gap-3 text-slate-450 text-sm shadow-sm">
        <Icon name="heroicons:users" class="w-10 h-10 text-slate-350" />
        <p class="font-semibold">Belum ada mitra terpilih untuk sesi hari ini.</p>
        <p class="text-xs text-slate-400 max-w-sm">Klik tombol "Pilih Mitra Sesi" di atas untuk menambahkan mitra yang akan berpartisipasi pada sesi minggu ini.</p>
      </div>

      <div v-else-if="filteredUmkmList.length === 0" class="text-center py-12 bg-white rounded-2xl border border-slate-150 shadow-sm text-slate-400 text-sm">
        Tidak ada mitra aktif terpilih yang cocok dengan pencarian "{{ searchQuery }}".
      </div>

      <!-- UMKM Cards -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="u in filteredUmkmList"
          :key="u.id"
          class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group"
        >
          <div class="flex flex-col gap-1">
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-bold text-slate-800 text-sm leading-snug group-hover:text-brand-900 transition-colors">
                {{ u.nama_umkm }}
              </h3>
              <!-- Remove from session option for partners with 0 products -->
              <button
                v-if="!sessionStore.isClosed && getProductCountForUmkm(u.id) === 0"
                @click="handleRemoveMitraFromSession(u.id)"
                class="p-1 text-slate-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition"
                title="Batalkan keikutsertaan mitra di sesi ini"
              >
                <Icon name="heroicons:x-mark" class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs font-mono font-bold text-slate-400 mt-0.5">WA: +{{ u.kontak_wa }}</p>
            <div class="mt-2">
              <span class="text-xs font-bold px-2.5 py-0.5 rounded-full border"
                :class="getProductCountForUmkm(u.id) > 0 
                  ? 'bg-brand-50 text-brand-900 border-brand-100' 
                  : 'bg-amber-50 text-amber-800 border-amber-100'"
              >
                {{ getProductCountForUmkm(u.id) }} Produk Sesi
              </span>
            </div>
          </div>
          
          <div class="border-t border-slate-100 pt-3 flex items-center justify-end">
            <NuxtLink :to="`/admin/setup/${u.id}`" class="w-full">
              <AppButton variant="primary" size="sm" class="w-full font-bold text-xs whitespace-nowrap !rounded-xl">
                <Icon name="heroicons:cog" class="w-4 h-4 mr-1.5 shrink-0" />
                Setup Produk Sesi
              </AppButton>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Closed Session Warning Banner -->
      <div v-if="sessionStore.isClosed" class="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-xs font-semibold text-danger flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div class="flex items-center gap-2">
          <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 shrink-0" />
          <span>Sesi hari ini sudah ditutup. Katalog produk dan stok sudah dikunci (read-only).</span>
        </div>
        <AppButton
          v-if="canReopen"
          @click="handleReopenSession"
          variant="danger"
          size="sm"
          class="text-xs font-bold font-sans self-center !bg-danger/25 !text-danger hover:!bg-danger/40 border-0 !rounded-xl"
          :loading="isReopening"
        >
          Buka Kembali Sesi
        </AppButton>
      </div>
    </template>

    <!-- Modal to select and add UMKM to session -->
    <AppModal v-model="isAddMitraOpen" title="Pilih Mitra untuk Sesi Ini" size="sm">
      <div class="flex flex-col gap-4 py-2">
        <div class="flex flex-col w-full gap-1.5">
          <label class="text-xs font-bold text-slate-500">Pilih Mitra UMKM<span class="text-danger">*</span></label>
          <select
            v-model="selectedUmkmIdToAdd"
            required
            class="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold text-slate-800 min-h-[44px]"
          >
            <option value="" disabled>-- Pilih Mitra --</option>
            <option v-for="u in availableUmkmToSelect" :key="u.id" :value="u.id">
              {{ u.nama_umkm }} (WA: +{{ u.kontak_wa }})
            </option>
          </select>
          <p v-if="availableUmkmToSelect.length === 0" class="text-[10px] text-amber-600 font-medium">
            Semua mitra aktif sudah ditambahkan ke sesi hari ini.
          </p>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isAddMitraOpen = false">Batal</AppButton>
        <AppButton :disabled="!selectedUmkmIdToAdd" @click="handleAddMitraToSession">Tambahkan</AppButton>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>
