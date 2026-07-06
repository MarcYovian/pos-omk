<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useUmkmStore } from '~/stores/umkm'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'
import { useCurrencyFormat } from '~/composables/useCurrencyFormat'
import type { MasterProduct } from '~/types/app'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const route = useRoute()
const umkmStore = useUmkmStore()
const { addToast } = useToast()

const umkmId = route.params.umkm_id as string
const umkm = computed(() => umkmStore.umkmList.find(u => u.id === umkmId))

// State
const masterProducts = ref<MasterProduct[]>([])
const isLoading = ref(false)

// Modals State
const isAddOpen = ref(false)
const isEditOpen = ref(false)

// Add Form
const newName = ref('')
const newHargaAsli = ref<number | ''>('')
const isCreating = ref(false)

// Edit Form
const editingProduct = ref<MasterProduct | null>(null)
const editName = ref('')
const editHargaAsli = ref<number | ''>('')
const editIsActive = ref(true)
const isUpdating = ref(false)

// Fetch Products
const fetchMasterProducts = async () => {
  isLoading.value = true
  const supabase = useSupabase()
  try {
    const { data, error } = await supabase
      .from('master_products')
      .select('*')
      .eq('umkm_id', umkmId)
      .order('nama_produk')
    
    if (error) throw error
    masterProducts.value = data ?? []
  } catch (e: any) {
    addToast({ type: 'danger', message: 'Gagal memuat produk master' })
  } finally {
    isLoading.value = false
  }
}

const activeTab = ref<'catalog' | 'performance'>('catalog')
const isPerformanceLoading = ref(false)
const performanceProducts = ref<any[]>([])
const performanceSessions = ref<any[]>([])

const totalSoldAllTime = computed(() => performanceProducts.value.reduce((acc, p) => acc + Number(p.total_terjual), 0))
const totalRemittanceAllTime = computed(() => performanceProducts.value.reduce((acc, p) => acc + Number(p.total_setoran), 0))

const fetchPerformanceData = async () => {
  isPerformanceLoading.value = true
  const supabase = useSupabase()
  try {
    const { data: prodData, error: prodErr } = await (supabase as any)
      .rpc('get_umkm_product_performance', { p_umkm_id: umkmId })
    if (prodErr) throw prodErr
    performanceProducts.value = (prodData as any) || []

    const { data: sessData, error: sessErr } = await (supabase as any)
      .rpc('get_umkm_session_history', { p_umkm_id: umkmId })
    if (sessErr) throw sessErr
    performanceSessions.value = (sessData as any) || []
  } catch (e: any) {
    addToast({ type: 'danger', message: 'Gagal memuat statistik performa' })
  } finally {
    isPerformanceLoading.value = false
  }
}

watch(activeTab, (newTab) => {
  if (newTab === 'performance' && performanceProducts.value.length === 0) {
    fetchPerformanceData()
  }
})

onMounted(async () => {
  await umkmStore.fetchAll()
  await fetchMasterProducts()
})

// Handlers
const openAddModal = () => {
  newName.value = ''
  newHargaAsli.value = ''
  isAddOpen.value = true
}

const handleAddSubmit = async () => {
  if (!newName.value.trim() || newHargaAsli.value === '') {
    addToast({ type: 'warning', message: 'Semua kolom harus diisi' })
    return
  }

  isCreating.value = true
  const supabase = useSupabase()
  try {
    const { error } = await supabase
      .from('master_products')
      .insert({
        umkm_id: umkmId,
        nama_produk: newName.value.trim(),
        harga_asli: Number(newHargaAsli.value),
        is_active: true
      })
    
    if (error) throw error
    isAddOpen.value = false
    addToast({ type: 'success', message: 'Produk master berhasil dibuat' })
    await fetchMasterProducts()
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('unique') || msg.includes('duplicate')) {
      addToast({ type: 'danger', message: 'Gagal: Produk dengan nama tersebut sudah terdaftar untuk mitra ini' })
    } else {
      addToast({ type: 'danger', message: 'Gagal membuat produk master' })
    }
  } finally {
    isCreating.value = false
  }
}

const openEditModal = (product: MasterProduct) => {
  editingProduct.value = product
  editName.value = product.nama_produk
  editHargaAsli.value = product.harga_asli
  editIsActive.value = product.is_active
  isEditOpen.value = true
}

const handleEditSubmit = async () => {
  if (!editingProduct.value || !editName.value.trim() || editHargaAsli.value === '') {
    addToast({ type: 'warning', message: 'Semua kolom harus diisi' })
    return
  }

  isUpdating.value = true
  const supabase = useSupabase()
  try {
    const { error } = await supabase
      .from('master_products')
      .update({
        nama_produk: editName.value.trim(),
        harga_asli: Number(editHargaAsli.value),
        is_active: editIsActive.value
      })
      .eq('id', editingProduct.value.id)

    if (error) throw error
    isEditOpen.value = false
    addToast({ type: 'success', message: 'Produk master berhasil diperbarui' })
    await fetchMasterProducts()
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('unique') || msg.includes('duplicate')) {
      addToast({ type: 'danger', message: 'Gagal: Produk dengan nama tersebut sudah terdaftar' })
    } else {
      addToast({ type: 'danger', message: 'Gagal memperbarui produk master' })
    }
  } finally {
    isUpdating.value = false
  }
}

