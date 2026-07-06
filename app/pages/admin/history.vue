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

import { useHistoryStore } from '~/stores/history'
const historyStore = useHistoryStore()
const isLoading = computed(() => historyStore.isLoading)

// Session Product Details modal states
const selectedSessionProducts = ref<any[]>([])
const isDetailLoading = ref(false)
const isDetailOpen = ref(false)
const selectedSessionDate = ref('')
const selectedSessionId = ref('')

// Session Transaction details tab states
const selectedSessionTransactions = ref<any[]>([])
const isTxLoading = ref(false)
const expandedTxId = ref<string | null>(null)
const expandedTxDetails = ref<Record<string, any[]>>({})
const activeTab = ref<'products' | 'transactions'>('products')

const fetchSessionProductDetails = async (sessionDate: string) => {
  if (historyStore.productsCache[sessionDate]) {
    selectedSessionProducts.value = historyStore.productsCache[sessionDate]
    return
  }

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
    historyStore.productsCache[sessionDate] = mapped
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

const fetchSessionTransactions = async (sessionId: string) => {
  if (historyStore.transactionsCache[sessionId]) {
    selectedSessionTransactions.value = historyStore.transactionsCache[sessionId]
    return
  }

  isTxLoading.value = true
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        created_at,
        total_harga_jual,
        nominal_diterima,
        kembalian,
        metode_pembayaran,
        cashier_id
      `)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false }) as any

    if (error) throw error
    historyStore.transactionsCache[sessionId] = data || []
    selectedSessionTransactions.value = data || []
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal memuat daftar transaksi'
    })
  } finally {
    isTxLoading.value = false
  }
}

const userEmailMap = ref<Record<string, string>>({})

const fetchUsers = async () => {
  try {
    const { data, error } = await supabase.rpc('get_all_users')
    if (error) throw error
    const map: Record<string, string> = {}
    ;(data || []).forEach((u: any) => {
      map[u.id] = u.email
    })
    userEmailMap.value = map
  } catch (e) {
    console.error('Gagal memuat data user:', e)
  }
}

const toggleTxRow = async (txId: string) => {
  if (expandedTxId.value === txId) {
    expandedTxId.value = null
    return
  }
  expandedTxId.value = txId
  
  if (expandedTxDetails.value[txId]) return // already loaded

  try {
    const { data, error } = await supabase
      .from('transaction_details')
      .select(`
        id,
        qty,
        harga_jual_snapshot,
        harga_asli_snapshot,
        subtotal_harga_jual,
        session_product:session_products!inner(
          master_product:master_products!inner(
            nama_produk
          )
        )
      `)
      .eq('transaction_id', txId) as any

    if (error) throw error
    expandedTxDetails.value[txId] = (data || []).map((td: any) => ({
      id: td.id,
      qty: td.qty,
      harga_jual: td.harga_jual_snapshot,
      subtotal: td.subtotal_harga_jual,
      nama_produk: td.session_product?.master_product?.nama_produk || ''
    }))
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal memuat rincian belanjaan'
    })
  }
}

const openSessionDetailModal = async (session: any) => {
  selectedSessionDate.value = session.session_date
  selectedSessionId.value = session.session_id
  isDetailOpen.value = true
  activeTab.value = 'products'
  selectedSessionTransactions.value = []
  expandedTxId.value = null
  expandedTxDetails.value = {}

  // Fetch products first
  await fetchSessionProductDetails(session.session_date)
  // Fetch transactions in background
  fetchSessionTransactions(session.session_id)
}

// Filters
const startDate = ref('')
const endDate = ref('')
const searchQuery = ref('')

const fetchHistory = async (force = false) => {
  try {
    await historyStore.fetchHistory(force)
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal memuat riwayat sesi'
    })
  }
}

const handleRefresh = async () => {
  historyStore.clearCache()
  await fetchHistory(true)
}

const filteredHistory = computed(() => {
  return historyStore.historyList.filter(item => {
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
  fetchUsers()
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
        <AppButton @click="handleRefresh" variant="secondary" size="sm" class="font-bold text-xs">
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
                    <button @click="openSessionDetailModal(item)" class="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 transition">
                      <Icon name="heroicons:eye" class="w-4 h-4" />
                      Detail
                    </button>
                    <NuxtLink :to="`/admin/reports?session_id=${item.session_id}`" class="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-900 font-bold">
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
              <button @click="openSessionDetailModal(item)" class="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 transition">
                <Icon name="heroicons:eye" class="w-4.5 h-4.5" />
                Detail Produk
              </button>
              <NuxtLink :to="`/admin/reports?session_id=${item.session_id}`" class="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-900 font-bold">
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
      :title="`Rincian Sesi - ${selectedSessionDate}`"
      size="xl"
    >
      <div v-if="isDetailLoading" class="text-center py-8 text-slate-450 text-xs">
        Memuat detail produk...
      </div>
      <div v-else-if="selectedSessionProducts.length === 0" class="text-center py-8 text-slate-450 text-xs">
        Tidak ada produk terdaftar untuk sesi ini.
      </div>
      <div v-else class="flex flex-col gap-4">
        <!-- TAB BAR SWITCHER -->
        <div class="flex border-b border-slate-150 text-xs gap-2">
          <button
            @click="activeTab = 'products'"
            :class="['px-4 py-2 border-b-2 font-bold transition duration-200', activeTab === 'products' ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-400 hover:text-slate-700']"
          >
            Rincian Produk
          </button>
          <button
            @click="activeTab = 'transactions'"
            :class="['px-4 py-2 border-b-2 font-bold transition duration-200', activeTab === 'transactions' ? 'border-brand-900 text-brand-900' : 'border-transparent text-slate-400 hover:text-slate-700']"
          >
            Daftar Transaksi ({{ selectedSessionTransactions.length }})
          </button>
        </div>

        <!-- TAB: PRODUCTS -->
        <template v-if="activeTab === 'products'">
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
        </template>

        <!-- TAB: TRANSACTIONS -->
        <template v-else>
          <div v-if="isTxLoading" class="text-center py-8 text-slate-450 text-xs">
            Memuat daftar transaksi...
          </div>
          <div v-else-if="selectedSessionTransactions.length === 0" class="text-center py-8 text-slate-450 text-xs">
            Tidak ada transaksi tercatat untuk sesi ini.
          </div>
          <div v-else class="overflow-x-auto border border-slate-150 rounded-xl">
            <table class="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr class="bg-slate-50 border-b border-slate-150 text-slate-450 text-[9px] font-extrabold uppercase tracking-wider">
                  <th class="p-3 w-10 text-center">Detail</th>
                  <th class="p-3">Waktu</th>
                  <th class="p-3">Kasir</th>
                  <th class="p-3 text-center">Metode</th>
                  <th class="p-3 text-right">Total Belanja</th>
                  <th class="p-3 text-right">Tunai/Diterima</th>
                  <th class="p-3 text-right">Kembalian</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                <template v-for="t in selectedSessionTransactions" :key="t.id">
                  <tr class="hover:bg-slate-50/50 cursor-pointer" @click="toggleTxRow(t.id)">
                    <td class="p-3 text-center">
                      <Icon
                        :name="expandedTxId === t.id ? 'heroicons:chevron-down-solid' : 'heroicons:chevron-right-solid'"
                        class="w-4 h-4 text-slate-400"
                      />
                    </td>
                    <td class="p-3 text-slate-900 font-bold">
                      {{ new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) }}
                    </td>
                    <td class="p-3 text-slate-500 font-bold">{{ userEmailMap[t.cashier_id] || '-' }}</td>
                    <td class="p-3 text-center">
                      <span :class="['px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider', t.metode_pembayaran === 'qris' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-600 border border-amber-100']">
                        {{ t.metode_pembayaran }}
                      </span>
                    </td>
                    <td class="p-3 text-right font-mono font-bold text-slate-800">{{ useCurrencyFormat(t.total_harga_jual) }}</td>
                    <td class="p-3 text-right font-mono text-slate-500">{{ useCurrencyFormat(t.nominal_diterima) }}</td>
                    <td class="p-3 text-right font-mono text-slate-500">{{ useCurrencyFormat(t.kembalian) }}</td>
                  </tr>

                  <!-- Collapsible Nested Item Details -->
                  <tr v-if="expandedTxId === t.id" class="bg-slate-50/20">
                    <td colspan="7" class="p-4">
                      <div v-if="!expandedTxDetails[t.id]" class="text-center py-2 text-slate-400 text-[10px]">
                        Memuat rincian barang...
                      </div>
                      <div v-else class="flex flex-col gap-2 max-w-lg">
                        <h4 class="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Rincian Belanjaan</h4>
                        <div class="border border-slate-150 rounded-lg overflow-hidden bg-white text-[10px]">
                          <table class="w-full text-left border-collapse">
                            <thead>
                              <tr class="bg-slate-50 border-b border-slate-100 text-slate-450 text-[8px] font-bold uppercase">
                                <th class="p-2">Nama Produk</th>
                                <th class="p-2 text-center">Qty</th>
                                <th class="p-2 text-right">Harga Jual</th>
                                <th class="p-2 text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-50">
                              <tr v-for="item in expandedTxDetails[t.id]" :key="item.id">
                                <td class="p-2 text-slate-900 font-bold">{{ item.nama_produk }}</td>
                                <td class="p-2 text-center font-mono font-bold">{{ item.qty }}</td>
                                <td class="p-2 text-right font-mono text-slate-500">{{ useCurrencyFormat(item.harga_jual) }}</td>
                                <td class="p-2 text-right font-mono font-bold text-slate-800">{{ useCurrencyFormat(item.subtotal) }}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </template>
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
