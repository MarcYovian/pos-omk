// composables/useApi.ts
import { useCompanyStore } from '~/stores/company'

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
      const companyStore = useCompanyStore()
      if (companyStore?.activeCompanyId) {
        headers['X-Company-Id'] = companyStore.activeCompanyId
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
