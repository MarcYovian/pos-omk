<!-- pages/admin/reports.vue -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSessionStore } from '~/stores/session'
import { useUmkmStore } from '~/stores/umkm'
import { useToast } from '~/composables/useToast'
import { generateUMKMReport, type ProductReport } from '~/utils/report'
import AppButton from '~/components/ui/AppButton.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'
import ProfileDropdown from '~/components/ui/ProfileDropdown.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const sessionStore = useSessionStore()
const umkmStore = useUmkmStore()
const { addToast } = useToast()

const reports = ref<Record<string, string>>({})
const sentState = ref<Record<string, boolean>>({})
const isLoading = ref(true)

// Manual Copy Modal State
const isManualCopyOpen = ref(false)
const manualCopyText = ref('')

const loadReportData = async () => {
  const supabase = useSupabase()
  try {
    await sessionStore.fetchTodaySession()
    
    if (!sessionStore.currentSession) {
      addToast({ type: 'warning', message: 'Sesi hari ini belum dibuka' })
      navigateTo('/admin')
      return
    }

    if (sessionStore.currentSession.status !== 'closed') {
      addToast({ type: 'warning', message: 'Harap tutup sesi terlebih dahulu untuk melihat laporan.' })
      navigateTo('/admin/reconciliation')
      return
    }

    await umkmStore.fetchAll()

    // 1. Fetch products for today's session with their reconciliation records
    const { data: productsData, error: prodErr } = await supabase
      .from('products')
      .select(`
        id,
        nama_produk,
        stok_awal,
        stok_sekarang,
        harga_asli,
        umkm_id
      `)
      .eq('session_date', sessionStore.sessionDate)

    if (prodErr) throw prodErr

    // 2. Fetch reconciliation physical count records for today's session
    const { data: reconData, error: reconErr } = await supabase
      .from('reconciliation')
      .select('product_id, stok_fisik')
      .eq('session_id', sessionStore.sessionId as string)

    if (reconErr) throw reconErr

    const reconMap = new Map<string, number>(reconData?.map(r => [r.product_id, r.stok_fisik]) || [])

    // 3. For each UMKM, group their products and generate reports
    const reportMap: Record<string, string> = {}
    
    for (const u of umkmStore.umkmList) {
      const uProducts = (productsData || []).filter(p => p.umkm_id === u.id)
      
      const productReports: ProductReport[] = uProducts.map(p => {
        const sold = p.stok_awal - p.stok_sekarang
        const phys = reconMap.get(p.id) ?? p.stok_sekarang // fallback to system stock if physical is missing
        return {
          nama_produk: p.nama_produk,
          stok_awal: p.stok_awal,
          stok_sekarang: p.stok_sekarang,
          stok_fisik: phys,
          remittance_due: sold * p.harga_asli,
          harga_asli: p.harga_asli
        }
      })

      if (productReports.length > 0) {
        const dateObj = new Date(sessionStore.sessionDate.replace(/-/g, '/'))
        reportMap[u.id] = generateUMKMReport(u, productReports, dateObj)
      }
    }

    reports.value = reportMap
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat data laporan' })
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadReportData()
})

const handleCopyText = async (umkmId: string, umkmName: string) => {
  const text = reports.value[umkmId]
  if (!text) return

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      addToast({
        type: 'success',
        message: `Laporan ${umkmName} berhasil disalin!`
      })
    } else {
      throw new Error('Clipboard API not available')
    }
  } catch (e) {
    // Fallback to manual selection modal
    manualCopyText.value = text
    isManualCopyOpen.value = true
  }
}

const toggleSent = (umkmId: string) => {
  sentState.value[umkmId] = !sentState.value[umkmId]
}

const handleSendWA = (phone: string, umkmId: string) => {
  const text = reports.value[umkmId]
  if (!text) return
  
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  const encodedText = encodeURIComponent(text)
  const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`
  window.open(url, '_blank')
}
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    
    <div v-if="isLoading" class="text-center py-12">
      <p class="text-slate-500 font-medium">Memuat data laporan...</p>
    </div>

    <div v-else-if="Object.keys(reports).length === 0" class="text-center py-12 bg-white border rounded-2xl">
      <p class="text-slate-400 text-sm">Tidak ada produk aktif atau data laporan untuk sesi hari ini.</p>
    </div>

    <template v-else>
      <div class="flex justify-between items-center">
        <h2 class="text-sm font-bold text-slate-700">Kirim Rincian Komisi ke Mitra</h2>
        <span class="text-xs text-slate-500 font-mono font-semibold">{{ sessionStore.sessionDate }}</span>
      </div>

      <!-- Reports Cards -->
      <div class="flex flex-col gap-6">
        <div
          v-for="u in umkmStore.umkmList"
          :key="u.id"
          v-show="reports[u.id]"
          class="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm flex flex-col gap-4"
        >
          <!-- Card Head -->
          <div class="flex justify-between items-start border-b border-slate-100 pb-3">
            <div>
              <h3 class="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Icon name="heroicons:tag-solid" class="w-4 h-4 text-brand-900" />
                <span>{{ u.nama_umkm }}</span>
              </h3>
              <span class="text-xs font-mono font-bold text-slate-400">wa.me/{{ u.kontak_wa }}</span>
            </div>
            
            <!-- Sent Status Indicator -->
            <span
              v-if="sentState[u.id]"
              class="text-[10px] bg-green-50 text-success border border-green-100 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
            >
              <Icon name="heroicons:check-circle-solid" class="w-3.5 h-3.5" />
              <span>Terkirim</span>
            </span>
          </div>

          <!-- Report Text Box Preview -->
          <div class="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed select-all">
            {{ reports[u.id] }}
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-3">
            <AppButton
              @click="handleSendWA(u.kontak_wa, u.id)"
              class="flex-grow sm:flex-grow-0 !bg-emerald-600 hover:!bg-emerald-700 !border-0 text-white flex items-center justify-center gap-1.5 font-bold shadow-sm"
              size="sm"
            >
              <Icon name="heroicons:chat-bubble-left-right" class="w-3 h-3" />
              Kirim WA
            </AppButton>
            <AppButton
              @click="handleCopyText(u.id, u.nama_umkm)"
              class="flex-grow sm:flex-grow-0"
              variant="secondary"
              size="sm"
            >
              <Icon name="heroicons:clipboard-document" class="w-3 h-3" />
              Salin
            </AppButton>
            <AppButton
              @click="toggleSent(u.id)"
              variant="secondary"
              size="sm"
              class="flex-grow sm:flex-grow-0"
            >
              <Icon name="heroicons:check-circle" class="w-3 h-3" />
              {{ sentState[u.id] ? 'Batal Terkirim' : 'Tandai Terkirim ✓' }}
            </AppButton>
          </div>
        </div>
      </div>
    </template>

    <!-- Manual Copy Modal Fallback -->
    <AppModal
      v-model="isManualCopyOpen"
      title="Salin Teks Manual"
      size="sm"
    >
      <div class="flex flex-col gap-3 py-2">
        <p class="text-xs text-slate-500 font-semibold leading-relaxed">
          Browser tidak mengizinkan akses clipboard otomatis. Harap salin teks di bawah ini secara manual:
        </p>
        <textarea
          readonly
          class="w-full h-48 p-3 text-xs font-mono border rounded-lg bg-slate-50 focus:outline-none select-all"
        >{{ manualCopyText }}</textarea>
      </div>
      <template #footer>
        <AppButton @click="isManualCopyOpen = false">Tutup</AppButton>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>
