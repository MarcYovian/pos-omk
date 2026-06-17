<!-- pages/admin/reconciliation.vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useSessionStore } from '~/stores/session'
import { useProductStore } from '~/stores/products'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppToast from '~/components/ui/AppToast.vue'
import AppModal from '~/components/ui/AppModal.vue'
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
const showMatchAllConfirm = ref(false)
const isReopening = ref(false)

const canReopen = computed(() => !!authStore.user?.user_metadata?.can_reopen_session)

const handleReopenSession = async () => {
  isReopening.value = true
  try {
    if (!authStore.user?.id) throw new Error('Admin tidak teridentifikasi')
    await sessionStore.reopenSession(authStore.user.id)
    addToast({
      type: 'success',
      message: 'Sesi berhasil dibuka kembali.'
    })
    await loadData()
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal membuka kembali sesi'
    })
  } finally {
    isReopening.value = false
  }
}

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

// Quick action to copy system stock for a single product
const copySystemStock = (productId: string, systemStock: number) => {
  if (sessionStore.isClosed) return
  physicalCounts.value[productId] = systemStock
}

// Quick action to copy system stock for all products
const copyAllSystemStocks = () => {
  if (sessionStore.isClosed) return
  productStore.products.forEach(p => {
    physicalCounts.value[p.id] = p.stok_sekarang
  })
  showMatchAllConfirm.value = false
  addToast({
    type: 'success',
    message: 'Semua jumlah fisik disesuaikan dengan sisa sistem.'
  })
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
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
    <!-- Header -->
    <header class="sticky top-0 z-30 bg-gradient-to-r from-brand-900 to-brand-700 text-white px-4 py-4 shadow-md flex items-center justify-between backdrop-blur-md">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin" class="hover:bg-white/10 p-2 rounded-xl transition flex items-center justify-center">
          <Icon name="heroicons:arrow-left" class="w-5 h-5" />
        </NuxtLink>
        <div>
          <h1 class="text-lg font-black tracking-tight leading-none">Rekonsiliasi Stok</h1>
          <p class="text-[10px] text-brand-200 mt-1 font-medium font-mono">Sesi: {{ sessionStore.sessionDate }}</p>
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <AppButton
          v-if="!sessionStore.isClosed && productStore.products.length > 0"
          variant="secondary"
          size="sm"
          class="!bg-white !text-brand-900 hover:!bg-slate-100 border-0 text-xs font-bold shadow-sm"
          @click="showMatchAllConfirm = true"
        >
          Cocokkan Semua
        </AppButton>
        
        <AppButton
          v-if="!sessionStore.isClosed"
          :disabled="!isAllFilled"
          @click="handleCloseSessionClick"
          variant="primary"
          size="sm"
          class="!bg-emerald-600 hover:!bg-emerald-700 !text-white shadow-sm font-bold text-xs border-0 disabled:!opacity-50"
        >
          Tutup Sesi
        </AppButton>
        <ProfileDropdown variant="dark" />
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-grow p-4 md:p-6 max-w-3xl w-full mx-auto flex flex-col gap-6">
      
      <!-- Session Closed Banner -->
      <div v-if="sessionStore.isClosed" class="p-4 bg-red-50 border border-red-200 rounded-2xl text-center text-xs font-semibold text-red-700 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        <div class="flex items-center gap-2.5">
          <Icon name="heroicons:lock-closed" class="w-5 h-5 text-red-500 animate-pulse" />
          <span>Sesi ini telah DITUTUP dan dikunci. Data rekonsiliasi bersifat read-only.</span>
        </div>
        <AppButton
          v-if="canReopen"
          @click="handleReopenSession"
          variant="secondary"
          size="sm"
          class="!bg-red-100 !text-red-700 hover:!bg-red-200 border-0 font-bold text-xs self-center"
          :loading="isReopening"
        >
          Buka Kembali Sesi
        </AppButton>
      </div>

      <!-- Stats Widget Card -->
      <div class="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div class="flex flex-col gap-1 text-center md:text-left">
          <span class="text-xs text-slate-500 font-medium">Progress Rekonsiliasi</span>
          <h2 class="text-xl font-extrabold text-slate-800">Periksa Sisa Kue Fisik</h2>
        </div>
        
        <div class="flex items-center gap-3 w-full md:w-auto">
          <!-- Progress bar -->
          <div class="flex-grow md:w-48 bg-slate-100 rounded-full h-3 overflow-hidden">
            <div 
              class="bg-gradient-to-r from-brand-600 to-brand-500 h-3 rounded-full transition-all duration-500 ease-out"
              :style="{ width: `${productStore.products.length > 0 ? (itemsFilledCount / productStore.products.length) * 100 : 0}%` }"
            ></div>
          </div>
          <span class="text-xs bg-brand-50 text-brand-700 font-extrabold px-3 py-1.5 rounded-xl border border-brand-100 font-mono whitespace-nowrap">
            {{ itemsFilledCount }} / {{ productStore.products.length }} Terisi
          </span>
        </div>
      </div>

      <!-- Reconciliation List -->
      <div class="flex flex-col gap-4">
        <div
          v-for="p in productStore.products"
          :key="p.id"
          class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex flex-col gap-1.5">
              <div class="flex items-center gap-2">
                <span class="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">
                  {{ p.umkm?.nama_umkm || 'Mitra' }}
                </span>
                <span class="text-[10px] bg-brand-50 text-brand-700 font-extrabold px-2 py-0.5 rounded-md font-mono">
                  Sisa Sistem: {{ p.stok_sekarang }}
                </span>
              </div>
              <h3 class="font-extrabold text-slate-800 text-base leading-snug">{{ p.nama_produk }}</h3>
            </div>
            
            <!-- Quick action: Match for single product -->
            <button
              v-if="!sessionStore.isClosed && physicalCounts[p.id] !== p.stok_sekarang"
              @click="copySystemStock(p.id, p.stok_sekarang)"
              class="flex items-center gap-1 text-[11px] font-bold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-xl transition duration-150 self-start border border-brand-100 shadow-sm"
              title="Set jumlah fisik sama dengan sisa sistem"
            >
              <Icon name="heroicons:check-circle" class="w-3.5 h-3.5" />
              Cocok
            </button>
          </div>

          <div class="flex items-center justify-between border-t border-slate-100 pt-4 gap-4">
            <!-- Difference indicator status -->
            <div>
              <div v-if="getSelisih(p.id, p.stok_sekarang) !== null" class="transition-all duration-200">
                <div v-if="getSelisih(p.id, p.stok_sekarang) === 0" class="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-xl">
                  <Icon name="heroicons:check-badge" class="w-4 h-4 text-emerald-500" />
                  <span>Stok Cocok</span>
                </div>
                <div v-else-if="getSelisih(p.id, p.stok_sekarang)! > 0" class="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-xl">
                  <Icon name="heroicons:plus-circle" class="w-4 h-4 text-blue-500" />
                  <span>Lebih: +{{ getSelisih(p.id, p.stok_sekarang) }}</span>
                </div>
                <div v-else class="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1.5 rounded-xl">
                  <Icon name="heroicons:minus-circle" class="w-4 h-4 text-amber-500" />
                  <span>Kurang: {{ getSelisih(p.id, p.stok_sekarang) }}</span>
                </div>
              </div>
              <span class="text-xs text-slate-400 font-medium italic" v-else>Belum diisi</span>
            </div>

            <!-- Input Box with nice controls -->
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 font-medium">Stok Fisik:</span>
              <div class="w-24 relative">
                <AppInput
                  v-model="physicalCounts[p.id]"
                  type="number"
                  placeholder="Fisik"
                  input-mode="numeric"
                  :disabled="sessionStore.isClosed || isSubmitting"
                  class="text-center font-mono font-bold !rounded-xl text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Confirmation Modal: Close Session -->
    <AppModal
      v-model="showCloseConfirm"
      title="Tutup Sesi Hari Ini?"
      size="sm"
    >
      <div class="flex flex-col gap-3 py-1">
        <p class="text-sm text-slate-600 leading-relaxed">
          Setelah sesi ditutup, transaksi kasir tidak dapat diproses lagi dan data stok akan dikunci secara permanen.
        </p>
        <div class="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 items-start">
          <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p class="text-xs font-bold text-red-700 leading-normal">
            Tindakan ini tidak dapat dibatalkan. Pastikan semua jumlah sisa kue fisik sudah benar!
          </p>
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showCloseConfirm = false" class="!rounded-xl font-bold">Batal</AppButton>
        <AppButton variant="danger" :loading="isSubmitting" @click="handleConfirmClose" class="!rounded-xl font-bold">Ya, Tutup Sesi</AppButton>
      </template>
    </AppModal>

    <!-- Confirmation Modal: Match All -->
    <AppModal
      v-model="showMatchAllConfirm"
      title="Cocokkan Semua Stok?"
      size="sm"
    >
      <div class="flex flex-col gap-3 py-1">
        <p class="text-sm text-slate-600 leading-relaxed">
          Apakah Anda ingin mengatur semua jumlah sisa kue fisik sama dengan nilai sisa sistem saat ini?
        </p>
        <p class="text-xs text-slate-500 leading-relaxed">
          Tindakan ini akan mengisi/mengganti kolom input fisik yang belum terisi dengan data dari sistem. Anda tetap dapat menyesuaikannya kembali setelahnya.
        </p>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showMatchAllConfirm = false" class="!rounded-xl font-bold">Batal</AppButton>
        <AppButton variant="primary" @click="copyAllSystemStocks" class="!rounded-xl font-bold">Ya, Cocokkan</AppButton>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>
