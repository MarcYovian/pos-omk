<!-- pages/admin/index.vue -->
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useSessionStore } from '~/stores/session'
import { onMounted, computed, ref } from 'vue'
import AppButton from '~/components/ui/AppButton.vue'
import AppToast from '~/components/ui/AppToast.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppInput from '~/components/ui/AppInput.vue'
import { useToast } from '~/composables/useToast'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const authStore = useAuthStore()
const sessionStore = useSessionStore()
const { addToast } = useToast()

const summary = ref<any>(null)
const isSummaryLoading = ref(false)
const isReopening = ref(false)
const canReopen = computed(() => !!authStore.user?.user_metadata?.can_reopen_session)

const isResetting = ref(false)
const showResetConfirm = ref(false)
const resetConfirmInput = ref('')

const fetchSummary = async () => {
  if (!sessionStore.sessionId) return
  isSummaryLoading.value = true
  const supabase = useSupabase()
  try {
    const { data, error } = await supabase.rpc('get_session_financial_summary', {
      p_session_id: sessionStore.sessionId
    })
    if (!error) summary.value = data
  } catch (e) {
    console.error(e)
  } finally {
    isSummaryLoading.value = false
  }
}

const handleResetSession = async () => {
  if (resetConfirmInput.value !== 'RESET SESI') return
  isResetting.value = true
  try {
    if (!authStore.user?.id) throw new Error('Admin tidak teridentifikasi')
    await sessionStore.resetSession(authStore.user.id)
    summary.value = null
    addToast({
      type: 'success',
      message: 'Sesi berhasil di-reset menjadi kosong.'
    })
    showResetConfirm.value = false
    resetConfirmInput.value = ''
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal mereset sesi'
    })
  } finally {
    isResetting.value = false
  }
}

onMounted(async () => {
  await sessionStore.fetchTodaySession()
  if (sessionStore.sessionId) {
    await fetchSummary()
  }
})

const handleReopenSession = async () => {
  isReopening.value = true
  try {
    if (!authStore.user?.id) throw new Error('Admin tidak teridentifikasi')
    await sessionStore.reopenSession(authStore.user.id)
    addToast({
      type: 'success',
      message: 'Sesi berhasil dibuka kembali.'
    })
    await fetchSummary()
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal membuka kembali sesi'
    })
  } finally {
    isReopening.value = false
  }
}

const handleOpenSession = async () => {
  if (!authStore.user?.id) return
  await sessionStore.openSession(authStore.user.id)
  await fetchSummary()
}
</script>

