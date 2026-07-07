<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { usePaymentStore } from '~/stores/payment'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const paymentStore = usePaymentStore()
const { addToast } = useToast()

const isModalOpen = ref(false)
const selectedUmkm = ref<{ id: string; nama_umkm: string; total_terutang: number } | null>(null)
const notes = ref('')

const unpaidSummaries = computed(() => paymentStore.summaries.filter(s => {
  const paid = paymentStore.history
    .filter(h => h.umkm_id === s.umkm_id && h.status === 'paid')
    .reduce((sum, h) => sum + h.amount, 0)
  return Number(s.total_terutang) - paid > 0
}))

const loadData = async () => {
  try {
    await Promise.all([
      paymentStore.fetchSummary(),
      paymentStore.fetchHistory()
    ])
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat data pembayaran' })
  }
}

const openPayModal = (umkm: { umkm_id: string; nama_umkm: string; total_terutang: number }) => {
  selectedUmkm.value = { id: umkm.umkm_id, nama_umkm: umkm.nama_umkm, total_terutang: umkm.total_terutang }
  notes.value = ''
  isModalOpen.value = true
}

const getUnpaidAmount = (umkmId: string, totalTerutang: number) => {
  const paid = paymentStore.history
    .filter(h => h.umkm_id === umkmId && h.status === 'paid')
    .reduce((sum, h) => sum + h.amount, 0)
  return Number(totalTerutang) - paid
}

const handlePay = async () => {
  if (!selectedUmkm.value) return

  const unpaid = getUnpaidAmount(selectedUmkm.value.id, Number(selectedUmkm.value.total_terutang))
  if (unpaid <= 0) {
    addToast({ type: 'warning', message: 'Sudah tidak ada sisa terutang' })
    return
  }

  try {
    await paymentStore.markAsPaid(selectedUmkm.value.id, unpaid, notes.value || undefined)
    addToast({ type: 'success', message: `Pembayaran ${selectedUmkm.value.nama_umkm} berhasil ditandai` })
    isModalOpen.value = false
    await loadData()
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal mencatat pembayaran' })
  }
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount)
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

onMounted(() => {
  loadData()
})
</script>

