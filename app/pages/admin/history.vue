<!-- pages/admin/history.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSupabase } from '~/composables/useSupabase'
import { useCurrencyFormat } from '~/composables/useCurrencyFormat'
import AppButton from '~/components/ui/AppButton.vue'
import AppToast from '~/components/ui/AppToast.vue'
import AppModal from '~/components/ui/AppModal.vue'
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const supabase = useSupabase()
const { addToast } = useToast()

const historyData = ref<any[]>([])
const isLoading = ref(false)

// Session Product Details modal states
const selectedSessionProducts = ref<any[]>([])
const isDetailLoading = ref(false)
const isDetailOpen = ref(false)
const selectedSessionDate = ref('')

const fetchSessionProductDetails = async (sessionDate: string) => {
  selectedSessionDate.value = sessionDate
  isDetailOpen.value = true
  isDetailLoading.value = true
  try {
    const { data, error } = await supabase
      .from('session_products')
      .select(`
        id,
        stok_awal,
        stok_sekarang,
        harga_asli,
        harga_jual,
        session:sessions!inner(session_date),
        master_product:master_products!inner(
          nama_produk,
          umkm!inner(nama_umkm)
        )
      `)
      .eq('session.session_date', sessionDate) as any

    if (error) throw error
    
    const mapped = (data || []).map((item: any) => ({
      id: item.id,
      nama_produk: item.master_product?.nama_produk || '',
      stok_awal: item.stok_awal,
      stok_sekarang: item.stok_sekarang,
      harga_asli: item.harga_asli,
      harga_jual: item.harga_jual,
      umkm: item.master_product?.umkm
    }))

    // Sort by product name client-side
    mapped.sort((a: any, b: any) => a.nama_produk.localeCompare(b.nama_produk))
    selectedSessionProducts.value = mapped
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal memuat detail produk sesi'
    })
  } finally {
    isDetailLoading.value = false
  }
}

// Filters
const startDate = ref('')
const endDate = ref('')
const searchQuery = ref('')

const fetchHistory = async () => {
  isLoading.value = true
  try {
    let query = supabase
      .from('session_history_summary' as any)
      .select('*')
      .order('session_date', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    historyData.value = data || []
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal memuat riwayat sesi'
    })
  } finally {
    isLoading.value = false
  }
}

const filteredHistory = computed(() => {
  return historyData.value.filter(item => {
    // Search query filter
    const query = searchQuery.value.toLowerCase().trim()
    const matchesSearch = !query || 
      item.session_date.includes(query) ||
      (item.status || '').toLowerCase().includes(query)

    // Date range filter
    let matchesDate = true
    if (startDate.value) {
      matchesDate = matchesDate && (item.session_date >= startDate.value)
    }
    if (endDate.value) {
      matchesDate = matchesDate && (item.session_date <= endDate.value)
    }

    return matchesSearch && matchesDate
  })
})

// Summaries of filtered list
const totalGross = computed(() => filteredHistory.value.reduce((acc, item) => acc + (item.gross_revenue || 0), 0))
const totalRemittance = computed(() => filteredHistory.value.reduce((acc, item) => acc + (item.total_remittance || 0), 0))
const totalNetProfit = computed(() => filteredHistory.value.reduce((acc, item) => acc + (item.omk_net_profit || 0), 0))
const totalTx = computed(() => filteredHistory.value.reduce((acc, item) => acc + (item.transaction_count || 0), 0))

onMounted(() => {
  fetchHistory()
})

const handlePrint = () => {
  window.print()
}
</script>

