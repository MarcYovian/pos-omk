// app/stores/company.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Company, UserCompanyMembership } from '~/types/app'
import { useAuthStore } from '~/stores/auth'
import { useSessionStore } from '~/stores/session'
import { useProductStore } from '~/stores/products'
import { useUmkmStore } from '~/stores/umkm'
import { useApi } from '~/composables/useApi'
import { useSupabase } from '~/composables/useSupabase'

const STORAGE_KEY = 'omk_active_company_id'

export const useCompanyStore = defineStore('company', () => {
  // State
  const activeCompanyId = ref<string | null>(null)
  const availableCompanies = ref<UserCompanyMembership[]>([])
  const activeCompanyDetail = ref<Company | null>(null)
  const isLoading = ref<boolean>(false)
  const error = ref<string | null>(null)

  // Getters
  const activeCompany = computed<UserCompanyMembership | null>(() => {
    if (!activeCompanyId.value) return null
    return availableCompanies.value.find(c => c.company_id === activeCompanyId.value) || null
  })

  const currentRole = computed<string>(() => {
    return activeCompany.value?.role || 'cashier'
  })

  const hasMultipleCompanies = computed<boolean>(() => {
    return availableCompanies.value.length > 1
  })

  const isSuperAdminTenant = computed<boolean>(() => {
    return activeCompany.value?.role === 'super_admin' || (activeCompany.value?.role === 'admin' && activeCompany.value?.company_slug === 'platform')
  })

  // Actions
  /**
   * Mengambil daftar organisasi yang dapat diakses pengguna
   */
  const fetchMyCompanies = async (): Promise<UserCompanyMembership[]> => {
    const { apiFetch } = useApi()
    isLoading.value = true
    error.value = null
    try {
      const data = await apiFetch<any[]>('/api/companies/my-companies')
      const mapped: UserCompanyMembership[] = (data || []).map((item: any) => ({
        company_id: item.company_id || item.id,
        company_name: item.company_name || item.name,
        company_slug: item.company_slug || item.slug,
        company_code: item.company_code || item.slug?.toUpperCase() || 'OMK',
        logo_url: item.logo_url || null,
        role: item.role || item.role_code || 'cashier',
        role_name: item.role_name || (item.role_code === 'admin' ? 'Administrator' : 'Kasir'),
        is_default: !!item.is_default,
        is_active: item.is_active !== false,
      }))

      availableCompanies.value = mapped
      return mapped
    } catch (e: any) {
      error.value = e?.message || 'Gagal memuat daftar organisasi'
      availableCompanies.value = []
      return []
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Mengambil detail profil paroki aktif (logo, alamat, kontak, receipt_footer)
   */
  const fetchActiveCompanyDetail = async (): Promise<void> => {
    if (!activeCompanyId.value) return
    const { apiFetch } = useApi()
    try {
      const data = await apiFetch<Company>('/api/companies/active')
      activeCompanyDetail.value = data
    } catch (e: any) {
      console.warn('Gagal memuat detail profil organisasi aktif:', e)
    }
  }

  /**
   * Mengatur dan menyinkronkan organisasi aktif
   */
  const setActiveCompany = async (companyId: string, refreshStores: boolean = true): Promise<void> => {
    const target = availableCompanies.value.find(c => c.company_id === companyId)
    if (!target) {
      throw new Error('Anda tidak memiliki akses ke organisasi yang dipilih')
    }

    activeCompanyId.value = companyId
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem(STORAGE_KEY, companyId)
      } catch {
        // ignore localStorage access error
      }
    }

    // Injeksi header ke client Supabase
    try {
      const supabase = useSupabase()
      if ((supabase as any)?.rest?.headers) {
        if (typeof (supabase as any).rest.headers.set === 'function') {
          (supabase as any).rest.headers.set('X-Company-Id', companyId)
        } else {
          (supabase as any).rest.headers['X-Company-Id'] = companyId
        }
      }
    } catch {
      // ignore
    }

    await fetchActiveCompanyDetail()

    // Refresh store terkait jika diminta
    if (refreshStores) {
      try {
        const authStore = useAuthStore()
        const sessionStore = useSessionStore()
        const productStore = useProductStore()
        const umkmStore = useUmkmStore()

        await Promise.allSettled([
          authStore.fetchUserPermissions(true),
          sessionStore.fetchTodaySession(),
          productStore.fetchTodayProducts(),
          umkmStore.fetchAll(true),
        ])
      } catch (err) {
        console.warn('Gagal me-refresh store setelah pergantian organisasi:', err)
      }
    }
  }

  /**
   * Switcher Helper dengan UI Feedback
   */
  const switchCompany = async (companyId: string): Promise<void> => {
    if (companyId === activeCompanyId.value) return
    isLoading.value = true
    try {
      await setActiveCompany(companyId, true)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Inisialisasi awal saat login atau reload browser
   */
  const initialize = async (): Promise<void> => {
    await fetchMyCompanies()
    if (availableCompanies.value.length === 0) {
      activeCompanyId.value = null
      return
    }

    let targetId: string | null = null
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        targetId = localStorage.getItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    }

    // Jika target tersimpan valid di keanggotaan pengguna
    if (targetId && availableCompanies.value.some(c => c.company_id === targetId)) {
      await setActiveCompany(targetId, false)
    } else {
      // Fallback ke default atau company pertama
      const defaultCompany = availableCompanies.value.find(c => c.is_default)
      const firstCompanyId = defaultCompany ? defaultCompany.company_id : availableCompanies.value[0].company_id
      await setActiveCompany(firstCompanyId, false)
    }
  }

  const reset = () => {
    activeCompanyId.value = null
    availableCompanies.value = []
    activeCompanyDetail.value = null
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch {
        // ignore
      }
    }
  }

  return {
    activeCompanyId,
    availableCompanies,
    activeCompanyDetail,
    isLoading,
    error,
    activeCompany,
    currentRole,
    hasMultipleCompanies,
    isSuperAdminTenant,
    fetchMyCompanies,
    fetchActiveCompanyDetail,
    setActiveCompany,
    switchCompany,
    initialize,
    reset,
  }
})
