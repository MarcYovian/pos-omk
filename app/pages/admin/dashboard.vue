<!-- pages/admin/dashboard.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useSessionStore } from '~/stores/session'
import { useToast } from '~/composables/useToast'
import AppToast from '~/components/ui/AppToast.vue'
import ProfileDropdown from '~/components/ui/ProfileDropdown.vue'
import type { RealtimeChannel } from '@supabase/supabase-js'

definePageMeta({
  middleware: ['auth', 'admin']
})

const sessionStore = useSessionStore()
const { addToast } = useToast()

// Dashboard financial data
const summary = ref<any>(null)
const isLoading = ref(true)
const expandedUmkmId = ref<string | null>(null)
const expandedUmkmProducts = ref<any[]>([])
const isExpandedLoading = ref(false)

let transactionsChannel: RealtimeChannel | null = null
let autoRefreshTimer: any = null

const fetchFinancialData = async () => {
  const supabase = useSupabase()
  if (!sessionStore.sessionId) return

  try {
    const { data, error } = await supabase.rpc('get_session_financial_summary', {
      p_session_id: sessionStore.sessionId
    })

    if (error) throw error
    summary.value = data
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat rangkuman finansial' })
  } finally {
    isLoading.value = false
  }
}

const toggleUmkmRow = async (umkmId: string) => {
  if (expandedUmkmId.value === umkmId) {
    expandedUmkmId.value = null
    expandedUmkmProducts.value = []
    return
  }

  expandedUmkmId.value = umkmId
  isExpandedLoading.value = true
  expandedUmkmProducts.value = []

  const supabase = useSupabase()

  try {
    if (!sessionStore.sessionId) throw new Error('Session tidak aktif')

    const { data, error } = await supabase.rpc('get_umkm_product_breakdown', {
      p_session_id: sessionStore.sessionId as string,
      p_umkm_id:   umkmId
    })

    if (error) throw error
    expandedUmkmProducts.value = (data as any) ?? []
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat rincian produk' })
  } finally {
    isExpandedLoading.value = false
  }
}

onMounted(async () => {
  await sessionStore.fetchTodaySession()
  if (sessionStore.sessionId) {
    await fetchFinancialData()

    // Subscribe to transactions for real-time updates
    const supabase = useSupabase()
    transactionsChannel = supabase
      .channel('admin-transactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `session_id=eq.${sessionStore.sessionId}`
      }, () => {
        fetchFinancialData()
        // If an UMKM is expanded, refresh its details too
        if (expandedUmkmId.value) {
          const current = expandedUmkmId.value
          expandedUmkmId.value = null
          toggleUmkmRow(current)
        }
      })
      .subscribe()

    // Auto refresh fallback (30s)
    autoRefreshTimer = setInterval(() => {
      fetchFinancialData()
    }, 3000)
  } else {
    isLoading.value = false
  }
})

