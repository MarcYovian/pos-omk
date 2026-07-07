<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSupabase } from '~/composables/useSupabase'
import { useCurrencyFormat } from '~/composables/useCurrencyFormat'

const route = useRoute()
const supabase = useSupabase()

const umkmId = route.params.umkm_id as string

const umkmName = ref('')
const isLoading = ref(true)
const products = ref<any[]>([])
const sessions = ref<any[]>([])
const sessionDetails = ref<Record<string, any[]>>({})
const expandedSessions = ref<Record<string, boolean>>({})

const toggleSession = (sessionId: string) => {
  expandedSessions.value[sessionId] = !expandedSessions.value[sessionId]
}

const totalSoldAllTime = computed(() => products.value.reduce((acc, p) => acc + Number(p.total_terjual), 0))
const totalRemittanceAllTime = computed(() => products.value.reduce((acc, p) => acc + Number(p.total_setoran), 0))

const searchQuery = ref('')
const filteredProducts = computed(() => {
  if (!searchQuery.value.trim()) return products.value
  const query = searchQuery.value.toLowerCase().trim()
  return products.value.filter(p => p.nama_produk.toLowerCase().includes(query))
})

const loadData = async () => {
  isLoading.value = true
  try {
    const { data: umkmData, error: umkmErr } = await supabase
      .from('umkm')
      .select('nama_umkm')
      .eq('id', umkmId)
      .single()
    
    if (umkmErr) throw umkmErr
    umkmName.value = umkmData.nama_umkm

    const { data: prodData, error: prodErr } = await (supabase as any)
      .rpc('get_umkm_product_performance', { p_umkm_id: umkmId })
    
    if (prodErr) throw prodErr
    products.value = (prodData as any) || []

    const { data: sessData, error: sessErr } = await (supabase as any)
      .rpc('get_umkm_session_history', { p_umkm_id: umkmId })
    
    if (sessErr) throw sessErr
    sessions.value = (sessData as any) || []

    const { data: detailData, error: detailErr } = await supabase
      .from('session_products')
      .select(`
        id,
        session_id,
        stok_awal,
        stok_sekarang,
        harga_asli,
        master_product:master_products!inner(
          nama_produk,
          umkm_id
        ),
        reconciliation(
          stok_fisik
        )
      `)
      .eq('master_products.umkm_id', umkmId)

    if (detailErr) throw detailErr

    const groupedDetails: Record<string, any[]> = {}
    for (const item of (detailData || [])) {
      const sessId = item.session_id
      if (!groupedDetails[sessId]) {
        groupedDetails[sessId] = []
      }

      let phys = item.stok_sekarang
      if (item.reconciliation) {
        if (Array.isArray(item.reconciliation) && item.reconciliation.length > 0) {
          phys = item.reconciliation[0].stok_fisik
        } else if (!Array.isArray(item.reconciliation)) {
          phys = (item.reconciliation as any).stok_fisik
        }
      }

      const sold = item.stok_awal - phys

      groupedDetails[sessId].push({
        nama_produk: item.master_product.nama_produk,
        stok_awal: item.stok_awal,
        stok_sekarang: item.stok_sekarang,
        stok_fisik: phys,
        sold,
        harga_asli: item.harga_asli,
        total_setoran: sold * item.harga_asli
      })
    }
    sessionDetails.value = groupedDetails
  } catch (e: any) {
    console.error('Gagal memuat data performa:', e)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 py-4 px-3 sm:py-8 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto flex flex-col gap-4 sm:gap-6">
      
      <!-- Top Branding Header - Mobile stacked, desktop row -->
      <div class="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-brand-900 flex items-center justify-center text-white font-black text-lg">
              O
            </div>
            <div>
              <h1 class="text-base font-extrabold text-slate-800 leading-tight">POS OMK</h1>
              <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Laporan Mitra UMKM</p>
            </div>
          </div>
          <div class="flex flex-col sm:items-end gap-1">
            <h2 class="text-base sm:text-sm font-extrabold text-brand-950">{{ umkmName || 'Memuat...' }}</h2>
            <div>
              <span class="text-[9px] font-black px-2.5 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-200 uppercase tracking-wider inline-block">Mitra Aktif</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="text-center py-16 sm:py-12 text-slate-400 font-semibold">
        Memuat data performa penjualan...
      </div>

      <template v-else>
        <!-- Stat Cards - Mobile stacked, desktop 2-col -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div class="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition duration-200">
            <div class="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Icon name="heroicons:shopping-bag" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <span class="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">Total Terjual</span>
              <h3 class="text-lg font-black text-slate-800 mt-0.5 font-mono tabular-nums">{{ totalSoldAllTime }} <span class="text-xs text-slate-400 font-medium">pcs</span></h3>
            </div>
          </div>
          <div class="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm flex items-center gap-4 hover:shadow-md transition duration-200">
            <div class="h-10 w-10 rounded-xl bg-brand-50 text-brand-900 flex items-center justify-center shrink-0 border border-brand-100">
              <Icon name="heroicons:banknotes" class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <span class="text-[10px] text-slate-450 font-extrabold uppercase tracking-wider">Total Setoran</span>
              <h3 class="text-lg font-black text-brand-950 mt-0.5 font-mono tabular-nums">{{ useCurrencyFormat(totalRemittanceAllTime) }}</h3>
            </div>
          </div>
        </div>

        <!-- Product Performance - Card list on mobile, table on desktop -->
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Performa Produk</h3>
            <span class="text-[10px] text-slate-400 font-mono font-bold">{{ filteredProducts.length }} Produk</span>
          </div>

          <!-- Search input for filterability -->
          <div class="px-4 py-2.5 border-b border-slate-100 bg-white">
            <div class="relative">
              <span class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
                <Icon name="heroicons:magnifying-glass" class="w-4 h-4" />
              </span>
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari produk..."
                class="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-900 focus:border-brand-900 transition-colors"
              />
            </div>
          </div>
          
          <!-- Mobile: Card List -->
          <div class="block sm:hidden divide-y divide-slate-100">
            <div v-for="p in filteredProducts" :key="p.master_product_id" class="p-4 hover:bg-slate-50 transition">
              <div class="flex justify-between items-start mb-1.5">
                <span class="text-sm font-bold text-slate-900">{{ p.nama_produk }}</span>
                <span class="text-sm font-black text-brand-900 tabular-nums">{{ useCurrencyFormat(p.total_setoran) }}</span>
              </div>
              <div class="flex justify-between text-xs text-slate-550">
                <span>Setor: {{ useCurrencyFormat(p.harga_asli) }}</span>
                <span class="font-bold text-slate-700 tabular-nums">{{ p.total_terjual }} pcs</span>
              </div>
            </div>
            <div v-if="filteredProducts.length === 0" class="p-8 text-center text-xs text-slate-400 font-medium">
              Tidak ada produk yang cocok dengan pencarian
            </div>
          </div>

          <!-- Desktop: Table -->
          <div class="hidden sm:block overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[9px] font-extrabold uppercase tracking-wider">
                  <th class="p-4">Nama Produk</th>
                  <th class="p-4 text-right">Harga Setor</th>
                  <th class="p-4 text-center">Terjual</th>
                  <th class="p-4 text-right text-brand-900">Komisi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                <tr v-for="p in filteredProducts" :key="p.master_product_id" class="hover:bg-slate-50/20">
                  <td class="p-4 text-slate-900 font-bold">{{ p.nama_produk }}</td>
                  <td class="p-4 text-right font-mono text-slate-500 tabular-nums">{{ useCurrencyFormat(p.harga_asli) }}</td>
                  <td class="p-4 text-center font-mono font-bold text-slate-800 tabular-nums">{{ p.total_terjual }} pcs</td>
                  <td class="p-4 text-right font-mono font-bold text-brand-950 bg-brand-50/5 tabular-nums">{{ useCurrencyFormat(p.total_setoran) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Session History - Card list on mobile, table on desktop -->
        <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-4 py-3 sm:px-5 sm:py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Riwayat Sesi</h3>
            <span class="text-[10px] text-slate-400 font-mono font-bold">{{ sessions.length }} Sesi</span>
          </div>
          
          <!-- Mobile: Card List -->
          <div class="block sm:hidden divide-y divide-slate-100">
            <div 
              v-for="s in sessions" 
              :key="s.session_id" 
              @click="toggleSession(s.session_id)"
              class="p-4 hover:bg-slate-50 transition cursor-pointer"
            >
              <div class="flex justify-between items-start mb-2">
                <span class="text-sm font-bold text-slate-900 font-mono flex items-center gap-1.5">
                  {{ new Date(s.session_date.replace(/-/g, '/')).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}
                  <Icon 
                    :name="expandedSessions[s.session_id] ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" 
                    class="w-3.5 h-3.5 text-slate-400"
                  />
                </span>
                <span :class="['px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border', s.status === 'closed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100']">
                  {{ s.status === 'closed' ? 'Selesai' : 'Aktif' }}
                </span>
              </div>
              <div class="flex justify-between text-xs text-slate-550 mb-1">
                <span>Terjual</span>
                <span class="font-bold text-slate-700 tabular-nums">{{ s.total_terjual }} pcs</span>
              </div>
              <div class="flex justify-between text-xs">
                <span>Setoran Sesi</span>
                <span class="font-black text-brand-900 tabular-nums">{{ useCurrencyFormat(s.total_setoran) }}</span>
              </div>

              <!-- Product breakdown for this session on mobile -->
              <div v-if="expandedSessions[s.session_id]" class="mt-3 pt-3 border-t border-slate-150/80 bg-slate-50/50 p-2.5 rounded-xl flex flex-col gap-2" @click.stop>
                <div class="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Detail Produk Sesi Ini</div>
                <div v-for="det in sessionDetails[s.session_id]" :key="det.nama_produk" class="flex justify-between items-center text-xs border-b border-slate-100/50 pb-1.5 last:border-0 last:pb-0">
                  <span class="font-bold text-slate-750">{{ det.nama_produk }}</span>
                  <div class="text-right">
                    <span class="font-mono text-slate-600 font-bold tabular-nums">{{ det.sold }} pcs</span>
                    <span class="text-slate-350 mx-1">/</span>
                    <span class="font-mono text-brand-900 font-extrabold tabular-nums">{{ useCurrencyFormat(det.total_setoran) }}</span>
                  </div>
                </div>
                <div v-if="!sessionDetails[s.session_id] || sessionDetails[s.session_id].length === 0" class="text-center text-[10px] text-slate-400 py-1">
                  Tidak ada rincian produk
                </div>
              </div>
            </div>
            <div v-if="sessions.length === 0" class="p-8 text-center text-xs text-slate-400 font-medium">
              Belum ada riwayat sesi keikutsertaan
            </div>
          </div>

          <!-- Desktop: Table -->
          <div class="hidden sm:block overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[9px] font-extrabold uppercase tracking-wider">
                  <th class="p-4">Tanggal Sesi</th>
                  <th class="p-4 text-center">Status</th>
                  <th class="p-4 text-center">Terjual</th>
                  <th class="p-4 text-right text-brand-900">Setoran</th>
                  <th class="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                <template v-for="s in sessions" :key="s.session_id">
                  <tr 
                    @click="toggleSession(s.session_id)" 
                    class="hover:bg-slate-50/20 cursor-pointer select-none transition-colors"
                  >
                    <td class="p-4 text-slate-900 font-bold font-mono">
                      {{ new Date(s.session_date.replace(/-/g, '/')).toLocaleDateString('id-ID', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) }}
                    </td>
                    <td class="p-4 text-center">
                      <span :class="['px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border', s.status === 'closed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100']">
                        {{ s.status === 'closed' ? 'Selesai' : 'Aktif' }}
                      </span>
                    </td>
                    <td class="p-4 text-center font-mono text-slate-800 font-bold tabular-nums">{{ s.total_terjual }} pcs</td>
                    <td class="p-4 text-right font-mono font-bold text-brand-950 bg-brand-50/5 tabular-nums">{{ useCurrencyFormat(s.total_setoran) }}</td>
                    <td class="p-4 text-center text-slate-400">
                      <Icon 
                        :name="expandedSessions[s.session_id] ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" 
                        class="w-4 h-4"
                      />
                    </td>
                  </tr>
                  <!-- Expanded product detail sub-table -->
                  <tr v-if="expandedSessions[s.session_id]">
                    <td colspan="5" class="bg-slate-50/30 p-0 border-t border-b border-slate-100">
                      <div class="px-8 py-4 bg-slate-50/50">
                        <div class="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-2.5">Rincian Per Produk Sesi Ini</div>
                        <table class="w-full text-left text-xs font-medium text-slate-650">
                          <thead>
                            <tr class="text-[9px] text-slate-400 font-extrabold uppercase border-b border-slate-200">
                              <th class="pb-2">Nama Produk</th>
                              <th class="pb-2 text-center">Stok Awal</th>
                              <th class="pb-2 text-center">Retur (Sisa)</th>
                              <th class="pb-2 text-center">Terjual</th>
                              <th class="pb-2 text-right text-brand-900">Setoran</th>
                            </tr>
                          </thead>
                          <tbody class="divide-y divide-slate-100">
                            <tr v-for="det in sessionDetails[s.session_id]" :key="det.nama_produk">
                              <td class="py-2 text-slate-900 font-bold">{{ det.nama_produk }}</td>
                              <td class="py-2 text-center font-mono tabular-nums text-slate-500">{{ det.stok_awal }}</td>
                              <td class="py-2 text-center font-mono tabular-nums text-slate-500">{{ det.stok_fisik }}</td>
                              <td class="py-2 text-center font-mono font-bold tabular-nums text-slate-800">{{ det.sold }} pcs</td>
                              <td class="py-2 text-right font-mono font-bold tabular-nums text-brand-950">{{ useCurrencyFormat(det.total_setoran) }}</td>
                            </tr>
                            <tr v-if="!sessionDetails[s.session_id] || sessionDetails[s.session_id].length === 0">
                              <td colspan="5" class="py-3 text-center text-slate-400">Tidak ada produk terdaftar pada sesi ini</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

      </template>

      <!-- Footer Branding -->
      <div class="text-center py-4">
        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Disponsori & Dikelola oleh OMK</p>
      </div>

    </div>
  </div>
</template>