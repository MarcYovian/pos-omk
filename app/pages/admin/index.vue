<!-- pages/admin/index.vue -->
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useSessionStore } from '~/stores/session'
import { onMounted } from 'vue'
import AppButton from '~/components/ui/AppButton.vue'
import AppToast from '~/components/ui/AppToast.vue'
import { useToast } from '~/composables/useToast'

definePageMeta({
  middleware: ['auth', 'admin']
})

const authStore = useAuthStore()
const sessionStore = useSessionStore()
const { addToast } = useToast()

onMounted(() => {
  sessionStore.fetchTodaySession()
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Header -->
    <header class="bg-brand-900 text-white px-4 py-3 shadow-md flex items-center justify-between">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-black tracking-tight">Admin OMK POS</h1>
        <span class="text-xs bg-white/20 px-2 py-0.5 rounded font-semibold text-white/95 uppercase">
          Admin
        </span>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink
          to="/pos"
          class="text-xs bg-brand-600 hover:bg-brand-500 font-semibold px-3 py-1.5 rounded-lg transition"
        >
          Masuk Kasir
        </NuxtLink>
        <button
          @click="authStore.logout()"
          class="text-xs bg-white/10 hover:bg-white/20 font-semibold px-3 py-1.5 rounded-lg transition"
        >
          Keluar
        </button>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-grow p-6 max-w-4xl w-full mx-auto flex flex-col gap-6">
      
      <!-- Session Status Banner -->
      <div
        class="p-5 rounded-2xl shadow-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        :class="{
          'bg-green-50 border-green-200 text-green-800': sessionStore.isOpen,
          'bg-red-50 border-red-200 text-red-800': sessionStore.isClosed,
          'bg-slate-100 border-slate-200 text-slate-700': !sessionStore.currentSession
        }"
      >
        <div>
          <h2 class="text-md font-bold">
            Status Sesi Hari Ini: 
            <span v-if="sessionStore.isOpen" class="uppercase">Aktif / Terbuka</span>
            <span v-else-if="sessionStore.isClosed" class="uppercase">Selesai / Terkunci</span>
            <span v-else class="uppercase">Belum Dibuat</span>
          </h2>
          <p class="text-xs mt-1 opacity-90 font-medium">
            Tanggal Sesi: {{ useSessionDate().formattedToday.value }}
          </p>
        </div>
        <div v-if="!sessionStore.currentSession" class="flex-shrink-0">
          <AppButton
            @click="sessionStore.openSession(authStore.user?.id || '')"
            size="md"
          >
            Buka Sesi Hari Ini
          </AppButton>
        </div>
      </div>

      <!-- Quick Actions Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <!-- Setup catalog -->
        <NuxtLink
          to="/admin/setup"
          class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition flex items-start gap-4"
        >
          <div class="p-3 bg-brand-50 text-brand-900 rounded-xl">
            <Icon name="heroicons:cog-8-tooth" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-bold text-slate-800 text-sm">Setup Minggu Ini</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed">
              Atur daftar mitra UMKM, harga produk konsinyasi, dan stok awal sebelum lapak dibuka.
            </p>
          </div>
        </NuxtLink>

        <!-- Live revenue split -->
        <NuxtLink
          to="/admin/dashboard"
          class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition flex items-start gap-4"
          :class="{ 'opacity-50 pointer-events-none': !sessionStore.currentSession }"
        >
          <div class="p-3 bg-green-50 text-success rounded-xl">
            <Icon name="heroicons:chart-bar" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-bold text-slate-800 text-sm">Dashboard Finansial</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed">
              Pantau laporan omset penjualan, pembagian komisi setoran UMKM, dan laba OMK secara real-time.
            </p>
          </div>
        </NuxtLink>

        <!-- reconciliation -->
        <NuxtLink
          to="/admin/reconciliation"
          class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition flex items-start gap-4"
          :class="{ 'opacity-50 pointer-events-none': !sessionStore.currentSession }"
        >
          <div class="p-3 bg-amber-50 text-warning rounded-xl">
            <Icon name="heroicons:clipboard-document-check" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-bold text-slate-800 text-sm">Rekonsiliasi Stok</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed">
              Catat sisa fisik kue di lapak sore hari, periksa selisih, dan kunci transaksi sesi ini.
            </p>
          </div>
        </NuxtLink>

        <!-- wa report copy -->
        <NuxtLink
          to="/admin/reports"
          class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition flex items-start gap-4"
          :class="{ 'opacity-50 pointer-events-none': !sessionStore.isClosed }"
        >
          <div class="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <Icon name="heroicons:chat-bubble-bottom-center-text" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-bold text-slate-800 text-sm">Laporan WhatsApp</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed">
              Salin teks rincian laporan otomatis untuk dikirim ke masing-masing mitra UMKM.
            </p>
          </div>
        </NuxtLink>

        <!-- user management -->
        <NuxtLink
          to="/admin/users"
          class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm hover:shadow-md transition flex items-start gap-4"
        >
          <div class="p-3 bg-red-50 text-red-700 rounded-xl">
            <Icon name="heroicons:users" class="w-6 h-6" />
          </div>
          <div class="flex flex-col gap-1">
            <h3 class="font-bold text-slate-800 text-sm">Kelola Pengguna</h3>
            <p class="text-xs text-slate-500 font-medium leading-relaxed">
              Daftarkan kasir baru, perbarui sandi, ubah peran (role), atau hapus akun pengguna.
            </p>
          </div>
        </NuxtLink>
      </div>

    </main>
    <AppToast />
  </div>
</template>