<template>
  <div class="w-full flex flex-col gap-6">
    <!-- Header Welcome & Date -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-slate-150 p-6 rounded-3xl shadow-sm">
      <div class="flex flex-col gap-1">
        <span class="text-xs text-brand-600 font-extrabold uppercase tracking-widest font-mono">Halo Admin OMK,</span>
        <h2 class="text-xl font-black text-slate-800 tracking-tight leading-none">{{ authStore.user?.email }}</h2>
        <p class="text-xs text-slate-500 mt-1">Selamat bertugas! Kelola dan pantau aktivitas sesi penjualan dengan cermat.</p>
      </div>
      <div class="flex items-center gap-2.5 bg-slate-50 border border-slate-150 px-4 py-2.5 rounded-2xl">
        <Icon name="heroicons:calendar" class="w-5 h-5 text-slate-500" />
        <div class="flex flex-col">
          <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none">Hari Ini</span>
          <span class="text-xs font-mono font-bold text-slate-700 leading-tight mt-0.5">{{ useSessionDate().formattedToday.value }}</span>
        </div>
      </div>
    </div>

    <!-- Live Session KPI Stats Banner (Only if session exists) -->
    <div v-if="sessionStore.currentSession" class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
        <div class="absolute -right-2 -bottom-2 opacity-5">
          <Icon name="heroicons:banknotes" class="w-20 h-20" />
        </div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Omset Kotor</span>
        <div>
          <span class="font-mono text-lg lg:text-xl font-black text-slate-800 block leading-none">
            {{ useCurrencyFormat(summary?.gross_revenue || 0) }}
          </span>
          <span class="text-[10px] text-slate-400 font-medium block mt-1">Total pendapatan kotor</span>
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
        <div class="absolute -right-2 -bottom-2 opacity-5">
          <Icon name="heroicons:arrow-up-tray" class="w-20 h-20" />
        </div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Setoran Mitra</span>
        <div>
          <span class="font-mono text-lg lg:text-xl font-black text-brand-900 block leading-none">
            {{ useCurrencyFormat(summary?.total_remittance || 0) }}
          </span>
          <span class="text-[10px] text-slate-450 font-medium block mt-1">Komisi milik mitra UMKM</span>
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
        <div class="absolute -right-2 -bottom-2 opacity-5">
          <Icon name="heroicons:sparkles" class="w-20 h-20" />
        </div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Laba Bersih OMK</span>
        <div>
          <span class="font-mono text-lg lg:text-xl font-black text-success block leading-none">
            {{ useCurrencyFormat(summary?.omk_net_profit || 0) }}
          </span>
          <span class="text-[10px] text-emerald-600 font-medium block mt-1">Keuntungan kas OMK</span>
        </div>
      </div>

      <div class="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-28 relative overflow-hidden">
        <div class="absolute -right-2 -bottom-2 opacity-5">
          <Icon name="heroicons:shopping-cart" class="w-20 h-20" />
        </div>
        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Transaksi</span>
        <div>
          <span class="font-mono text-lg lg:text-xl font-black text-slate-800 block leading-none">
            {{ summary?.transaction_count || 0 }}
          </span>
          <span class="text-[10px] text-slate-450 font-medium block mt-1">Struk terjual hari ini</span>
        </div>
      </div>
    </div>

    <!-- Main Session Status & Control Center Cockpit -->
    <div class="bg-slate-900 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-6">
      <div class="absolute -right-16 -top-16 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div class="flex flex-col gap-2 z-10 lg:w-2/3">
        <div class="flex items-center gap-2">
          <span class="text-[10px] text-brand-200 font-extrabold uppercase tracking-widest font-mono">Status Dashboard Sesi</span>
          <span v-if="sessionStore.isOpen" class="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
            AKTIF
          </span>
          <span v-else-if="sessionStore.isClosed" class="inline-flex items-center gap-1 text-[9px] font-black bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/30">
            SELESAI
          </span>
          <span v-else class="inline-flex items-center gap-1 text-[9px] font-black bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
            BELUM DIBUAT
          </span>
        </div>

        <h2 class="text-xl md:text-2xl font-black tracking-tight leading-snug">
          <span v-if="sessionStore.isOpen">Lapak penjualan sedang berlangsung secara real-time.</span>
          <span v-else-if="sessionStore.isClosed">Lapak penjualan telah ditutup dan dikunci.</span>
          <span v-else>Sesi penjualan hari ini belum dibuat secara resmi.</span>
        </h2>
        
        <p class="text-xs text-slate-400 max-w-xl">
          <span v-if="sessionStore.isOpen">Sesi transaksi POS aktif. Kasir dapat memproses transaksi pembelian produk konsinyasi dari mitra.</span>
          <span v-else-if="sessionStore.isClosed">Data keuangan telah dibekukan. Anda dapat menyalin dan mengirim rincian laporan otomatis ke mitra UMKM via WhatsApp.</span>
          <span v-else>Silakan buka sesi penjualan baru di bawah ini untuk mengaktifkan POS (Point of Sale) kasir dan mencatat transaksi barang.</span>
        </p>
      </div>

      <!-- Quick Control Action Container -->
      <div class="z-10 bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl p-4 flex flex-col gap-3 min-w-[220px] shadow-lg self-stretch justify-center">
        <span class="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider font-mono">Tindakan Kontrol Sesi</span>

        <!-- Open Session button -->
        <AppButton
          v-if="!sessionStore.currentSession"
          @click="handleOpenSession"
          variant="primary"
          size="sm"
          class="w-full font-bold text-xs"
          :loading="sessionStore.isLoading"
        >
          <Icon name="heroicons:play" class="w-4 h-4 mr-1.5" />
          Mulai Sesi Baru
        </AppButton>

        <!-- Shortcut to Close (when open) -->
        <NuxtLink v-if="sessionStore.isOpen" to="/admin/reconciliation" class="w-full">
          <AppButton
            variant="secondary"
            size="sm"
            class="w-full !bg-emerald-600 !text-white hover:!bg-emerald-700 font-bold text-xs border-0"
          >
            <Icon name="heroicons:lock-closed" class="w-4 h-4 mr-1.5" />
            Tutup & Rekon Sesi
          </AppButton>
        </NuxtLink>

        <!-- Reopen button if closed -->
        <AppButton
          v-if="sessionStore.isClosed && canReopen"
          @click="handleReopenSession"
          variant="secondary"
          size="sm"
          class="w-full !bg-red-650 !text-white hover:!bg-red-700 font-black text-xs shadow-md border-0"
          :loading="isReopening"
        >
          <Icon name="heroicons:arrow-path" class="w-4 h-4 mr-1.5" />
          Buka Kembali Sesi
        </AppButton>

        <!-- Reset session button for admin -->
        <AppButton
          v-if="sessionStore.currentSession && authStore.user?.email === 'marcellinusyovian@gmail.com'"
          @click="showResetConfirm = true"
          variant="danger"
          size="sm"
          class="w-full font-bold text-xs border-0 shadow-sm"
        >
          <Icon name="heroicons:trash" class="w-4 h-4 mr-1.5" />
          Reset Sesi Hari Ini
        </AppButton>
      </div>
    </div>

    <!-- Navigation Hub (Module Grid) -->
    <div class="flex flex-col gap-3">
      <h3 class="text-sm font-bold text-slate-700">Modul Kelola & Navigasi</h3>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <!-- Setup Catalog -->
        <NuxtLink
          to="/admin/setup"
          class="group bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-44"
        >
          <div>
            <div class="p-3 bg-brand-50 text-brand-900 rounded-xl w-fit group-hover:scale-105 transition-transform duration-300 shadow-sm">
              <Icon name="heroicons:cog-8-tooth" class="w-5 h-5" />
            </div>
            <h4 class="font-extrabold text-slate-800 text-sm mt-4 group-hover:text-brand-900 transition-colors">Setup Katalog</h4>
            <p class="text-[11px] text-slate-500 font-medium leading-normal mt-1">
              Atur harga konsinyasi, mitra UMKM, dan stok awal.
            </p>
          </div>
          <span class="text-[9px] font-bold bg-brand-50 text-brand-900 border border-brand-100 px-2 py-0.5 rounded w-fit uppercase tracking-wider font-mono">
            Selalu Aktif
          </span>
        </NuxtLink>

        <!-- Dashboard Finansial -->
        <NuxtLink
          to="/admin/dashboard"
          class="group bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-44"
          :class="{ 'opacity-50 pointer-events-none bg-slate-50/50 border-slate-100': !sessionStore.currentSession }"
        >
          <div>
            <div class="p-3 bg-emerald-50 text-emerald-600 rounded-xl w-fit group-hover:scale-105 transition-transform duration-300 shadow-sm">
              <Icon name="heroicons:chart-bar" class="w-5 h-5" />
            </div>
            <h4 class="font-extrabold text-slate-800 text-sm mt-4 group-hover:text-emerald-700 transition-colors">Finansial Sesi</h4>
            <p class="text-[11px] text-slate-500 font-medium leading-normal mt-1">
              Pantau omset penjualan dan pembagian laba real-time.
            </p>
          </div>
          <span 
            class="text-[9px] font-bold px-2 py-0.5 rounded w-fit uppercase tracking-wider font-mono border"
            :class="sessionStore.currentSession ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-400 border-slate-200'"
          >
            {{ sessionStore.currentSession ? 'Siap Dipantau' : 'Terkunci' }}
          </span>
        </NuxtLink>

        <!-- Reconciliation -->
        <NuxtLink
          to="/admin/reconciliation"
          class="group bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-44"
          :class="{ 'opacity-50 pointer-events-none bg-slate-50/50 border-slate-100': !sessionStore.currentSession }"
        >
          <div>
            <div class="p-3 bg-amber-50 text-amber-600 rounded-xl w-fit group-hover:scale-105 transition-transform duration-300 shadow-sm">
              <Icon name="heroicons:clipboard-document-check" class="w-5 h-5" />
            </div>
            <h4 class="font-extrabold text-slate-800 text-sm mt-4 group-hover:text-amber-700 transition-colors">Rekonsiliasi Stok</h4>
            <p class="text-[11px] text-slate-500 font-medium leading-normal mt-1">
              Catat sisa kue fisik sore hari dan kunci penjualan sesi.
            </p>
          </div>
          <span 
            class="text-[9px] font-bold px-2 py-0.5 rounded w-fit uppercase tracking-wider font-mono border"
            :class="sessionStore.currentSession ? (sessionStore.isClosed ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100') : 'bg-slate-100 text-slate-400 border-slate-200'"
          >
            {{ sessionStore.currentSession ? (sessionStore.isClosed ? 'Selesai' : 'Perlu Rekon') : 'Terkunci' }}
          </span>
        </NuxtLink>

        <!-- WhatsApp Reports -->
        <NuxtLink
          to="/admin/reports"
          class="group bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-44"
          :class="{ 'opacity-50 pointer-events-none bg-slate-50/50 border-slate-100': !sessionStore.isClosed }"
        >
          <div>
            <div class="p-3 bg-indigo-50 text-indigo-700 rounded-xl w-fit group-hover:scale-105 transition-transform duration-300 shadow-sm">
              <Icon name="heroicons:chat-bubble-bottom-center-text" class="w-5 h-5" />
            </div>
            <h4 class="font-extrabold text-slate-800 text-sm mt-4 group-hover:text-indigo-800 transition-colors">Laporan WhatsApp</h4>
            <p class="text-[11px] text-slate-500 font-medium leading-normal mt-1">
              Kirim rincian komisi setoran secara otomatis ke WhatsApp mitra.
            </p>
          </div>
          <span 
            class="text-[9px] font-bold px-2 py-0.5 rounded w-fit uppercase tracking-wider font-mono border"
            :class="sessionStore.isClosed ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-400 border-slate-200'"
          >
            {{ sessionStore.isClosed ? 'Siap Dikirim' : 'Terkunci' }}
          </span>
        </NuxtLink>

        <!-- User Management -->
        <NuxtLink
          to="/admin/users"
          class="group bg-white border border-slate-150 p-5 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between h-44"
        >
          <div>
            <div class="p-3 bg-rose-50 text-rose-700 rounded-xl w-fit group-hover:scale-105 transition-transform duration-300 shadow-sm">
              <Icon name="heroicons:users" class="w-5 h-5" />
            </div>
            <h4 class="font-extrabold text-slate-800 text-sm mt-4 group-hover:text-rose-800 transition-colors">Kelola Pengguna</h4>
            <p class="text-[11px] text-slate-500 font-medium leading-normal mt-1">
              Daftarkan kasir baru, reset sandi, atau kelola hak akses.
            </p>
          </div>
          <span class="text-[9px] font-bold bg-brand-50 text-brand-900 border border-brand-100 px-2 py-0.5 rounded w-fit uppercase tracking-wider font-mono">
            Selalu Aktif
          </span>
        </NuxtLink>
      </div>
    </div>

    <!-- Confirmation Modal: Reset Session -->
    <AppModal
      v-model="showResetConfirm"
      title="Reset Sesi Hari Ini?"
      size="sm"
    >
      <div class="flex flex-col gap-3 py-1">
        <p class="text-sm text-slate-600 leading-relaxed">
          Tindakan ini akan **menghapus semua data transaksi kasir, detail penjualan, dan rekonsiliasi** untuk sesi hari ini secara permanen. Stok produk akan dikembalikan ke stok awal.
        </p>
        <div class="p-3 bg-red-50 border border-red-100 rounded-xl flex gap-2 items-start">
          <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p class="text-xs font-bold text-red-700 leading-normal">
            Tindakan ini bersifat destruktif dan tidak bisa dibatalkan!
          </p>
        </div>
        <div class="flex flex-col gap-1.5 mt-2">
          <label class="text-xs text-slate-500 font-bold">Ketik <span class="text-red-650 font-mono">RESET SESI</span> untuk melanjutkan:</label>
          <AppInput
            v-model="resetConfirmInput"
            placeholder="RESET SESI"
            class="text-center font-mono font-bold text-red-600 uppercase"
          />
        </div>
      </div>
      <template #footer>
        <AppButton variant="secondary" @click="showResetConfirm = false; resetConfirmInput = ''" class="!rounded-xl font-bold">Batal</AppButton>
        <AppButton 
          variant="danger" 
          :disabled="resetConfirmInput !== 'RESET SESI'" 
          :loading="isResetting" 
          @click="handleResetSession" 
          class="!rounded-xl font-bold"
        >
          Ya, Reset Sesi
        </AppButton>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>
