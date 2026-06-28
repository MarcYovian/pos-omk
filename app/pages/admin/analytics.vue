<!-- pages/admin/analytics.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSupabase } from '~/composables/useSupabase'
import { useCurrencyFormat } from '~/composables/useCurrencyFormat'
import AppToast from '~/components/ui/AppToast.vue'
import { useToast } from '~/composables/useToast'
import { Line, Doughnut, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  BarElement
} from 'chart.js'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  BarElement
)

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const supabase = useSupabase()
const { addToast } = useToast()

const isLoading = ref(true)

// Raw data states
const weeklyTrends = ref<any[]>([])
const umkmProfitContribution = ref<any[]>([])
const topProducts = ref<any[]>([])

const fetchAnalyticsData = async () => {
  isLoading.value = true
  try {
    // 1. Fetch Weekly Trends
    const { data: trends, error: trendsError } = await supabase.rpc('get_weekly_trends' as any, { p_limit: 10 })
    if (trendsError) throw trendsError
    weeklyTrends.value = (trends as any[] || []).reverse() // reverse to show oldest to newest left-to-right

    // 2. Fetch UMKM Profit Contribution
    const { data: umkmContrib, error: contribError } = await supabase
      .from('umkm_profit_contribution' as any)
      .select('*')

    if (contribError) throw contribError
    umkmProfitContribution.value = umkmContrib || []

    // 3. Fetch Top 5 Products
    const { data: productsData, error: productsError } = await supabase
      .from('top_products_sales' as any)
      .select('*')
      .limit(5)

    if (productsError) throw productsError
    topProducts.value = productsData || []

  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal memuat analitik finansial'
    })
  } finally {
    isLoading.value = false
  }
}

// Chart Configurations
const lineChartData = computed(() => {
  const labels = weeklyTrends.value.map(t => t.session_date)
  const grossData = weeklyTrends.value.map(t => t.gross_revenue)
  const profitData = weeklyTrends.value.map(t => t.omk_net_profit)

  return {
    labels,
    datasets: [
      {
        label: 'Omset Kotor',
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
        data: grossData,
        tension: 0.3
      },
      {
        label: 'Laba Bersih OMK',
        backgroundColor: '#10b981',
        borderColor: '#10b981',
        data: profitData,
        tension: 0.3
      }
    ]
  }
})

const donutChartData = computed(() => {
  const labels = umkmProfitContribution.value.map(u => u.nama_umkm)
  const data = umkmProfitContribution.value.map(u => u.omk_profit)

  return {
    labels,
    datasets: [
      {
        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4'],
        data
      }
    ]
  }
})

const barChartData = computed(() => {
  const labels = topProducts.value.map(p => `${p.nama_produk} (${p.sell_through_rate}% STR)`)
  const data = topProducts.value.map(p => p.total_sold)

  return {
    labels,
    datasets: [
      {
        label: 'Jumlah Terjual',
        backgroundColor: '#f59e0b',
        data
      }
    ]
  }
})

onMounted(() => {
  fetchAnalyticsData()
})
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <!-- Top Action Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-150 p-4 rounded-2xl shadow-sm">
      <div>
        <h2 class="text-sm font-bold text-slate-800">Analitik Finansial Sesi</h2>
        <p class="text-xs text-slate-500 mt-0.5">Visualisasi tren pendapatan kotor, laba bersih OMK, dan kontribusi mitra</p>
      </div>
      <AppButton @click="fetchAnalyticsData" variant="secondary" size="sm" class="font-bold text-xs shrink-0 self-start sm:self-center">
        <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-1" />
        Refresh
      </AppButton>
    </div>

    <div v-if="isLoading" class="text-center py-12 text-slate-400">
      Memuat grafik analitik...
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Line Chart: Trends -->
      <div class="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm lg:col-span-2 flex flex-col gap-4">
        <div>
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Tren Finansial Sesi</h3>
          <p class="text-[10px] text-slate-400 mt-0.5">Tren omset kotor dan laba bersih OMK dari sesi ke sesi</p>
        </div>
        <div class="h-64 relative">
          <ClientOnly>
            <Line :data="lineChartData" :options="{ responsive: true, maintainAspectRatio: false }" />
          </ClientOnly>
        </div>
      </div>

      <!-- Donut Chart: UMKM Contribution -->
      <div class="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm flex flex-col gap-4">
        <div>
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Kontribusi Laba Bersih</h3>
          <p class="text-[10px] text-slate-400 mt-0.5">Persentase kontribusi laba bersih OMK per mitra UMKM</p>
        </div>
        <div class="h-64 relative flex items-center justify-center">
          <ClientOnly>
            <Doughnut :data="donutChartData" :options="{ responsive: true, maintainAspectRatio: false }" />
          </ClientOnly>
        </div>
      </div>

      <!-- Bar Chart: Top 5 Products -->
      <div class="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm lg:col-span-3 flex flex-col gap-4">
        <div>
          <h3 class="text-xs font-black text-slate-800 uppercase tracking-wider">Top 5 Produk Terlaris</h3>
          <p class="text-[10px] text-slate-400 mt-0.5">Produk dengan jumlah penjualan (kuantitas) tertinggi sepanjang sesi</p>
        </div>
        <div class="h-64 relative">
          <ClientOnly>
            <Bar :data="barChartData" :options="{ responsive: true, maintainAspectRatio: false }" />
          </ClientOnly>
        </div>
      </div>
    </div>

    <AppToast />
  </div>
</template>
