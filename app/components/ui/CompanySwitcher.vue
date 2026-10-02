<!-- app/components/ui/CompanySwitcher.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useCompanyStore } from '~/stores/company'
import { useToast } from '~/composables/useToast'

const props = withDefaults(defineProps<{
  variant?: 'sidebar' | 'topbar' | 'mobile'
}>(), {
  variant: 'sidebar'
})

const companyStore = useCompanyStore()
const { addToast } = useToast()
const isOpen = ref(false)

const currentCompany = computed(() => companyStore.activeCompany)
const companies = computed(() => companyStore.availableCompanies)

const toggleDropdown = () => {
  if (!companyStore.hasMultipleCompanies) return
  isOpen.value = !isOpen.value
}

const selectCompany = async (companyId: string) => {
  if (companyId === companyStore.activeCompanyId) {
    isOpen.value = false
    return
  }

  try {
    await companyStore.switchCompany(companyId)
    addToast({
      type: 'success',
      message: `Beralih ke ${companyStore.activeCompany?.company_name}`
    })
  } catch (err: any) {
    addToast({
      type: 'danger',
      message: err?.message || 'Gagal beralih organisasi'
    })
  } finally {
    isOpen.value = false
  }
}

const handleClickOutside = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (isOpen.value && !target.closest('[data-company-switcher]')) {
    isOpen.value = false
  }
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', handleClickOutside)
  }
})

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleClickOutside)
  }
})
</script>

<template>
  <div data-company-switcher class="relative w-full">
    <!-- Single Company Badge (Jika hanya punya akses 1 paroki) -->
    <div
      v-if="!companyStore.hasMultipleCompanies"
      class="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/60 text-slate-200"
    >
      <div class="h-7 w-7 rounded-lg bg-brand-600/30 text-brand-400 border border-brand-500/30 flex items-center justify-center shrink-0">
        <Icon name="heroicons:building-library" class="w-4 h-4" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-xs font-bold text-white truncate">{{ currentCompany?.company_name || 'Memuat Paroki...' }}</p>
        <p class="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{{ currentCompany?.company_code || 'OMK' }}</p>
      </div>
    </div>

    <!-- Multi-Company Switcher Trigger Button -->
    <button
      v-else
      type="button"
      @click.stop="toggleDropdown"
      class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-left transition-all duration-150 group border cursor-pointer"
      :class="[
        isOpen
          ? 'bg-slate-800 border-brand-500 ring-2 ring-brand-500/20 text-white'
          : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/70 text-slate-200'
      ]"
      :title="`Klik untuk beralih organisasi (Aktif: ${currentCompany?.company_name})`"
    >
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <div class="h-7 w-7 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-sm">
          <Icon name="heroicons:building-library" class="w-4 h-4" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-bold text-white truncate group-hover:text-brand-300 transition-colors">
            {{ currentCompany?.company_name || 'Pilih Organisasi' }}
          </p>
          <div class="flex items-center gap-1.5">
            <span class="text-[9px] font-mono text-brand-400 uppercase font-semibold">
              {{ currentCompany?.company_code }}
            </span>
            <span class="text-[9px] text-slate-500">•</span>
            <span class="text-[9px] text-slate-400 uppercase">
              {{ currentCompany?.role }}
            </span>
          </div>
        </div>
      </div>

      <Icon
        name="heroicons:chevron-up-down"
        class="w-4 h-4 text-slate-400 group-hover:text-white shrink-0 transition-transform duration-200"
        :class="{ 'rotate-180 text-brand-400': isOpen }"
      />
    </button>

    <!-- Dropdown Menu -->
    <div
      v-if="isOpen"
      class="absolute left-0 right-0 mt-2 z-50 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl py-2 max-h-72 overflow-y-auto divide-y divide-slate-800/80 backdrop-blur-md"
      @click.stop
    >
      <div class="px-3 py-1.5 text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
        PILIH PAROKI / ORGANISASI
      </div>

      <div class="py-1">
        <button
          v-for="item in companies"
          :key="item.company_id"
          type="button"
          @click="selectCompany(item.company_id)"
          class="w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors duration-150 group cursor-pointer"
          :class="[
            item.company_id === companyStore.activeCompanyId
              ? 'bg-brand-600/20 text-white'
              : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
          ]"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold truncate">{{ item.company_name }}</span>
              <span
                v-if="item.company_id === companyStore.activeCompanyId"
                class="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0"
              />
            </div>
            <div class="flex items-center gap-1.5 mt-0.5">
              <span class="text-[9px] font-mono text-slate-400 uppercase">{{ item.company_code }}</span>
              <span class="text-[9px] text-slate-600">•</span>
              <span class="text-[9px] text-slate-400 capitalize font-medium">{{ item.role }}</span>
            </div>
          </div>

          <Icon
            v-if="item.company_id === companyStore.activeCompanyId"
            name="heroicons:check"
            class="w-4 h-4 text-emerald-400 shrink-0"
          />
        </button>
      </div>

      <!-- Super Admin Tag -->
      <div v-if="companyStore.isSuperAdminTenant" class="px-3 py-1.5 bg-slate-950/40">
        <p class="text-[8px] text-amber-400 font-mono flex items-center gap-1">
          <Icon name="heroicons:shield-check" class="w-3 h-3" />
          Platform Super Admin Mode
        </p>
      </div>
    </div>
  </div>
</template>
