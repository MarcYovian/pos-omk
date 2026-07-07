<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useCashFlowStore } from '~/stores/cashFlow'
import { useSessionStore } from '~/stores/session'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const cashFlowStore = useCashFlowStore()
const sessionStore = useSessionStore()
const { addToast } = useToast()

const startDate = ref('')
const endDate = ref('')
const isModalOpen = ref(false)
const form = ref({
  type: 'income' as 'income' | 'expense',
  amount: 0,
  description: '',
  sessionId: ''
})

const sessions = ref<{ id: string; session_date: string }[]>([])

const filteredItems = computed(() => cashFlowStore.items)

const currentPage = computed(() => cashFlowStore.currentPage)
const totalPages = computed(() => cashFlowStore.totalPages)
const totalCount = computed(() => cashFlowStore.totalCount)

const loadData = async (page: number = 1) => {
  try {
    await cashFlowStore.fetchSummary(startDate.value || undefined, endDate.value || undefined)
    await cashFlowStore.fetchList(startDate.value || undefined, endDate.value || undefined, page)
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat data cash flow' })
  }
}

const handlePrevPage = () => {
  if (currentPage.value > 1) {
    loadData(currentPage.value - 1)
  }
}

const handleNextPage = () => {
  if (currentPage.value < totalPages.value) {
    loadData(currentPage.value + 1)
  }
}

const loadSessions = async () => {
  const supabase = useSupabase()
  const { data } = await supabase
    .from('sessions')
    .select('id, session_date')
    .eq('status', 'closed')
    .order('session_date', { ascending: false })
    .limit(20)
  sessions.value = data || []
}

const handleFilter = () => {
  loadData()
}

const openAddModal = () => {
  form.value = { type: 'income', amount: 0, description: '', sessionId: '' }
  isModalOpen.value = true
}

const handleSubmit = async () => {
  if (form.value.amount <= 0) {
    addToast({ type: 'warning', message: 'Jumlah harus lebih dari 0' })
    return
  }
  if (!form.value.description.trim()) {
    addToast({ type: 'warning', message: 'Deskripsi wajib diisi' })
    return
  }

  try {
    await cashFlowStore.addCashFlow(
      form.value.type,
      form.value.amount,
      form.value.description,
      form.value.sessionId || undefined
    )
    addToast({ type: 'success', message: 'Cash flow berhasil ditambahkan' })
    isModalOpen.value = false
    loadData()
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal menambahkan cash flow' })
  }
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr.replace(' ', 'T'))
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

const getSourceLabel = (source: string) => {
  return source === 'transaction' ? 'Transaksi' : 'Manual'
}

