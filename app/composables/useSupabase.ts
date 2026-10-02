// composables/useSupabase.ts
import type { Database } from '~/types/database.types'

export const useSupabase = () => {
  const client = useSupabaseClient<Database>()

  // Sinkronkan header X-Company-Id bila store telah aktif
  try {
    const companyStore = useCompanyStore()
    if (companyStore?.activeCompanyId && (client as any)?.rest?.headers) {
      if (typeof (client as any).rest.headers.set === 'function') {
        (client as any).rest.headers.set('X-Company-Id', companyStore.activeCompanyId)
      } else {
        (client as any).rest.headers['X-Company-Id'] = companyStore.activeCompanyId
      }
    }
  } catch {
    // Abaikan jika Pinia belum aktif atau store belum diinisialisasi
  }

  return client
}
