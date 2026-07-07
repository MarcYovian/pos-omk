<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '~/stores/auth'
import { useSessionStore } from '~/stores/session'
import ProfileDropdown from '~/components/ui/ProfileDropdown.vue'

const route = useRoute()
const authStore = useAuthStore()
const sessionStore = useSessionStore()

const isMobileMenuOpen = ref(false)

interface NavItem {
  name: string
  path: string
  icon: string
  requiresSession?: boolean
  requiresClosedSession?: boolean
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Umum',
    items: [
      { name: 'Ikhtisar', path: '/admin', icon: 'heroicons:squares-2x2' },
      { name: 'Riwayat Sesi', path: '/admin/history', icon: 'heroicons:archive-box' },
      { name: 'Analitik Sesi', path: '/admin/analytics', icon: 'heroicons:presentation-chart-line' },
    ]
  },
  {
    label: 'UMKM & Produk',
    items: [
      { name: 'Master Data UMKM', path: '/admin/umkm', icon: 'heroicons:building-storefront' },
      { name: 'Setup Katalog', path: '/admin/setup', icon: 'heroicons:cog-8-tooth' },
    ]
  },
  {
    label: 'Keuangan',
    items: [
      { name: 'Finansial Sesi', path: '/admin/dashboard', icon: 'heroicons:chart-bar', requiresSession: true },
      { name: 'Cash Flow', path: '/admin/cash-flow', icon: 'heroicons:banknotes' },
      { name: 'Pembayaran UMKM', path: '/admin/payments', icon: 'heroicons:currency-dollar' },
    ]
  },
  {
    label: 'Operasional',
    items: [
      { name: 'Rekonsiliasi Stok', path: '/admin/reconciliation', icon: 'heroicons:clipboard-document-check', requiresSession: true },
      { name: 'Laporan WhatsApp', path: '/admin/reports', icon: 'heroicons:chat-bubble-bottom-center-text', requiresClosedSession: true },
    ]
  },
  {
    label: 'Pengaturan',
    items: [
      { name: 'Kelola Pengguna', path: '/admin/users', icon: 'heroicons:users' },
    ]
  }
]

const filteredNavGroups = computed(() => {
  return navGroups.map(group => ({
    ...group,
    items: group.items.map(item => {
      let isDisabled = false
      let tooltip = ''

      if (item.requiresSession && !sessionStore.currentSession) {
        isDisabled = true
        tooltip = 'Sesi harus aktif'
      }
      if (item.requiresClosedSession && !sessionStore.isClosed) {
        isDisabled = true
        tooltip = 'Sesi harus ditutup'
      }

      return { ...item, isDisabled, tooltip }
    })
  }))
})

const currentPath = computed(() => route.path)

const pageTitle = computed(() => {
  if (route.path === '/admin') return 'Ikhtisar Admin'
  if (route.path.startsWith('/admin/umkm')) return 'Master Data UMKM'
  if (route.path.startsWith('/admin/setup')) return 'Setup Mingguan'
  if (route.path === '/admin/dashboard') return 'Finansial Sesi'
  if (route.path === '/admin/reconciliation') return 'Rekonsiliasi Sesi'
  if (route.path === '/admin/reports') return 'Laporan WhatsApp'
  if (route.path === '/admin/history') return 'Riwayat Sesi'
  if (route.path === '/admin/cash-flow') return 'Cash Flow'
  if (route.path === '/admin/payments') return 'Pembayaran UMKM'
  if (route.path === '/admin/analytics') return 'Analitik Sesi'
  if (route.path === '/admin/users') return 'Kelola Pengguna'
  return 'Admin'
})