onUnmounted(() => {
  if (transactionsChannel) {
    const supabase = useSupabase()
    supabase.removeChannel(transactionsChannel)
  }
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-30 bg-gradient-to-r from-brand-900 to-brand-700 text-white px-4 py-4 shadow-md flex items-center justify-between backdrop-blur-md">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin" class="hover:bg-white/10 p-2 rounded-xl transition flex items-center justify-center">
          <Icon name="heroicons:arrow-left" class="w-5 h-5" />
        </NuxtLink>
        <div>
          <h1 class="text-lg font-black tracking-tight leading-none">Finansial Sesi</h1>
          <p class="text-[10px] text-brand-200 mt-1 font-medium font-mono">Layanan Pengelola</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <ProfileDropdown variant="dark" />
      </div>
    </header>

    <!-- Content -->
    <main class="flex-grow p-6 max-w-5xl w-full mx-auto flex flex-col gap-6">
      
      <div v-if="isLoading" class="text-center py-12">
        <p class="text-slate-500 font-medium">Memuat rincian...</p>
      </div>

      <div v-else-if="!sessionStore.sessionId" class="text-center py-12">
        <p class="text-slate-500 font-medium">Belum ada sesi hari ini. Buka sesi terlebih dahulu untuk melihat dashboard.</p>
      </div>

      <template v-else>
        <!-- Cards summary -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <!-- Gross Revenue -->
          <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span class="text-xs font-semibold text-slate-500 block uppercase">Omset Kotor</span>
            <span class="font-mono text-lg font-black text-slate-800 mt-2 block tabular-nums">
              {{ useCurrencyFormat(summary?.gross_revenue || 0) }}
            </span>
          </div>

          <!-- Total Remittance -->
          <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span class="text-xs font-semibold text-slate-500 block uppercase">Setoran UMKM</span>
            <span class="font-mono text-lg font-black text-brand-900 mt-2 block tabular-nums">
              {{ useCurrencyFormat(summary?.total_remittance || 0) }}
            </span>
          </div>

          <!-- Net Profit -->
          <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span class="text-xs font-semibold text-slate-500 block uppercase">Laba Bersih OMK</span>
            <span class="font-mono text-lg font-black text-success mt-2 block tabular-nums">
              {{ useCurrencyFormat(summary?.omk_net_profit || 0) }}
            </span>
          </div>

          <!-- Transaction Count -->
          <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <span class="text-xs font-semibold text-slate-500 block uppercase">Total Transaksi</span>
            <span class="font-mono text-lg font-black text-slate-800 mt-2 block tabular-nums">
              {{ summary?.transaction_count || 0 }}
            </span>
          </div>
        </div>

        <!-- Per UMKM Table -->
        <div class="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-100">
            <h2 class="text-sm font-bold text-slate-800">Pembagian Komisi Per UMKM</h2>
          </div>
          
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm border-collapse">
              <thead>
                <tr class="bg-slate-50 text-slate-500 font-semibold text-xs border-b">
                  <th class="py-3 px-5">Nama UMKM</th>
                  <th class="py-3 px-5 text-right">Terjual</th>
                  <th class="py-3 px-5 text-right">Omset Kotor</th>
                  <th class="py-3 px-5 text-right">Setoran UMKM</th>
                  <th class="py-3 px-5 text-right">Laba OMK</th>
                  <th class="py-3 px-5"></th>
                </tr>
              </thead>
              <tbody>
                <template v-for="u in summary?.per_umkm" :key="u.umkm_id">
                  <!-- Row -->
                  <tr
                    @click="toggleUmkmRow(u.umkm_id)"
                    class="border-b hover:bg-slate-50/70 cursor-pointer transition"
                  >
                    <td class="py-3 px-5 font-bold text-slate-800">{{ u.nama_umkm }}</td>
                    <td class="py-3 px-5 text-right font-mono font-medium">{{ u.items_sold }} item</td>
                    <td class="py-3 px-5 text-right font-mono font-medium tabular-nums">{{ useCurrencyFormat(u.gross_sales) }}</td>
                    <td class="py-3 px-5 text-right font-mono font-bold text-brand-900 tabular-nums">{{ useCurrencyFormat(u.remittance_due) }}</td>
                    <td class="py-3 px-5 text-right font-mono font-bold text-success tabular-nums">{{ useCurrencyFormat(u.omk_profit) }}</td>
                    <td class="py-3 px-5 text-center text-slate-400">
                      <Icon
                        :name="expandedUmkmId === u.umkm_id ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                        class="w-4 h-4"
                      />
                    </td>
                  </tr>

                  <!-- Expandable Product Details -->
                  <tr v-if="expandedUmkmId === u.umkm_id" class="bg-slate-50/50">
                    <td colspan="6" class="p-5">
                      <div v-if="isExpandedLoading" class="text-center py-4 text-xs font-semibold text-slate-400">
                        Memuat rincian produk...
                      </div>
                      
                      <div v-else-if="expandedUmkmProducts.length === 0" class="text-center py-4 text-xs text-slate-400">
                        Tidak ada produk untuk mitra ini.
                      </div>
                      
                      <div v-else class="flex flex-col gap-3">
                        <h4 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Rincian Per Produk</h4>
                        
                        <div class="overflow-x-auto rounded-xl border border-slate-100 bg-white">
                          <table class="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr class="bg-slate-100 text-slate-500 font-semibold border-b">
                                <th class="py-2.5 px-4">Nama Produk</th>
                                <th class="py-2.5 px-4 text-center">Stok Awal</th>
                                <th class="py-2.5 px-4 text-center">Terjual</th>
                                <th class="py-2.5 px-4 text-center">Sisa</th>
                                <th class="py-2.5 px-4 text-right">Omset</th>
                                <th class="py-2.5 px-4 text-right">Setoran</th>
                                <th class="py-2.5 px-4 text-right">Laba OMK</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr
                                v-for="prod in expandedUmkmProducts"
                                :key="prod.nama_produk"
                                class="border-b last:border-0 hover:bg-slate-50"
                              >
                                <td class="py-2.5 px-4 font-bold text-slate-800">{{ prod.nama_produk }}</td>
                                <td class="py-2.5 px-4 text-center font-mono font-medium">{{ prod.stok_awal }}</td>
                                <td class="py-2.5 px-4 text-center font-mono font-bold">{{ prod.sold }}</td>
                                <td class="py-2.5 px-4 text-center font-mono font-medium">{{ prod.stok_sekarang }}</td>
                                <td class="py-2.5 px-4 text-right font-mono font-medium tabular-nums">{{ useCurrencyFormat(prod.revenue) }}</td>
                                <td class="py-2.5 px-4 text-right font-mono font-bold text-brand-900 tabular-nums">{{ useCurrencyFormat(prod.cost) }}</td>
                                <td class="py-2.5 px-4 text-right font-mono font-bold text-success tabular-nums">{{ useCurrencyFormat(prod.profit) }}</td>
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
        </div>
      </template>

    </main>
    <AppToast />
  </div>
</template>
