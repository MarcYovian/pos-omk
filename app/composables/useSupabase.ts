// composables/useSupabase.ts
import type { Database } from '~/types/database.types'

const STORAGE_KEY = 'omk_active_company_id'

export const useSupabase = () => {
  const client = useSupabaseClient<Database>()

  // Sinkronkan header X-Company-Id dari localStorage bila di browser
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const activeCompanyId = localStorage.getItem(STORAGE_KEY)
      if (activeCompanyId && (client as any)?.rest?.headers) {
        if (typeof (client as any).rest.headers.set === 'function') {
          (client as any).rest.headers.set('X-Company-Id', activeCompanyId)
        } else {
          (client as any).rest.headers['X-Company-Id'] = activeCompanyId
        }
      }
    } catch {
      // Abaikan jika localStorage tidak dapat diakses
    }
  }

  return client
}