const handleDeleteProduct = async (productId: string) => {
  if (!confirm('Apakah Anda yakin ingin menghapus produk master ini?')) return
  
  const supabase = useSupabase()
  try {
    const { error } = await supabase
      .from('master_products')
      .delete()
      .eq('id', productId)

    if (error) throw error
    addToast({ type: 'success', message: 'Produk master berhasil dihapus' })
    await fetchMasterProducts()
  } catch (e: any) {
    const msg = e?.message || ''
    if (msg.includes('foreign key') || msg.includes('violates foreign key')) {
      addToast({ 
        type: 'danger', 
        message: 'Tidak dapat menghapus produk ini karena sudah terdaftar di suatu sesi penjualan. Silakan edit lalu ubah statusnya menjadi Nonaktif.'
      })
    } else {
      addToast({ type: 'danger', message: 'Gagal menghapus produk master' })
    }
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <!-- Header Page -->
    <div class="flex items-center justify-between bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/umkm" class="hover:bg-slate-100 p-2 rounded-xl transition flex items-center justify-center border border-transparent hover:border-slate-200">
          <Icon name="heroicons:arrow-left" class="w-5 h-5 text-slate-500" />
        </NuxtLink>
        <div>
          <h2 class="text-sm font-bold text-slate-800">Katalog Produk Master</h2>
          <p class="text-xs text-slate-500 mt-0.5">{{ umkm?.nama_umkm || 'Memuat...' }}</p>
        </div>
      </div>
    </div>

    <!-- Tab Switcher -->
    <div class="flex border-b border-slate-155 text-xs gap-2 px-1">
      <button
        @click="activeTab = 'catalog'"
        :class="['px-4 py-2 border-b-2 font-bold transition duration-200', activeTab === 'catalog' ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-400 hover:text-slate-700']"
      >
        Katalog Master
      </button>
      <button
        @click="activeTab = 'performance'"
        :class="['px-4 py-2 border-b-2 font-bold transition duration-200', activeTab === 'performance' ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-400 hover:text-slate-700']"
      >
        Statistik Performa
      </button>
    </div>

    <!-- Tab Content: Catalog -->
    <template v-if="activeTab === 'catalog'">
      <!-- Actions bar -->
      <div class="bg-white border border-slate-150 p-4 rounded-2xl shadow-sm flex items-center justify-between">
        <div>
          <h2 class="text-sm font-bold text-slate-750">Daftar Produk Master</h2>
          <p class="text-xs text-slate-450 mt-0.5">{{ masterProducts.length }} produk terdaftar</p>
        </div>
        <AppButton @click="openAddModal" variant="primary" size="sm" class="font-bold text-xs !rounded-xl">
          Tambah Produk
        </AppButton>
      </div>

      <!-- Product list -->
      <div v-if="isLoading" class="text-center py-12 text-slate-400 text-sm font-medium">
        Memuat produk master...
      </div>

      <div v-else-if="masterProducts.length === 0" class="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-450 text-sm">
        Belum ada produk terdaftar untuk mitra ini. Klik tombol di atas untuk menambah produk.
      </div>

      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <div
          v-for="p in masterProducts"
          :key="p.id"
          class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 group"
        >
          <div class="flex flex-col gap-2">
            <!-- Product Name & Status -->
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
                {{ p.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>

            <!-- Cost Info -->
            <div class="flex items-center gap-2 mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
              <Icon name="heroicons:tag" class="w-4 h-4 text-slate-455" />
              <div class="flex flex-col">
                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Harga Default UMKM</span>
                <span class="text-xs font-mono font-bold text-slate-800 tabular-nums">{{ useCurrencyFormat(p.harga_asli) }}</span>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="border-t border-slate-100 pt-3 flex items-center justify-end gap-2">
            <button
              @click="openEditModal(p)"
              class="p-2 text-slate-400 hover:text-brand-900 hover:bg-slate-100 border border-slate-150 bg-slate-50 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
              title="Edit Produk"
            >
              <Icon name="heroicons:pencil-square" class="w-4.5 h-4.5" />
            </button>
            
            <button
              @click="handleDeleteProduct(p.id)"
              class="p-2 text-slate-400 hover:text-danger hover:bg-red-50 border border-slate-150 bg-slate-50 rounded-xl transition min-h-[36px] min-w-[36px] flex items-center justify-center shrink-0"
              title="Hapus Produk"
            >
              <Icon name="heroicons:trash" class="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- Tab Content: Performance -->
    <template v-else-if="activeTab === 'performance'">
      <div v-if="isPerformanceLoading" class="text-center py-12 text-slate-400 text-sm font-medium">
        Memuat data statistik performa...
      </div>

      <template v-else>
        <!-- Quick Stats Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div class="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon name="heroicons:shopping-bag" class="w-5 h-5" />
            </div>
            <div>
              <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Total Terjual (All-Time)</span>
              <h3 class="text-lg font-black text-slate-800 mt-0.5 font-mono">{{ totalSoldAllTime }} <span class="text-xs text-slate-400 font-sans font-medium">pcs</span></h3>
            </div>
          </div>
          <div class="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex items-center gap-4">
            <div class="h-10 w-10 rounded-xl bg-brand-50 text-brand-900 flex items-center justify-center">
              <Icon name="heroicons:banknotes" class="w-5 h-5" />
            </div>
            <div>
              <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Total Setoran Bersih</span>
              <h3 class="text-lg font-black text-slate-800 mt-0.5 font-mono text-brand-950">{{ useCurrencyFormat(totalRemittanceAllTime) }}</h3>
            </div>
          </div>
        </div>

        <!-- Product Stats Table -->
        <div class="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Performa Tiap Produk</h3>
            <span class="text-[10px] text-slate-400 font-mono font-bold">{{ performanceProducts.length }} Produk</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-150 text-slate-450 text-[9px] font-extrabold uppercase tracking-wider">
                  <th class="p-3">Nama Produk</th>
                  <th class="p-3 text-right">Harga Setor (Net)</th>
                  <th class="p-3 text-center">Total Terjual</th>
                  <th class="p-3 text-right text-brand-900">Total Setoran</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                <tr v-for="p in performanceProducts" :key="p.master_product_id" class="hover:bg-slate-50/50">
                  <td class="p-3 text-slate-900 font-bold">{{ p.nama_produk }}</td>
                  <td class="p-3 text-right font-mono text-slate-550">{{ useCurrencyFormat(p.harga_asli) }}</td>
                  <td class="p-3 text-center font-mono font-bold text-slate-800">{{ p.total_terjual }} pcs</td>
                  <td class="p-3 text-right font-mono font-bold text-brand-950 bg-brand-50/5">{{ useCurrencyFormat(p.total_setoran) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Sessional History Table -->
        <div class="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Riwayat Keikutsertaan Sesi</h3>
            <span class="text-[10px] text-slate-400 font-mono font-bold">{{ performanceSessions.length }} Sesi</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-150 text-slate-450 text-[9px] font-extrabold uppercase tracking-wider">
                  <th class="p-3">Tanggal Sesi</th>
                  <th class="p-3 text-center">Status</th>
                  <th class="p-3 text-center">Jumlah Terjual</th>
                  <th class="p-3 text-right text-brand-900">Setoran Sesi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                <tr v-for="s in performanceSessions" :key="s.session_id" class="hover:bg-slate-50/50">
                  <td class="p-3 text-slate-900 font-bold font-mono">
                    {{ new Date(s.session_date.replace(/-/g, '/')).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
                  </td>
                  <td class="p-3 text-center">
                    <span :class="['px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border', s.status === 'closed' ? 'bg-slate-100 text-slate-550 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100']">
                      {{ s.status === 'closed' ? 'Selesai' : 'Aktif' }}
                    </span>
                  </td>
                  <td class="p-3 text-center font-mono text-slate-800 font-bold">{{ s.total_terjual }} pcs</td>
                  <td class="p-3 text-right font-mono font-bold text-brand-950 bg-brand-50/5">{{ useCurrencyFormat(s.total_setoran) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>
    </template>

    <!-- Add Modal -->
    <AppModal v-model="isAddOpen" title="Tambah Produk Master">
      <form @submit.prevent="handleAddSubmit" class="flex flex-col gap-4 py-2">
        <AppInput v-model="newName" label="Nama Produk" placeholder="Contoh: Kue Nastar Keju" required />
        <AppInput v-model="newHargaAsli" label="Harga Dasar UMKM (Rp)" type="number" placeholder="Contoh: 25000" input-mode="numeric" required />
      </form>
      <template #footer>
        <AppButton variant="secondary" @click="isAddOpen = false">Batal</AppButton>
        <AppButton :loading="isCreating" @click="handleAddSubmit">Simpan</AppButton>
      </template>
    </AppModal>

    <!-- Edit Modal -->
    <AppModal v-model="isEditOpen" title="Edit Produk Master">
      <form @submit.prevent="handleEditSubmit" class="flex flex-col gap-4 py-2">
        <AppInput v-model="editName" label="Nama Produk" placeholder="Contoh: Kue Nastar Keju" required />
        <AppInput v-model="editHargaAsli" label="Harga Dasar UMKM (Rp)" type="number" placeholder="Contoh: 25000" input-mode="numeric" required />

        <!-- Toggle Active Status -->
        <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-150">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-slate-800">Status Produk</span>
            <span class="text-[10px] text-slate-400 font-semibold mt-0.5">Nonaktifkan untuk menyembunyikan produk saat setup sesi baru</span>
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
