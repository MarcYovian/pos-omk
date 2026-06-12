<!-- pages/admin/reconciliation.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSessionStore } from '~/stores/session'
import { useProductStore } from '~/stores/products'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppToast from '~/components/ui/AppToast.vue'
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  middleware: ['auth', 'admin']
})

const sessionStore = useSessionStore()
const productStore = useProductStore()
const authStore = useAuthStore()
const { addToast } = useToast()

const physicalCounts = ref<Record<string, number | ''>>({})
const isSubmitting = ref(false)
const showCloseConfirm = ref(false)

const loadData = async () => {
  try {
    await sessionStore.fetchTodaySession()
    if (sessionStore.currentSession) {
      await productStore.fetchTodayProducts()
      
      // Initialize inputs with empty string or existing snapshot if any
      const supabase = useSupabase()
      const { data } = await supabase
        .from('reconciliation')
        .select('product_id, stok_fisik')
        .eq('session_id', sessionStore.sessionId)

      const reconMap = new Map(data?.map(r => [r.product_id, r.stok_fisik]) || [])

      productStore.products.forEach(p => {
        if (reconMap.has(p.id)) {
          physicalCounts.value[p.id] = reconMap.get(p.id)!
        } else {
          physicalCounts.value[p.id] = ''
        }
      })
    }
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat data rekonsiliasi' })
  }
}

onMounted(() => {
  loadData()
})

const itemsFilledCount = computed(() => {
  return productStore.products.filter(p => {
    const val = physicalCounts.value[p.id]
    return val !== '' && val !== null && val >= 0
  }).length
})

const isAllFilled = computed(() => {
  return productStore.products.length > 0 && itemsFilledCount.value === productStore.products.length
})

const getSelisih = (productId: string, systemStock: number) => {
  const phys = physicalCounts.value[productId]
  if (phys === '' || phys === null) return null
  return Number(phys) - systemStock
}

const handleCloseSessionClick = () => {
  if (!isAllFilled.value) return
  showCloseConfirm.value = true
}

const handleConfirmClose = async () => {
  showCloseConfirm.value = false
  isSubmitting.value = true

  const supabase = useSupabase()
  
  try {
    if (!sessionStore.sessionId) throw new Error('Sesi tidak ditemukan')
    if (!authStore.user?.id) throw new Error('Admin tidak teridentifikasi')

    // 1. Batch insert/update reconciliation records
    const insertPayload = productStore.products.map(p => {
      const phys = Number(physicalCounts.value[p.id])
      return {
        session_id: sessionStore.sessionId!,
        product_id: p.id,
        stok_fisik: phys,
        stok_sekarang_snap: p.stok_sekarang,
        recorded_by: authStore.user!.id
      }
    })

    const { error: reconError } = await supabase
      .from('reconciliation')
      .upsert(insertPayload, { onConflict: 'session_id,product_id' })

    if (reconError) throw reconError

    // 2. Call close_session RPC
    await sessionStore.closeSession(authStore.user!.id)
    
    addToast({
      type: 'success',
      message: 'Sesi berhasil ditutup. Laporan WA siap dikirim.'
    })

    navigateTo('/admin/reports')
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal menutup sesi'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Header -->
    <header class="bg-brand-900 text-white px-4 py-3 shadow-md flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin" class="hover:text-brand-100 transition mr-1 flex items-center">
          <Icon name="heroicons:arrow-left" class="w-5 h-5" />
        </NuxtLink>
        <h1 class="text-xl font-black tracking-tight">Rekonsiliasi Stok</h1>
      </div>
      <AppButton
        v-if="!sessionStore.isClosed"
        :disabled="!isAllFilled"
        @click="handleCloseSessionClick"
        variant="secondary"
        size="sm"
      >
        Tutup Sesi
      </AppButton>
    </header>

    <!-- Content -->
    <main class="flex-grow p-6 max-w-3xl w-full mx-auto flex flex-col gap-6">
      
      <!-- Session Closed Banner -->
      <div v-if="sessionStore.isClosed" class="p-4 bg-danger/10 border border-danger/20 rounded-2xl text-center text-xs font-semibold text-danger flex items-center justify-center gap-2">
        <Icon name="heroicons:no-symbol" class="w-5 h-5" />
        <span>Sesi ini telah DITUTUP dan dikunci. Data rekonsiliasi bersifat read-only.</span>
      </div>

      <div class="flex items-center justify-between">
        <h2 class="text-sm font-bold text-slate-700">Periksa Jumlah Kue Tersisa</h2>
        <span class="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded font-mono">
          Terisi: {{ itemsFilledCount }} / {{ productStore.products.length }}
        </span>
      </div>

      <!-- Reconciliation Rows -->
      <div class="flex flex-col gap-3">
        <div
          v-for="p in productStore.products"
          :key="p.id"
          class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div class="flex flex-col gap-1 w-full sm:w-1/2">
            <span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded self-start">
              {{ p.umkm?.nama_umkm || 'Mitra' }}
            </span>
            <h3 class="font-bold text-slate-800 text-sm leading-snug mt-1">{{ p.nama_produk }}</h3>
            <p class="text-xs font-mono font-semibold text-slate-500 mt-1">
              Sisa Sistem: {{ p.stok_sekarang }}
            </p>
          </div>

          <!-- Inputs and difference indicator -->
          <div class="flex items-center gap-4 self-end sm:self-center">
            
            <!-- Difference Label -->
            <div v-if="getSelisih(p.id, p.stok_sekarang) !== null" class="text-xs font-bold px-2.5 py-1.5 rounded-lg">
              <span v-if="getSelisih(p.id, p.stok_sekarang) === 0" class="text-success bg-green-50 border border-green-100 px-2 py-1 rounded">
                ✓ Cocok
              </span>
              <span v-else class="text-danger bg-red-50 border border-red-100 px-2 py-1 rounded">
                Selisih: {{ getSelisih(p.id, p.stok_sekarang) }}
              </span>
            </div>

            <!-- Input Box -->
            <div class="w-24">
              <AppInput
                v-model="physicalCounts[p.id]"
                type="number"
                placeholder="Fisik"
                input-mode="numeric"
                :disabled="sessionStore.isClosed || isSubmitting"
                class="text-center font-mono font-bold"
              />
            </div>
          </div>
        </div>
      </div>

    </main>

    <!-- Confirmation Modal -->
    <AppModal
      v-model="showCloseConfirm"
      title="Tutup Sesi Hari Ini?"
      size="sm"
    >
      <div class="flex flex-col gap-2 py-1">
        <p class="text-sm text-slate-600 leading-relaxed">
          Setelah sesi ditutup, transaksi kasir tidak dapat diproses lagi dan data stok akan dikunci secara permanen.
        </p>
        <p class="text-sm font-bold text-danger leading-relaxed mt-2">
          Tindakan ini tidak dapat dibatalkan. Lanjutkan?
        </p>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showCloseConfirm = false">Batal</AppButton>
        <AppButton variant="danger" :loading="isSubmitting" @click="handleConfirmClose">Ya, Tutup Sesi</AppButton>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>
