<!-- pages/admin/setup/[umkm_id].vue -->
<template>
  <div class="w-full flex flex-col gap-6">
    
    <!-- Top Header -->
    <div class="flex items-center justify-between bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/setup" class="hover:bg-slate-100 p-2 rounded-xl transition flex items-center justify-center border border-transparent hover:border-slate-200">
          <Icon name="heroicons:arrow-left" class="w-5 h-5 text-slate-500" />
        </NuxtLink>
        <div>
          <h2 class="text-sm font-bold text-slate-800">Setup Produk Sesi</h2>
          <p class="text-xs text-slate-500 mt-0.5">{{ umkm?.nama_umkm || 'Memuat...' }}</p>
        </div>
      </div>
      <div v-if="sessionStore.currentSession" class="text-xs font-bold text-slate-400 bg-slate-50 border border-slate-150 px-3 py-1.5 rounded-xl font-mono">
        Sesi: {{ sessionStore.sessionDate }}
      </div>
    </div>

    <!-- Session Warning / Status -->
    <div v-if="!sessionStore.currentSession" class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm text-center flex flex-col items-center gap-3">
      <Icon name="heroicons:exclamation-triangle" class="w-10 h-10 text-amber-500" />
      <h3 class="font-bold text-slate-800 text-sm">Sesi Tidak Aktif</h3>
      <p class="text-xs text-slate-500 max-w-sm">Tidak ada sesi penjualan aktif hari ini. Silakan buat sesi terlebih dahulu di menu setup.</p>
      <NuxtLink to="/admin/setup">
        <AppButton size="sm">Kembali ke Setup</AppButton>
      </NuxtLink>
    </div>

    <template v-else>
      <!-- Action Bar -->
      <div class="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 class="text-sm font-bold text-slate-750">Daftar Produk Sesi Ini</h2>
          <p class="text-xs text-slate-450 mt-0.5">{{ sessionProducts.length }} produk dimasukkan ke sesi</p>
        </div>
        <AppButton 
          v-if="!sessionStore.isClosed"
          @click="openAddModal" 
          variant="primary" 
          size="sm" 
          class="font-bold text-xs !rounded-xl self-start sm:self-auto shrink-0"
        >
          Tambah Produk ke Sesi
        </AppButton>
      </div>

      <!-- Closed Banner -->
      <div v-if="sessionStore.isClosed" class="p-3 bg-danger/10 border border-danger/20 rounded-xl text-xs font-semibold text-danger flex items-center gap-2">
        <Icon name="heroicons:lock-closed" class="w-4 h-4 shrink-0" />
        <span>Sesi sudah ditutup. Katalog produk dan stok sesi ini dikunci (read-only).</span>
      </div>

      <!-- Products Grid -->
      <div v-if="isLoading" class="text-center py-12 text-slate-400 text-sm font-medium">
        Memuat produk sesi...
      </div>

      <div v-else-if="sessionProducts.length === 0" class="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-450 text-sm">
        Belum ada produk dari mitra ini yang dimasukkan ke sesi hari ini. Klik "Tambah Produk ke Sesi" untuk memulai.
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="p in sessionProducts"
          :key="p.id"
          class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group"
          :class="{ 'opacity-70': !p.is_active }"
        >
          <div class="flex flex-col gap-2">
            <!-- Header Product -->
            <div class="flex items-start justify-between gap-2">
              <h3 class="font-extrabold text-slate-800 text-sm leading-snug group-hover:text-brand-900 transition-colors">
                {{ p.nama_produk }}
              </h3>
              <span
                class="text-[9px] font-black px-2.5 py-0.5 rounded-full border tracking-wide uppercase shrink-0"
                :class="p.is_active 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                  : 'bg-slate-50 text-slate-400 border-slate-200'"
              >
                {{ p.is_active ? 'Sesi Aktif' : 'Sesi Nonaktif' }}
              </span>
            </div>

            <!-- Financial details -->
            <div class="grid grid-cols-2 gap-2 mt-2">
              <div class="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col gap-0.5">
                <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Harga UMKM</span>
                <span class="text-xs font-mono font-bold text-slate-800 tabular-nums">{{ useCurrencyFormat(p.harga_asli) }}</span>
              </div>
              <div class="bg-brand-50/30 p-2 rounded-xl border border-brand-100/40 flex flex-col gap-0.5">
                <span class="text-[8px] font-bold text-brand-900/60 uppercase tracking-wider">Harga Jual POS</span>
                <span class="text-xs font-mono font-bold text-brand-900 tabular-nums">{{ useCurrencyFormat(p.harga_jual) }}</span>
              </div>
            </div>

            <!-- Stock status -->
            <div class="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between mt-1">
              <div class="flex items-center gap-1.5">
                <Icon name="heroicons:circle-stack" class="w-4 h-4 text-slate-400" />
                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Stok</span>
              </div>
              <span class="text-xs font-mono font-bold text-slate-850 tabular-nums">
                {{ p.stok_sekarang }} <span class="text-slate-400 font-normal">/ {{ p.stok_awal }}</span>
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="border-t border-slate-100 pt-3 flex items-center justify-between gap-2">
            <!-- Active Toggle Button -->
            <button
              v-if="!sessionStore.isClosed"
              @click="handleToggleActive(p)"
              class="text-xs font-bold px-3 py-1.5 rounded-xl border transition flex items-center gap-1"
              :class="p.is_active 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'"
              :title="p.is_active ? 'Nonaktifkan di Kasir' : 'Aktifkan di Kasir'"
            >
              <Icon :name="p.is_active ? 'heroicons:eye' : 'heroicons:eye-slash'" class="w-4 h-4" />
              <span>{{ p.is_active ? 'Aktif' : 'Kunci' }}</span>
            </button>
            <div v-else class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Terkunci
            </div>

            <div v-if="!sessionStore.isClosed" class="flex items-center gap-1.5">
              <button
                @click="openEditModal(p)"
                class="p-2 text-slate-400 hover:text-brand-900 hover:bg-slate-100 border border-slate-150 bg-slate-50 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Edit Sesi Produk"
              >
                <Icon name="heroicons:pencil-square" class="w-4.5 h-4.5" />
              </button>
              
              <button
                @click="handleDeleteSessionProduct(p.id)"
                class="p-2 text-slate-400 hover:text-danger hover:bg-red-50 border border-slate-150 bg-slate-50 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Hapus dari Sesi"
              >
                <Icon name="heroicons:trash" class="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Add Product to Session Modal -->
    <AppModal v-model="isAddOpen" title="Tambah Produk ke Sesi" size="md">
      <form @submit.prevent="handleAddSubmit" class="flex flex-col gap-4 py-2">
        <div class="flex flex-col w-full gap-1.5">
          <label class="text-xs font-bold text-slate-500">Pilih Produk Master<span class="text-danger">*</span></label>
          <select 
            v-model="selectedMasterId" 
            @change="onMasterProductChange"
            required
            class="w-full px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-semibold text-slate-800 min-h-[44px]"
          >
            <option value="" disabled>-- Pilih Produk Master --</option>
            <option v-for="mp in availableMasterProducts" :key="mp.id" :value="mp.id">
              {{ mp.nama_produk }} (Default: {{ useCurrencyFormat(mp.harga_asli) }})
            </option>
          </select>
          <p v-if="availableMasterProducts.length === 0" class="text-[10px] text-amber-600 font-medium">
            Semua produk master mitra ini sudah dimasukkan ke sesi hari ini, atau tidak ada produk master aktif.
          </p>
        </div>

        <AppInput 
          v-model="setupHargaUmkm" 
          label="Harga UMKM Sesi Ini (Rp)" 
          type="number" 
          placeholder="Contoh: 20000" 
          input-mode="numeric" 
          required 
        />
        
        <AppInput 
          v-model="setupHargaJual" 
          label="Harga Jual POS (Rp)" 
          type="number" 
          placeholder="Contoh: 23000" 
          input-mode="numeric" 
          required 
        />
        
        <AppInput 
          v-model="setupStokAwal" 
          label="Stok Awal Kue" 
          type="number" 
          placeholder="Contoh: 20" 
          input-mode="numeric" 
          required 
        />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="isAddOpen = false">Batal</AppButton>
        <AppButton :loading="isSettingUp" :disabled="!selectedMasterId" @click="handleAddSubmit">Simpan ke Sesi</AppButton>
      </template>
    </AppModal>

    <!-- Edit Session Product Modal -->
    <AppModal v-model="isEditOpen" title="Edit Detail Produk Sesi" size="md">
      <form @submit.prevent="handleEditSubmit" class="flex flex-col gap-4 py-2">
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-150">
          <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">PRODUK</span>
          <span class="font-extrabold text-slate-800 text-sm leading-relaxed block mt-0.5">{{ editingProduct?.nama_produk }}</span>
        </div>

        <AppInput 
          v-model="editHargaUmkm" 
          label="Harga UMKM Sesi Ini (Rp)" 
          type="number" 
          input-mode="numeric" 
          required 
        />
        
        <AppInput 
          v-model="editHargaJual" 
          label="Harga Jual POS (Rp)" 
          type="number" 
          input-mode="numeric" 
          required 
        />

        <div class="grid grid-cols-2 gap-4">
          <AppInput 
            v-model="editStokAwal" 
            label="Stok Awal" 
            type="number" 
            input-mode="numeric" 
            required 
          />
          <AppInput 
            v-model="editStokSekarang" 
            label="Stok Sekarang" 
            type="number" 
            input-mode="numeric" 
            required 
          />
        </div>

        <!-- Toggle Session Active Status -->
        <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-150">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-slate-800">Status Aktif Sesi</span>
            <span class="text-[10px] text-slate-400 font-semibold mt-0.5">Nonaktifkan untuk menyembunyikan dari menu kasir sesi ini</span>
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

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionStore } from '~/stores/session'
import { useUmkmStore } from '~/stores/umkm'
import { useProductStore } from '~/stores/products'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'
import { useCurrencyFormat } from '~/composables/useCurrencyFormat'
import type { MasterProduct, ProductAdmin } from '~/types/app'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const route = useRoute()
const sessionStore = useSessionStore()
const umkmStore = useUmkmStore()
const productStore = useProductStore()
const { addToast } = useToast()

