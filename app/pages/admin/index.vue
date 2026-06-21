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
  middleware: ['auth', 'admin']
})

const authStore = useAuthStore()
const sessionStore = useSessionStore()
const { addToast } = useToast()

const isReopening = ref(false)
const canReopen = computed(() => !!authStore.user?.user_metadata?.can_reopen_session)

const isResetting = ref(false)
const showResetConfirm = ref(false)
const resetConfirmInput = ref('')

const handleResetSession = async () => {
  if (resetConfirmInput.value !== 'RESET SESI') return
  isResetting.value = true
  try {
    if (!authStore.user?.id) throw new Error('Admin tidak teridentifikasi')
    await sessionStore.resetSession(authStore.user.id)
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

onMounted(() => {
  sessionStore.fetchTodaySession()
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
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Gagal membuka kembali sesi'
    })
  } finally {
    isReopening.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
    <!-- Header -->
    <header class="sticky top-0 z-30 bg-gradient-to-r from-brand-900 to-brand-700 text-white px-4 py-4 shadow-md flex items-center justify-between backdrop-blur-md">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shadow-inner">
          <Icon name="heroicons:shield-check" class="w-6 h-6 text-brand-200" />
        </div>
        <div>
          <h1 class="text-lg font-black tracking-tight leading-none">Admin OMK POS</h1>
          <p class="text-[10px] text-brand-200 mt-1 font-semibold font-mono uppercase tracking-wider">Layanan Pengelola</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink
          to="/pos"
          class="text-xs bg-white text-brand-900 hover:bg-slate-100 font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm"
        >
          <Icon name="heroicons:shopping-cart" class="w-4 h-4 text-brand-900" />
          <span>Layar Kasir</span>
        </NuxtLink>
        <ProfileDropdown variant="dark" />
      </div>
    </header>

    <!-- Content -->
    <main class="flex-grow p-4 md:p-6 max-w-4xl w-full mx-auto flex flex-col gap-6">
      
      <!-- Welcome card -->
      <div class="bg-gradient-to-br from-brand-900 to-brand-700 rounded-3xl p-6 shadow-xl text-white relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        <div class="absolute -left-16 -bottom-16 w-48 h-48 bg-brand-500/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div class="flex flex-col gap-1.5 z-10">
          <span class="text-xs text-brand-200 font-extrabold uppercase tracking-widest font-mono">Halo Admin,</span>
          <h2 class="text-xl md:text-2xl font-black tracking-tight leading-snug break-all">{{ authStore.user?.email }}</h2>
          <p class="text-xs text-brand-100 font-medium mt-1">Selamat bertugas! Kelola data sesi hari ini dengan teliti.</p>
        </div>

        <div class="z-10 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-2 min-w-[200px] shadow-lg">
          <span class="text-[10px] text-brand-200 font-extrabold uppercase tracking-wider font-mono">Status Sesi Hari Ini</span>
          
          <div class="flex items-center gap-2 mt-1">
            <span v-if="sessionStore.isOpen" class="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-500/20 text-emerald-200 px-3 py-1 rounded-full border border-emerald-500/25">
              <span class="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
              AKTIF
            </span>
            <span v-else-if="sessionStore.isClosed" class="inline-flex items-center gap-1.5 text-xs font-bold bg-rose-500/20 text-rose-200 px-3 py-1 rounded-full border border-rose-500/25">
              <span class="h-2 w-2 rounded-full bg-rose-400"></span>
              SELESAI / TERKUNCI
            </span>
            <span v-else class="inline-flex items-center gap-1.5 text-xs font-bold bg-slate-500/25 text-slate-200 px-3 py-1 rounded-full border border-white/10">
              BELUM DIBUAT
            </span>
          </div>

          <div class="text-[11px] font-mono text-brand-200 font-semibold mt-1 flex items-center gap-1">
            <Icon name="heroicons:calendar" class="w-3.5 h-3.5 text-brand-300" />
            <span>{{ useSessionDate().formattedToday.value }}</span>
          </div>
          
          <!-- Reopen button if closed -->
          <AppButton
            v-if="sessionStore.isClosed && canReopen"
            @click="handleReopenSession"
            variant="secondary"
            size="sm"
            class="mt-2 w-full !bg-red-500 !text-white hover:!bg-red-650 font-extrabold text-xs shadow-md border-0"
            :loading="isReopening"
          >
            Buka Kembali Sesi
          </AppButton>
          
          <!-- Create session button if not created -->
          <AppButton
            v-if="!sessionStore.currentSession"
            @click="sessionStore.openSession(authStore.user?.id || '')"
            variant="secondary"
            size="sm"
            class="mt-2 w-full font-bold text-xs"
            :loading="sessionStore.isLoading"
          >
            Mulai Sesi Baru
          </AppButton>
          
          <!-- Reset button for marcellinusyovian@gmail.com -->
          <AppButton
            v-if="sessionStore.currentSession && authStore.user?.email === 'marcellinusyovian@gmail.com'"
            @click="showResetConfirm = true"
            variant="danger"
            size="sm"
            class="mt-2 w-full font-bold text-xs shadow-md border-0"
          >
            Reset Sesi Hari Ini
          </AppButton>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        <!-- Setup catalog -->
        <NuxtLink
          to="/admin/setup"
          class="group bg-white border border-slate-150 p-6 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4"
        >
          <div class="p-3.5 bg-brand-50 text-brand-900 rounded-2xl w-fit group-hover:scale-105 transition-transform duration-300 shadow-sm">
            <Icon name="heroicons:cog-8-tooth" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-extrabold text-slate-800 text-sm group-hover:text-brand-900 transition-colors">Setup Minggu Ini</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed mt-1">
              Atur daftar mitra UMKM, harga produk konsinyasi, dan stok awal sebelum lapak dibuka.
            </p>
          </div>
        </NuxtLink>

        <!-- Live revenue split -->
        <NuxtLink
          to="/admin/dashboard"
          class="group bg-white border border-slate-150 p-6 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4"
          :class="{ 'opacity-50 pointer-events-none bg-slate-50/50 border-slate-100': !sessionStore.currentSession }"
        >
          <div class="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl w-fit group-hover:scale-105 transition-transform duration-300 shadow-sm">
            <Icon name="heroicons:chart-bar" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-extrabold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">Dashboard Finansial</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed mt-1">
              Pantau laporan omset penjualan, pembagian komisi setoran UMKM, dan laba OMK secara real-time.
            </p>
          </div>
        </NuxtLink>

        <!-- reconciliation -->
        <NuxtLink
          to="/admin/reconciliation"
          class="group bg-white border border-slate-150 p-6 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4"
          :class="{ 'opacity-50 pointer-events-none bg-slate-50/50 border-slate-100': !sessionStore.currentSession }"
        >
          <div class="p-3.5 bg-amber-50 text-amber-600 rounded-2xl w-fit group-hover:scale-105 transition-transform duration-300 shadow-sm">
            <Icon name="heroicons:clipboard-document-check" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-extrabold text-slate-800 text-sm group-hover:text-amber-700 transition-colors">Rekonsiliasi Stok</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed mt-1">
              Catat sisa fisik kue di lapak sore hari, periksa selisih, dan kunci transaksi sesi ini.
            </p>
          </div>
        </NuxtLink>

        <!-- wa report copy -->
        <NuxtLink
          to="/admin/reports"
          class="group bg-white border border-slate-150 p-6 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4"
          :class="{ 'opacity-50 pointer-events-none bg-slate-50/50 border-slate-100': !sessionStore.isClosed }"
        >
          <div class="p-3.5 bg-indigo-50 text-indigo-700 rounded-2xl w-fit group-hover:scale-105 transition-transform duration-300 shadow-sm">
            <Icon name="heroicons:chat-bubble-bottom-center-text" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-extrabold text-slate-800 text-sm group-hover:text-indigo-800 transition-colors">Laporan WhatsApp</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed mt-1">
              Salin teks rincian laporan otomatis untuk dikirim ke masing-masing mitra UMKM.
            </p>
          </div>
        </NuxtLink>

        <!-- user management -->
        <NuxtLink
          to="/admin/users"
          class="group bg-white border border-slate-150 p-6 rounded-3xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 flex flex-col gap-4"
        >
          <div class="p-3.5 bg-rose-50 text-rose-700 rounded-2xl w-fit group-hover:scale-105 transition-transform duration-300 shadow-sm">
            <Icon name="heroicons:users" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-extrabold text-slate-800 text-sm group-hover:text-rose-800 transition-colors">Kelola Pengguna</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed mt-1">
              Daftarkan kasir baru, kirim email reset sandi, ubah peran (role), atau kelola akun pengguna.
            </p>
          </div>
        </NuxtLink>
      </div>

    </main>

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