onMounted(() => {
  sessionStore.fetchTodaySession()
})

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex font-sans text-slate-800 antialiased">
    <!-- Sidebar for Desktop -->
    <aside class="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 h-screen sticky top-0">
      <!-- Logo / Header - Fixed -->
      <div class="p-5 border-b border-slate-800 flex items-center gap-3 shrink-0">
        <div class="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-md">
          <Icon name="heroicons:shield-check" class="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 class="text-sm font-black text-white tracking-tight uppercase leading-none">OMK POS Admin</h2>
          <span class="text-[9px] text-slate-400 font-mono tracking-wider">PANEL PENGELOLA</span>
        </div>
      </div>

      <!-- Session Status Widget - Fixed -->
      <div class="p-3 mx-3 my-3 bg-slate-800/50 rounded-xl border border-slate-800 shrink-0">
        <span class="text-[8px] text-slate-400 font-bold uppercase tracking-wider font-mono">Status Sesi</span>
        <div class="flex items-center gap-2 mt-1.5">
          <span v-if="sessionStore.isOpen" class="inline-flex items-center gap-1.5 text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/25">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            AKTIF
          </span>
          <span v-else-if="sessionStore.isClosed" class="inline-flex items-center gap-1.5 text-[9px] font-black bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/25">
            <span class="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
            SELESAI
          </span>
          <span v-else class="inline-flex items-center gap-1.5 text-[9px] font-black bg-slate-500/30 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
            BELUM DIBUAT
          </span>
          <span class="text-[9px] font-mono text-slate-500 ml-auto">{{ useSessionDate().formattedToday.value }}</span>
        </div>
      </div>

      <!-- Navigation Links - Scrollable -->
      <nav class="flex-grow overflow-y-auto px-3 py-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div v-for="group in filteredNavGroups" :key="group.label">
          <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5">{{ group.label }}</p>
          <div class="space-y-0.5">
            <template v-for="item in group.items" :key="item.path">
              <NuxtLink
                v-if="!item.isDisabled"
                :to="item.path"
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-150 group"
                :class="[
                  currentPath === item.path
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                ]"
              >
                <Icon
                  :name="item.icon"
                  class="w-4.5 h-4.5 shrink-0"
                  :class="[
                    currentPath === item.path ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                  ]"
                />
                <span class="text-[13px]">{{ item.name }}</span>
              </NuxtLink>

              <!-- Disabled nav item -->
              <div
                v-else
                class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 cursor-not-allowed select-none"
                :title="item.tooltip"
              >
                <Icon :name="item.icon" class="w-4.5 h-4.5 shrink-0 text-slate-700" />
                <span class="text-[13px]">{{ item.name }}</span>
                <span class="ml-auto text-[7px] font-bold bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-wider text-slate-500 border border-slate-700">
                  Kunci
                </span>
              </div>
            </template>
          </div>
        </div>
      </nav>

      <!-- Footer User Info - Fixed -->
      <div class="p-4 border-t border-slate-800 flex items-center gap-3 bg-slate-950/20 shrink-0">
        <div class="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {{ authStore.user?.email?.charAt(0).toUpperCase() || 'A' }}
        </div>
        <div class="min-w-0 flex-grow">
          <p class="text-xs font-bold text-slate-200 truncate">{{ authStore.user?.email }}</p>
          <p class="text-[8px] text-slate-500 font-mono uppercase tracking-wider">Admin</p>
        </div>
      </div>
    </aside>

    <!-- Drawer Sidebar for Mobile -->
    <div
      v-if="isMobileMenuOpen"
      class="fixed inset-0 z-50 flex lg:hidden bg-slate-950/60 backdrop-blur-sm transition-opacity"
      @click="closeMobileMenu"
    >
      <div
        class="w-72 bg-slate-900 text-slate-200 flex flex-col h-full shadow-2xl"
        @click.stop
      >
        <!-- Logo / Header -->
        <div class="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-2.5">
            <div class="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Icon name="heroicons:shield-check" class="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 class="text-xs font-black text-white uppercase leading-none">OMK POS</h2>
              <span class="text-[8px] text-slate-500 font-mono">ADMIN PANEL</span>
            </div>
          </div>
          <button @click="closeMobileMenu" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Mobile Session Widget -->
        <div class="p-3 mx-3 my-3 bg-slate-800/40 rounded-xl border border-slate-800/50 shrink-0">
          <span class="text-[8px] text-slate-500 font-bold uppercase tracking-wider font-mono">Status Sesi</span>
          <div class="flex items-center gap-2 mt-1">
            <span v-if="sessionStore.isOpen" class="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/25">
              AKTIF
            </span>
            <span v-else-if="sessionStore.isClosed" class="inline-flex items-center gap-1 text-[9px] font-black bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/25">
              SELESAI
            </span>
            <span v-else class="inline-flex items-center gap-1 text-[9px] font-black bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
              BELUM DIBUAT
            </span>
          </div>
        </div>

        <!-- Navigation Links - Scrollable -->
        <nav class="flex-grow overflow-y-auto px-3 py-2 space-y-4">
          <div v-for="group in filteredNavGroups" :key="group.label">
            <p class="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-1.5">{{ group.label }}</p>
            <div class="space-y-0.5">
              <template v-for="item in group.items" :key="item.path">
                <NuxtLink
                  v-if="!item.isDisabled"
                  :to="item.path"
                  @click="closeMobileMenu"
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors"
                  :class="[
                    currentPath === item.path ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  ]"
                >
                  <Icon :name="item.icon" class="w-4.5 h-4.5 shrink-0" />
                  <span>{{ item.name }}</span>
                </NuxtLink>
                <div
                  v-else
                  class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 cursor-not-allowed select-none"
                >
                  <Icon :name="item.icon" class="w-4.5 h-4.5 shrink-0 text-slate-700" />
                  <span>{{ item.name }}</span>
                </div>
              </template>
            </div>
          </div>
        </nav>

        <!-- Footer -->
        <div class="p-4 border-t border-slate-800 bg-slate-950/20 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {{ authStore.user?.email?.charAt(0).toUpperCase() || 'A' }}
            </div>
            <p class="text-xs font-bold text-slate-300 truncate">{{ authStore.user?.email }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-grow flex flex-col min-w-0 h-screen overflow-y-auto">
      <!-- Top Header -->
      <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-3">
          <!-- Mobile Menu Toggle -->
          <button
            @click="isMobileMenuOpen = !isMobileMenuOpen"
            class="p-2 rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden focus:outline-none"
          >
            <Icon name="heroicons:bars-3" class="w-6 h-6" />
          </button>
          
          <h1 class="text-md md:text-lg font-black text-slate-800 tracking-tight">{{ pageTitle }}</h1>
        </div>

        <div class="flex items-center gap-3">
          <!-- Layar Kasir Shortcut -->
          <NuxtLink
            to="/pos"
            class="text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 border border-slate-200"
          >
            <Icon name="heroicons:shopping-cart" class="w-4 h-4 text-slate-500" />
            <span class="hidden sm:inline">Layar Kasir</span>
          </NuxtLink>

          <!-- Profile -->
          <ProfileDropdown variant="light" />
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-grow p-4 md:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 4px;
}
.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}
.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgb(51 65 85 / 0.5);
  border-radius: 9999px;
}
.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgb(71 85 105 / 0.7);
}
</style>