const umkmId = route.params.umkm_id as string
const umkm = computed(() => umkmStore.umkmList.find(u => u.id === umkmId))

// State
const isLoading = ref(false)
const masterProductsList = ref<MasterProduct[]>([])

// Filter store products to get only the current session products for this UMKM
const sessionProducts = computed(() => {
  return (productStore.products as ProductAdmin[]).filter(p => p.umkm_id === umkmId)
})

// Filter master products to only show active ones not yet in today's session
const availableMasterProducts = computed(() => {
  const existingMasterIds = new Set(sessionProducts.value.map(p => p.master_product_id))
  return masterProductsList.value.filter(mp => mp.is_active && !existingMasterIds.has(mp.id))
})

// Modals
const isAddOpen = ref(false)
const isEditOpen = ref(false)

// Add Session Product fields
const selectedMasterId = ref('')
const setupHargaUmkm = ref<number | ''>('')
const setupHargaJual = ref<number | ''>('')
const setupStokAwal = ref<number | ''>('')
const isSettingUp = ref(false)

// Edit Session Product fields
const editingProduct = ref<any>(null)
const editHargaUmkm = ref<number | ''>('')
const editHargaJual = ref<number | ''>('')
const editStokAwal = ref<number | ''>('')
const editStokSekarang = ref<number | ''>('')
const editIsActive = ref(true)
const isUpdating = ref(false)