onMounted(() => {
  loadData()
  loadSessions()
})
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6">
    <!-- Header Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <div class="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
        <span class="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Saldo</span>
        <h3 class="text-xl sm:text-2xl font-black text-slate-800 mt-1 font-mono tabular-nums">
          {{ useCurrencyFormat(cashFlowStore.saldo) }}
        </h3>
      </div>
      <div class="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
        <span class="text-xs text-emerald-600 font-bold uppercase tracking-wider">Total Pemasukan</span>
        <h3 class="text-xl sm:text-2xl font-black text-emerald-600 mt-1 font-mono tabular-nums">
          {{ useCurrencyFormat(cashFlowStore.totalIncome) }}
        </h3>
      </div>
      <div class="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
        <span class="text-xs text-rose-600 font-bold uppercase tracking-wider">Total Pengeluaran</span>
        <h3 class="text-xl sm:text-2xl font-black text-rose-600 mt-1 font-mono tabular-nums">
          {{ useCurrencyFormat(cashFlowStore.totalExpense) }}
        </h3>
      </div>
    </div>

    <!-- Filter & Actions -->
    <div class="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
      <div class="flex flex-col sm:flex-row gap-2">
        <input
          v-model="startDate"
          type="date"
          class="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <span class="text-slate-400 self-center">-</span>
        <input
          v-model="endDate"
          type="date"
          class="px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <AppButton @click="handleFilter" size="sm" variant="secondary">
          Filter
        </AppButton>
      </div>
      <AppButton @click="openAddModal" class="sm:!w-auto">
        <Icon name="heroicons:plus" class="w-4 h-4" />
        Tambah
      </AppButton>
    </div>

    <!-- Loading -->
    <div v-if="cashFlowStore.isLoading" class="text-center py-12">
      <p class="text-slate-400 font-medium">Memuat data cash flow...</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Pagination Info -->
      <div v-if="filteredItems.length > 0" class="flex items-center justify-between text-xs text-slate-500 px-2">
        <span>Menampilkan {{ (currentPage - 1) * cashFlowStore.pageSize + 1 }}-{{ Math.min(currentPage * cashFlowStore.pageSize, totalCount) }} dari {{ totalCount }} data</span>
        <div class="flex items-center gap-2">
          <button
            @click="handlePrevPage"
            :disabled="currentPage <= 1"
            class="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            <Icon name="heroicons:chevron-left" class="w-4 h-4" />
          </button>
          <span class="font-medium">{{ currentPage }} / {{ totalPages }}</span>
          <button
            @click="handleNextPage"
            :disabled="currentPage >= totalPages"
            class="px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
          >
            <Icon name="heroicons:chevron-right" class="w-4 h-4" />
          </button>
        </div>
      </div>

      <!-- Table - Mobile Card, Desktop Table -->
      <div v-if="filteredItems.length > 0" class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <!-- Mobile Card List -->
        <div class="block sm:hidden divide-y divide-slate-100">
          <div v-for="item in filteredItems" :key="item.id" class="p-4">
            <div class="flex justify-between items-start mb-2">
              <div>
                <span
                  :class="[
                    'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border',
                    item.type === 'income'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'bg-rose-50 text-rose-600 border-rose-200'
                  ]"
                >
                  {{ item.type === 'income' ? 'Pemasukan' : 'Pengeluaran' }}
                </span>
                <span class="text-[10px] text-slate-400 ml-1">({{ getSourceLabel(item.source) }})</span>
              </div>
              <span
                :class="[
                  'font-mono font-bold tabular-nums',
                  item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                ]"
              >
                {{ item.type === 'income' ? '+' : '-' }}{{ useCurrencyFormat(item.amount) }}
              </span>
            </div>
            <p class="text-sm text-slate-700 font-medium">{{ item.description || '-' }}</p>
            <p class="text-[10px] text-slate-400 mt-1 font-mono">
              {{ formatDate(item.created_at) }}
              <span v-if="item.session_date"> • Sesi {{ formatDate(item.session_date) }}</span>
            </p>
          </div>
        </div>

        <!-- Desktop Table -->
        <div class="hidden sm:block overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th class="p-4">Tanggal</th>
                <th class="p-4">Jenis</th>
                <th class="p-4">Sumber</th>
                <th class="p-4">Deskripsi</th>
                <th class="p-4 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-slate-50/50">
                <td class="p-4 font-mono text-slate-600 text-xs">
                  {{ formatDate(item.created_at) }}
                </td>
                <td class="p-4">
                  <span
                    :class="[
                      'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border',
                      item.type === 'income'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    ]"
                  >
                    {{ item.type === 'income' ? 'Pemasukan' : 'Pengeluaran' }}
                  </span>
                </td>
                <td class="p-4 text-slate-600 text-xs">
                  {{ getSourceLabel(item.source) }}
                </td>
                <td class="p-4 text-slate-800 font-medium max-w-xs truncate">
                  {{ item.description || '-' }}
                </td>
                <td
                  :class="[
                    'p-4 text-right font-mono font-bold tabular-nums',
                    item.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                  ]"
                >
                  {{ item.type === 'income' ? '+' : '-' }}{{ useCurrencyFormat(item.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center">
        <Icon name="heroicons:banknotes" class="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p class="text-slate-400 font-medium">Tidak ada data cash flow</p>
      </div>
    </template>

    <!-- Add Modal -->
    <AppModal v-model="isModalOpen" title="Tambah Cash Flow" size="sm">
      <div class="flex flex-col gap-4 py-2">
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Jenis</label>
          <select
            v-model="form.type"
            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="income">Pemasukan</option>
            <option value="expense">Pengeluaran</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Jumlah</label>
          <input
            v-model.number="form.amount"
            type="number"
            min="1"
            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Masukkan jumlah"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Deskripsi</label>
          <input
            v-model="form.description"
            type="text"
            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Keterangan transaksi"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            Sesi (Opsional)
            <span class="text-slate-400 font-normal"> - Untuk relate ke sesi tertentu</span>
          </label>
          <select
            v-model="form.sessionId"
            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Tidak ada</option>
            <option v-for="s in sessions" :key="s.id" :value="s.id">
              {{ formatDate(s.session_date) }}
            </option>
          </select>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton @click="isModalOpen = false" variant="secondary">Batal</AppButton>
          <AppButton @click="handleSubmit">Simpan</AppButton>
        </div>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>