<template>
  <div class="flex flex-col gap-4 sm:gap-6">
    <!-- Header Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div class="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
        <span class="text-xs text-rose-600 font-bold uppercase tracking-wider">Total Terutang</span>
        <h3 class="text-xl sm:text-2xl font-black text-rose-600 mt-1 font-mono tabular-nums">
          {{ formatCurrency(paymentStore.totalTerutang) }}
        </h3>
      </div>
      <div class="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-sm">
        <span class="text-xs text-emerald-600 font-bold uppercase tracking-wider">UMKM Belum Dibayar</span>
        <h3 class="text-xl sm:text-2xl font-black text-slate-800 mt-1 font-mono tabular-nums">
          {{ unpaidSummaries.length }} UMKM
        </h3>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="paymentStore.isLoading" class="text-center py-12">
      <p class="text-slate-400 font-medium">Memuat data pembayaran...</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Desktop Table -->
      <div v-if="unpaidSummaries.length > 0" class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden hidden sm:block">
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Daftar UMKM Belum Dibayar</h3>
        </div>
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
              <th class="p-4">UMKM</th>
              <th class="p-4 text-right">Total Terutang</th>
              <th class="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="item in unpaidSummaries" :key="item.umkm_id" class="hover:bg-slate-50/50">
              <td class="p-4">
                <span class="font-bold text-slate-800">{{ item.nama_umkm }}</span>
              </td>
              <td class="p-4 text-right font-mono font-bold text-rose-600 tabular-nums">
                {{ formatCurrency(getUnpaidAmount(item.umkm_id, Number(item.total_terutang))) }}
              </td>
              <td class="p-4 text-right">
                <AppButton
                  @click="openPayModal(item)"
                  size="sm"
                  class="!bg-emerald-600 hover:!bg-emerald-700 !border-0 text-white"
                >
                  <Icon name="heroicons:check" class="w-3 h-3" />
                  Tandai Dibayar
                </AppButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Card List -->
      <div v-if="unpaidSummaries.length > 0" class="block sm:hidden bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Belum Dibayar</h3>
        </div>
        <div class="divide-y divide-slate-100">
          <div v-for="item in unpaidSummaries" :key="item.umkm_id" class="p-4">
            <div class="flex justify-between items-start mb-2">
              <span class="font-bold text-slate-800 text-sm">{{ item.nama_umkm }}</span>
              <span class="font-mono font-bold text-rose-600 tabular-nums text-sm">
                {{ formatCurrency(getUnpaidAmount(item.umkm_id, Number(item.total_terutang))) }}
              </span>
            </div>
            <AppButton
              @click="openPayModal(item)"
              size="sm"
              class="w-full !bg-emerald-600 hover:!bg-emerald-700 !border-0 text-white justify-center"
            >
              <Icon name="heroicons:check" class="w-3 h-3" />
              Tandai Dibayar
            </AppButton>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="bg-white border border-slate-200 rounded-2xl shadow-sm p-12 text-center">
        <Icon name="heroicons:check-circle" class="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <p class="text-slate-400 font-medium">Semua UMKM sudah dibayar</p>
      </div>

      <!-- Payment History -->
      <div v-if="paymentStore.history.length > 0" class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Riwayat Pembayaran</h3>
        </div>
        
        <!-- Mobile Card List -->
        <div class="block sm:hidden divide-y divide-slate-100">
          <div v-for="item in paymentStore.history" :key="item.id" class="p-4">
            <div class="flex justify-between items-start mb-1">
              <span class="font-bold text-slate-800 text-sm">{{ item.nama_umkm }}</span>
              <span class="font-mono font-bold text-emerald-600 tabular-nums text-sm">
                {{ formatCurrency(item.amount) }}
              </span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-[10px] text-slate-400 font-mono">{{ formatDate(item.paid_at || item.created_at) }}</span>
              <span
                :class="[
                  'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border',
                  item.status === 'paid'
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    : 'bg-rose-50 text-rose-600 border-rose-200'
                ]"
              >
                {{ item.status === 'paid' ? 'Lunas' : 'Pending' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Desktop Table -->
        <div class="hidden sm:block overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <th class="p-4">Tanggal</th>
                <th class="p-4">UMKM</th>
                <th class="p-4 text-right">Jumlah</th>
                <th class="p-4">Status</th>
                <th class="p-4">Catatan</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in paymentStore.history" :key="item.id" class="hover:bg-slate-50/50">
                <td class="p-4 font-mono text-slate-600 text-xs">
                  {{ formatDate(item.paid_at || item.created_at) }}
                </td>
                <td class="p-4 font-bold text-slate-800">
                  {{ item.nama_umkm }}
                </td>
                <td class="p-4 text-right font-mono font-bold text-emerald-600 tabular-nums">
                  {{ formatCurrency(item.amount) }}
                </td>
                <td class="p-4">
                  <span
                    :class="[
                      'text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border',
                      item.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'bg-rose-50 text-rose-600 border-rose-200'
                    ]"
                  >
                    {{ item.status === 'paid' ? 'Lunas' : 'Pending' }}
                  </span>
                </td>
                <td class="p-4 text-slate-500 text-xs max-w-xs truncate">
                  {{ item.notes || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- Pay Modal -->
    <AppModal v-model="isModalOpen" title="Konfirmasi Pembayaran" size="sm">
      <div class="flex flex-col gap-4 py-2" v-if="selectedUmkm">
        <div class="bg-slate-50 rounded-xl p-4">
          <p class="text-xs text-slate-500 font-bold uppercase tracking-wider">UMKM</p>
          <p class="text-sm font-bold text-slate-800 mt-1">{{ selectedUmkm.nama_umkm }}</p>
        </div>
        <div class="bg-emerald-50 rounded-xl p-4">
          <p class="text-xs text-emerald-600 font-bold uppercase tracking-wider">Jumlah Dibayar</p>
          <p class="text-lg font-black text-emerald-600 mt-1 font-mono tabular-nums">
            {{ formatCurrency(getUnpaidAmount(selectedUmkm.id, Number(selectedUmkm.total_terutang))) }}
          </p>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">Catatan (Opsional)</label>
          <input
            v-model="notes"
            type="text"
            class="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Contoh: Transfer BCA, Bayar tunai"
          />
        </div>
      </div>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <AppButton @click="isModalOpen = false" variant="secondary">Batal</AppButton>
          <AppButton @click="handlePay">Konfirmasi Bayar</AppButton>
        </div>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>