// Actions
const fetchMasterProducts = async () => {
  const supabase = useSupabase()
  const { data, error } = await supabase
    .from('master_products')
    .select('*')
    .eq('umkm_id', umkmId)
    .eq('is_active', true)
    .order('nama_produk')
  
  if (!error) {
    masterProductsList.value = data ?? []
  }
}

const loadData = async () => {
  isLoading.value = true
  try {
    await sessionStore.fetchTodaySession()
    await umkmStore.fetchAll()
    await fetchMasterProducts()
    if (sessionStore.currentSession) {
      await productStore.fetchTodayProducts()
    }
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat data sesi' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
  if (sessionStore.currentSession) {
    productStore.subscribeRealtime()
  }
})

// Handlers
const openAddModal = () => {
  selectedMasterId.value = ''
  setupHargaUmkm.value = ''
  setupHargaJual.value = ''
  setupStokAwal.value = ''
  isAddOpen.value = true
}

const onMasterProductChange = () => {
  const product = masterProductsList.value.find(mp => mp.id === selectedMasterId.value)
  if (product) {
    setupHargaUmkm.value = product.harga_asli
    // Set retail price slightly higher or empty
    setupHargaJual.value = ''
  }
}

const handleAddSubmit = async () => {
  if (!selectedMasterId.value || setupHargaUmkm.value === '' || setupHargaJual.value === '' || setupStokAwal.value === '') {
    addToast({ type: 'warning', message: 'Harap isi semua kolom' })
    return
  }

  if (Number(setupHargaJual.value) < Number(setupHargaUmkm.value)) {
    addToast({ type: 'warning', message: 'Harga jual harus lebih besar atau sama dengan harga UMKM' })
    return
  }

  const supabase = useSupabase()
  isSettingUp.value = true
  try {
    const { error } = await supabase
      .from('session_products')
      .insert({
        session_id: sessionStore.sessionId!,
        master_product_id: selectedMasterId.value,
        harga_asli: Number(setupHargaUmkm.value),
        harga_jual: Number(setupHargaJual.value),
        stok_awal: Number(setupStokAwal.value),
        stok_sekarang: Number(setupStokAwal.value),
        is_active: true
      })
    
    if (error) throw error
    addToast({ type: 'success', message: 'Produk berhasil dialokasikan ke sesi' })
    isAddOpen.value = false
    await productStore.fetchTodayProducts()
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('unique') || msg.includes('duplicate')) {
      addToast({ type: 'warning', message: 'Produk ini sudah dialokasikan di sesi ini' })
    } else {
      addToast({ type: 'danger', message: 'Gagal menambahkan produk ke sesi' })
    }
  } finally {
    isSettingUp.value = false
  }
}

