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

const navItems = [
  { name: 'Ikhtisar', path: '/admin', icon: 'heroicons:squares-2x2' },
  { name: 'Master Data UMKM', path: '/admin/umkm', icon: 'heroicons:building-storefront' },
  { name: 'Setup Katalog', path: '/admin/setup', icon: 'heroicons:cog-8-tooth' },
  { name: 'Finansial Sesi', path: '/admin/dashboard', icon: 'heroicons:chart-bar', requiresSession: true },
  { name: 'Rekonsiliasi Stok', path: '/admin/reconciliation', icon: 'heroicons:clipboard-document-check', requiresSession: true },
  { name: 'Laporan WhatsApp', path: '/admin/reports', icon: 'heroicons:chat-bubble-bottom-center-text', requiresClosedSession: true },
  { name: 'Riwayat Sesi', path: '/admin/history', icon: 'heroicons:archive-box' },
  { name: 'Analitik Sesi', path: '/admin/analytics', icon: 'heroicons:presentation-chart-line' },
  { name: 'Kelola Pengguna', path: '/admin/users', icon: 'heroicons:users' }
]

const filteredNavItems = computed(() => {
  return navItems.map(item => {
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
    <aside class="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0 sticky top-0 h-screen">
      <!-- Logo / Header -->
      <div class="p-6 border-b border-slate-800 flex items-center gap-3">
        <div class="h-9 w-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-md">
          <Icon name="heroicons:shield-check" class="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 class="text-sm font-black text-white tracking-tight uppercase leading-none">OMK POS Admin</h2>
          <span class="text-[9px] text-slate-400 font-mono tracking-wider">PANEL PENGELOLA</span>
        </div>
      </div>

      <!-- Session Status Widget -->
      <div class="p-4 mx-4 my-5 bg-slate-800/50 rounded-2xl border border-slate-800 flex flex-col gap-2">
        <span class="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Status Sesi Hari Ini</span>
        <div class="flex items-center gap-2">
          <span v-if="sessionStore.isOpen" class="inline-flex items-center gap-1.5 text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/25">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            AKTIF
          </span>
          <span v-else-if="sessionStore.isClosed" class="inline-flex items-center gap-1.5 text-[10px] font-black bg-rose-500/20 text-rose-400 px-2.5 py-0.5 rounded-full border border-rose-500/25">
            <span class="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
            SELESAI
          </span>
          <span v-else class="inline-flex items-center gap-1.5 text-[10px] font-black bg-slate-500/30 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-700">
            BELUM DIBUAT
          </span>
        </div>
        <div class="text-[10px] font-mono text-slate-400 flex items-center gap-1 mt-0.5">
          <Icon name="heroicons:calendar" class="w-3.5 h-3.5 text-slate-500" />
          <span>{{ useSessionDate().formattedToday.value }}</span>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="flex-grow px-3 space-y-1.5">
        <template v-for="item in filteredNavItems" :key="item.path">
          <NuxtLink
            v-if="!item.isDisabled"
            :to="item.path"
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group"
            :class="[
              currentPath === item.path
                ? 'bg-brand-600 text-white shadow-md shadow-brand-650/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            ]"
          >
            <Icon
              :name="item.icon"
              class="w-5 h-5 shrink-0"
              :class="[
                currentPath === item.path ? 'text-white' : 'text-slate-500 group-hover:text-slate-355'
              ]"
            />
            <span>{{ item.name }}</span>
          </NuxtLink>

          <!-- Disabled nav item with tooltip indication -->
          <div
            v-else
            class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 cursor-not-allowed select-none bg-slate-950/20"
            :title="item.tooltip"
          >
            <Icon :name="item.icon" class="w-5 h-5 shrink-0 text-slate-700" />
            <span>{{ item.name }}</span>
            <span class="ml-auto text-[8px] font-bold bg-slate-850 px-1.5 py-0.5 rounded uppercase tracking-wider text-slate-500 border border-slate-800">
              Kunci
            </span>
          </div>
        </template>
      </nav>

      <!-- Footer User Info -->
      <div class="p-4 border-t border-slate-800 flex items-center gap-3 bg-slate-950/20">
        <div class="min-w-0 flex-grow">
          <p class="text-xs font-bold text-slate-200 truncate">{{ authStore.user?.email }}</p>
          <p class="text-[9px] text-slate-500 font-mono uppercase tracking-wider">Admin Logged In</p>
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
        class="w-64 bg-slate-900 text-slate-200 flex flex-col h-full shadow-2xl"
        @click.stop
      >
        <!-- Logo / Header -->
        <div class="p-5 border-b border-slate-800 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Icon name="heroicons:shield-check" class="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 class="text-xs font-black text-white uppercase leading-none">OMK POS</h2>
              <span class="text-[8px] text-slate-450 font-mono">ADMIN PANEL</span>
            </div>
          </div>
          <button @click="closeMobileMenu" class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <Icon name="heroicons:x-mark" class="w-5 h-5" />
          </button>
        </div>

        <!-- Mobile Session Widget -->
        <div class="p-4 mx-4 my-4 bg-slate-800/40 rounded-xl border border-slate-800/50 flex flex-col gap-1.5">
          <span class="text-[8px] text-slate-450 font-bold uppercase tracking-wider font-mono">Sesi Hari Ini</span>
          <div class="flex items-center gap-2">
            <span v-if="sessionStore.isOpen" class="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/25">
              AKTIF
            </span>
            <span v-else-if="sessionStore.isClosed" class="inline-flex items-center gap-1 text-[9px] font-black bg-rose-500/20 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/25">
              SELESAI
            </span>
            <span v-else class="inline-flex items-center gap-1 text-[9px] font-black bg-slate-505/20 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
              KOSONG
            </span>
          </div>
        </div>

        <!-- Navigation Links -->
        <nav class="flex-grow px-3 space-y-1">
          <template v-for="item in filteredNavItems" :key="item.path">
            <NuxtLink
              v-if="!item.isDisabled"
              :to="item.path"
              @click="closeMobileMenu"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              :class="[
                currentPath === item.path ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              ]"
            >
              <Icon :name="item.icon" class="w-5 h-5 shrink-0" />
              <span>{{ item.name }}</span>
            </NuxtLink>
            <div
              v-else
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-600 cursor-not-allowed select-none bg-slate-950/10"
            >
              <Icon :name="item.icon" class="w-5 h-5 shrink-0 text-slate-700" />
              <span>{{ item.name }}</span>
            </div>
          </template>
        </nav>

        <div class="p-4 border-t border-slate-800 bg-slate-950/20">
          <p class="text-xs font-bold text-slate-300 truncate">{{ authStore.user?.email }}</p>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-grow flex flex-col min-w-0 h-screen overflow-y-auto">
      <!-- Top Header -->
      <header class="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between backdrop-blur-md bg-opacity-95 shadow-sm">
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
      <main class="flex-grow p-4 md:p-6 overflow-y-auto">
        <slot />
      </main>
    </div>
  </div>
</template>