<template>
  <div class="w-full flex flex-col gap-6 print-container">
    <!-- Header Area (hidden in print except a specific title) -->
    <div class="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
      <div>
        <h2 class="text-sm font-bold text-slate-800">Riwayat Penjualan Sesi</h2>
        <p class="text-xs text-slate-500 mt-0.5">Daftar lengkap transaksi dan finansial sesi-sesi sebelumnya yang telah ditutup</p>
      </div>
      <div class="flex items-center gap-2">
        <AppButton @click="fetchHistory" variant="secondary" size="sm" class="font-bold text-xs">
          <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-1" />
          Refresh
        </AppButton>
        <AppButton @click="handlePrint" variant="primary" size="sm" class="font-bold text-xs">
          <Icon name="heroicons:printer" class="w-4 h-4 mr-1" />
          Cetak Laporan
        </AppButton>
      </div>
    </div>

    <!-- Filter Bar (hidden in print) -->
    <div class="no-print bg-white border border-slate-150 p-4 rounded-2xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Tanggal Mulai</label>
        <input
          v-model="startDate"
          type="date"
          class="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50/50"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Tanggal Selesai</label>
        <input
          v-model="endDate"
          type="date"
          class="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50/50"
        />
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Cari Sesi</label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari tanggal atau status..."
          class="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-slate-50/50"
        />
      </div>
    </div>

    <!-- Print-only Title Header -->
    <div class="print-only hidden print:block text-center border-b pb-4 mb-4">
      <h1 class="text-xl font-bold text-slate-900">LAPORAN RIWAYAT FINANSIAL SESI</h1>
      <p class="text-xs text-slate-500 mt-1">OMK POS - Panel Pengelola</p>
      <div class="text-[10px] text-slate-400 mt-2 font-mono" v-if="startDate || endDate">
        Filter: {{ startDate || 'Awal' }} s/d {{ endDate || 'Kini' }}
      </div>
    </div>

    <!-- Filtered Aggregated Summary Banner -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between h-20">
        <span class="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">Total Omset</span>
        <span class="font-mono text-sm sm:text-md lg:text-lg font-black text-slate-800 block">
          {{ useCurrencyFormat(totalGross) }}
        </span>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between h-20">
        <span class="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">Total Setoran</span>
        <span class="font-mono text-sm sm:text-md lg:text-lg font-black text-brand-900 block">
          {{ useCurrencyFormat(totalRemittance) }}
        </span>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between h-20">
        <span class="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">Laba Bersih OMK</span>
        <span class="font-mono text-sm sm:text-md lg:text-lg font-black text-success block">
          {{ useCurrencyFormat(totalNetProfit) }}
        </span>
      </div>
      <div class="bg-white p-4 rounded-xl border border-slate-150 shadow-sm flex flex-col justify-between h-20">
        <span class="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">Total Transaksi</span>
        <span class="font-mono text-sm sm:text-md lg:text-lg font-black text-slate-700 block">
          {{ totalTx }}
        </span>
      </div>
    </div>

    <!-- Main Data Table -->
    <div class="bg-transparent sm:bg-white sm:border sm:border-slate-150 sm:rounded-2xl sm:shadow-sm overflow-hidden">
      <div v-if="isLoading" class="text-center py-12 text-slate-450 bg-white rounded-2xl border border-slate-150 shadow-sm">
        Memuat riwayat sesi...
      </div>
      
      <div v-else-if="filteredHistory.length === 0" class="text-center py-12 text-slate-450 bg-white rounded-2xl border border-slate-150 shadow-sm">
        Tidak ada riwayat sesi yang ditemukan.
      </div>

      <template v-else>
        <!-- Desktop Table View -->
        <div class="hidden sm:block overflow-x-auto w-full">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-150 text-slate-450 text-[10px] font-extrabold uppercase tracking-wider">
                <th class="p-4">Tanggal Sesi</th>
                <th class="p-4">Status</th>
                <th class="p-4 text-right">Omset Kotor</th>
                <th class="p-4 text-right">Setoran Mitra</th>
                <th class="p-4 text-right">Laba OMK</th>
                <th class="p-4 text-center">Transaksi</th>
                <th class="p-4 no-print text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs">
              <tr v-for="item in filteredHistory" :key="item.session_id" class="hover:bg-slate-50/50">
                <td class="p-4 font-mono font-bold text-slate-700">
                  {{ item.session_date }}
                </td>
                <td class="p-4">
                  <span v-if="item.status === 'closed'" class="inline-flex items-center text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100 uppercase">
                    Tutup
                  </span>
                  <span v-else class="inline-flex items-center text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                    Aktif
                  </span>
                </td>
                <td class="p-4 text-right font-mono font-semibold text-slate-800">
                  {{ useCurrencyFormat(item.gross_revenue) }}
                </td>
                <td class="p-4 text-right font-mono font-semibold text-brand-900">
                  {{ useCurrencyFormat(item.total_remittance) }}
                </td>
                <td class="p-4 text-right font-mono font-bold text-success">
                  {{ useCurrencyFormat(item.omk_net_profit) }}
                </td>
                <td class="p-4 text-center font-mono font-bold text-slate-600">
                  {{ item.transaction_count }}
                </td>
                <td class="p-4 text-center no-print">
                  <div class="flex items-center justify-center gap-3">
                    <button @click="fetchSessionProductDetails(item.session_date)" class="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 transition">
                      <Icon name="heroicons:eye" class="w-4 h-4" />
                      Detail
                    </button>
                    <NuxtLink :to="`/admin/reports`" class="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-900 font-bold">
                      <Icon name="heroicons:chat-bubble-bottom-center-text" class="w-4 h-4" />
                      WA
                    </NuxtLink>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Mobile Card List View -->
        <div class="sm:hidden flex flex-col gap-3">
          <div v-for="item in filteredHistory" :key="item.session_id" class="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
              <span class="font-mono font-black text-slate-850 text-xs">{{ item.session_date }}</span>
              <span v-if="item.status === 'closed'" class="inline-flex items-center text-[8px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100 uppercase">
                Tutup
              </span>
              <span v-else class="inline-flex items-center text-[8px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                Aktif
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Omset Kotor</span>
                <span class="font-mono font-semibold text-slate-850">{{ useCurrencyFormat(item.gross_revenue) }}</span>
              </div>
              <div>
                <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Setoran Mitra</span>
                <span class="font-mono font-semibold text-brand-900">{{ useCurrencyFormat(item.total_remittance) }}</span>
              </div>
              <div class="col-span-2 border-t border-slate-50 pt-2 flex justify-between items-center">
                <div>
                  <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Laba Bersih OMK</span>
                  <span class="font-mono font-bold text-success">{{ useCurrencyFormat(item.omk_net_profit) }}</span>
                </div>
                <div class="text-right">
                  <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Transaksi</span>
                  <span class="font-mono font-bold text-slate-600">{{ item.transaction_count }}</span>
                </div>
              </div>
            </div>
            <div class="border-t border-slate-100 pt-2 flex justify-between items-center no-print">
              <button @click="fetchSessionProductDetails(item.session_date)" class="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 transition">
                <Icon name="heroicons:eye" class="w-4.5 h-4.5" />
                Detail Produk
              </button>
              <NuxtLink :to="`/admin/reports`" class="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-900 font-bold">
                <Icon name="heroicons:chat-bubble-bottom-center-text" class="w-4.5 h-4.5" />
                Kirim Laporan WA
              </NuxtLink>
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Modal: Detail Produk Sesi -->
    <AppModal
      v-model="isDetailOpen"
      :title="`Rincian Produk Sesi - ${selectedSessionDate}`"
      size="xl"
    >
      <div v-if="isDetailLoading" class="text-center py-8 text-slate-450 text-xs">
        Memuat detail produk...
      </div>
      <div v-else-if="selectedSessionProducts.length === 0" class="text-center py-8 text-slate-450 text-xs">
        Tidak ada produk terdaftar untuk sesi ini.
      </div>
      <div v-else class="flex flex-col gap-4">
        <div class="overflow-x-auto border border-slate-150 rounded-xl">
          <table class="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-150 text-slate-450 text-[9px] font-extrabold uppercase tracking-wider">
                <th class="p-3">Nama Produk</th>
                <th class="p-3">Mitra</th>
                <th class="p-3 text-center">Stok Awal</th>
                <th class="p-3 text-center text-emerald-600">Terjual</th>
                <th class="p-3 text-center text-rose-600">Sisa/Retur</th>
                <th class="p-3 text-right">Harga UMKM</th>
                <th class="p-3 text-right">Harga Jual</th>
                <th class="p-3 text-right text-slate-700">Gross</th>
                <th class="p-3 text-right text-brand-900">Setoran</th>
                <th class="p-3 text-right text-success">Laba OMK</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
              <tr v-for="p in selectedSessionProducts" :key="p.id" class="hover:bg-slate-50/50">
                <td class="p-3 text-slate-900 font-bold">{{ p.nama_produk }}</td>
                <td class="p-3 text-slate-500 font-bold">{{ p.umkm?.nama_umkm || '-' }}</td>
                <td class="p-3 text-center font-mono font-bold">{{ p.stok_awal }}</td>
                <td class="p-3 text-center font-mono font-bold text-emerald-600 bg-emerald-50/10">{{ p.stok_awal - p.stok_sekarang }}</td>
                <td class="p-3 text-center font-mono font-bold text-rose-600 bg-rose-50/10">{{ p.stok_sekarang }}</td>
                <td class="p-3 text-right font-mono text-slate-500">{{ useCurrencyFormat(p.harga_asli) }}</td>
                <td class="p-3 text-right font-mono text-slate-800">{{ useCurrencyFormat(p.harga_jual) }}</td>
                <td class="p-3 text-right font-mono font-bold text-slate-800 bg-slate-50/20">
                  {{ useCurrencyFormat((p.stok_awal - p.stok_sekarang) * p.harga_jual) }}
                </td>
                <td class="p-3 text-right font-mono font-bold text-brand-950 bg-brand-50/10">
                  {{ useCurrencyFormat((p.stok_awal - p.stok_sekarang) * p.harga_asli) }}
                </td>
                <td class="p-3 text-right font-mono font-bold text-success bg-emerald-50/5">
                  {{ useCurrencyFormat((p.stok_awal - p.stok_sekarang) * (p.harga_jual - p.harga_asli)) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="isDetailOpen = false">Tutup</AppButton>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>

<style scoped>
@media print {
  .no-print {
    display: none !important;
  }
  
  .print-only {
    display: block !important;
  }

  body {
    background: white !important;
    color: black !important;
  }

  .print-container {
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    box-shadow: none !important;
  }

  table {
    width: 100% !important;
    border: 1px solid #ddd !important;
  }

  th, td {
    border-bottom: 1px solid #ddd !important;
  }
}
</style>
