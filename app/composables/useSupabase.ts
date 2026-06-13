// composables/useSupabase.ts
import type { Database } from '~/types/database.types'

export const useSupabase = () => {
  const client = useSupabaseClient<Database>()
  return client
}
