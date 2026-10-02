// composables/useApi.ts
import { useCompanyStore } from '~/stores/company'

const STORAGE_KEY = 'omk_active_company_id'

export const useApi = () => {
  const supabase = useSupabase()

  const apiFetch = async <T>(url: string, opts: any = {}): Promise<T> => {
    let headers: Record<string, string> = {
      ...(opts.headers || {})
    }

    try {
      const { data } = await supabase.auth.getSession()
      if (data?.session?.access_token) {
        headers['Authorization'] = `Bearer ${data.session.access_token}`
      }
    } catch {
      // ignore
    }

    try {
      let activeCompanyId: string | null = null
      if (typeof window !== 'undefined' && window.localStorage) {
        activeCompanyId = localStorage.getItem(STORAGE_KEY)
      }
      if (!activeCompanyId && typeof useCompanyStore === 'function') {
        const companyStore = useCompanyStore()
        activeCompanyId = companyStore?.activeCompanyId || null
      }
      if (activeCompanyId) {
        headers['X-Company-Id'] = activeCompanyId
      }
    } catch {
      // ignore when Pinia is not active or companyStore unavailable
    }

    return $fetch<T>(url, {
      ...opts,
      headers
    })
  }

  return {
    apiFetch
  }
}