const openEditModal = (product: any) => {
  editingProduct.value = product
  editHargaUmkm.value = product.harga_asli
  editHargaJual.value = product.harga_jual
  editStokAwal.value = product.stok_awal
  editStokSekarang.value = product.stok_sekarang
  editIsActive.value = product.is_active
  isEditOpen.value = true
}

const handleEditSubmit = async () => {
  if (!editingProduct.value || editHargaUmkm.value === '' || editHargaJual.value === '' || editStokAwal.value === '' || editStokSekarang.value === '') {
    addToast({ type: 'warning', message: 'Semua kolom harus diisi' })
    return
  }

  if (Number(editHargaJual.value) < Number(editHargaUmkm.value)) {
    addToast({ type: 'warning', message: 'Harga jual harus lebih besar atau sama dengan harga UMKM' })
    return
  }

  if (Number(editStokSekarang.value) > Number(editStokAwal.value) || Number(editStokSekarang.value) < 0) {
    addToast({ type: 'warning', message: 'Stok sekarang harus berkisar dari 0 sampai Stok Awal' })
    return
  }

  isUpdating.value = true
  const supabase = useSupabase()
  try {
    const { error } = await supabase
      .from('session_products')
      .update({
        harga_asli: Number(editHargaUmkm.value),
        harga_jual: Number(editHargaJual.value),
        stok_awal: Number(editStokAwal.value),
        stok_sekarang: Number(editStokSekarang.value),
        is_active: editIsActive.value
      })
      .eq('id', editingProduct.value.id)

    if (error) throw error
    addToast({ type: 'success', message: 'Katalog sesi berhasil diperbarui' })
    isEditOpen.value = false
    await productStore.fetchTodayProducts()
  } catch (e: any) {
    addToast({ type: 'danger', message: 'Gagal memperbarui katalog sesi' })
  } finally {
    isUpdating.value = false
  }
}

const handleToggleActive = async (product: any) => {
  try {
    await productStore.toggleActive(product.id, !product.is_active)
    addToast({ 
      type: 'success', 
      message: `Produk ${product.nama_produk} berhasil ${!product.is_active ? 'diaktifkan' : 'dinonaktifkan'} untuk sesi ini` 
    })
  } catch (e: any) {
    addToast({ type: 'danger', message: 'Gagal mengubah status aktif produk' })
  }
}

const handleDeleteSessionProduct = async (productId: string) => {
  if (!confirm('Apakah Anda yakin ingin mengeluarkan produk ini dari sesi hari ini?')) return
  
  const supabase = useSupabase()
  try {
    const { error } = await supabase
      .from('session_products')
      .delete()
      .eq('id', productId)

    if (error) throw error
    addToast({ type: 'success', message: 'Produk berhasil dikeluarkan dari sesi' })
    await productStore.fetchTodayProducts()
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('foreign key') || msg.includes('violates foreign key')) {
      addToast({
        type: 'danger',
        message: 'Tidak dapat mengeluarkan produk dari sesi: produk sudah memiliki transaksi penjualan. Silakan nonaktifkan saja.'
      })
    } else {
      addToast({ type: 'danger', message: 'Gagal menghapus produk dari sesi' })
    }
  }
}
</script>
