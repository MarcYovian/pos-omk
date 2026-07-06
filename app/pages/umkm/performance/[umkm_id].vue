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

const totalSoldAllTime = computed(() => products.value.reduce((acc, p) => acc + Number(p.total_terjual), 0))
const totalRemittanceAllTime = computed(() => products.value.reduce((acc, p) => acc + Number(p.total_setoran), 0))

const loadData = async () => {
  isLoading.value = true
  try {
    // 1. Fetch UMKM Name
    const { data: umkmData, error: umkmErr } = await supabase
      .from('umkm')
      .select('nama_umkm')
      .eq('id', umkmId)
      .single()
    
    if (umkmErr) throw umkmErr
    umkmName.value = umkmData.nama_umkm

    // 2. Fetch Product Performance
    const { data: prodData, error: prodErr } = await (supabase as any)
      .rpc('get_umkm_product_performance', { p_umkm_id: umkmId })
    
    if (prodErr) throw prodErr
    products.value = (prodData as any) || []

    // 3. Fetch Session History
    const { data: sessData, error: sessErr } = await (supabase as any)
      .rpc('get_umkm_session_history', { p_umkm_id: umkmId })
    
    if (sessErr) throw sessErr
    sessions.value = (sessData as any) || []
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
  <div class="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-4xl mx-auto flex flex-col gap-6">
      
      <!-- Top Branding Header -->
      <div class="flex items-center justify-between bg-white border border-slate-150 p-5 rounded-2xl shadow-sm">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-brand-900 flex items-center justify-center text-white font-black text-lg">
            O
          </div>
          <div>
            <h1 class="text-base font-extrabold text-slate-800 leading-tight">POS OMK Konsinyasi</h1>
            <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Laporan Mitra UMKM</p>
          </div>
        </div>
        <div class="text-right">
          <h2 class="text-sm font-extrabold text-brand-950">{{ umkmName || 'Memuat...' }}</h2>
          <span class="text-[9px] font-black px-2 py-0.5 rounded bg-brand-50 text-brand-900 border border-brand-100 uppercase tracking-wider block mt-1">Mitra Aktif</span>
        </div>
      </div>

      <div v-if="isLoading" class="text-center py-12 text-slate-400 font-semibold">
        Memuat data performa penjualan Anda...
      </div>

      <template v-else>
        <!-- Stat Cards -->
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

        <!-- Product Performance Table -->
        <div class="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Performa Produk Anda</h3>
            <span class="text-[10px] text-slate-400 font-mono font-bold">{{ products.length }} Produk</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/50 border-b border-slate-100 text-slate-450 text-[9px] font-extrabold uppercase tracking-wider">
                  <th class="p-4">Nama Produk</th>
                  <th class="p-4 text-right">Harga Setor (Net)</th>
                  <th class="p-4 text-center">Total Terjual</th>
                  <th class="p-4 text-right text-brand-900">Total Komisi Anda</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                <tr v-for="p in products" :key="p.master_product_id" class="hover:bg-slate-50/20">
                  <td class="p-4 text-slate-900 font-bold">{{ p.nama_produk }}</td>
                  <td class="p-4 text-right font-mono text-slate-500">{{ useCurrencyFormat(p.harga_asli) }}</td>
                  <td class="p-4 text-center font-mono font-bold text-slate-800">{{ p.total_terjual }} pcs</td>
                  <td class="p-4 text-right font-mono font-bold text-brand-950 bg-brand-50/5">{{ useCurrencyFormat(p.total_setoran) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Session History Table -->
        <div class="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Riwayat Sesi Penjualan</h3>
            <span class="text-[10px] text-slate-400 font-mono font-bold">{{ sessions.length }} Sesi</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-50/50 border-b border-slate-100 text-slate-450 text-[9px] font-extrabold uppercase tracking-wider">
                  <th class="p-4">Tanggal Sesi</th>
                  <th class="p-4 text-center">Status</th>
                  <th class="p-4 text-center">Jumlah Terjual</th>
                  <th class="p-4 text-right text-brand-900">Setoran Sesi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium text-slate-700">
                <tr v-for="s in sessions" :key="s.session_id" class="hover:bg-slate-50/20">
                  <td class="p-4 text-slate-900 font-bold font-mono">
                    {{ new Date(s.session_date.replace(/-/g, '/')).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}
                  </td>
                  <td class="p-4 text-center">
                    <span :class="['px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border', s.status === 'closed' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100']">
                      {{ s.status === 'closed' ? 'Selesai' : 'Aktif' }}
                    </span>
                  </td>
                  <td class="p-4 text-center font-mono text-slate-800 font-bold">{{ s.total_terjual }} pcs</td>
                  <td class="p-4 text-right font-mono font-bold text-brand-950 bg-brand-50/5">{{ useCurrencyFormat(s.total_setoran) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </template>

      <!-- Footer Branding -->
      <div class="text-center py-4">
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disponsori & Dikelola oleh Orang Muda Katolik (OMK)</p>
      </div>

    </div>
  </div>
</template>
