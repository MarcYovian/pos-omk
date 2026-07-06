import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useHistoryStore = defineStore('history', () => {
  const historyList = ref<any[]>([])
  const productsCache = ref<Record<string, any[]>>({})
  const transactionsCache = ref<Record<string, any[]>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchHistory = async (force = false) => {
    if (historyList.value.length > 0 && !force) return

    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('session_history_summary' as any)
        .select('*')
        .order('session_date', { ascending: false })

      if (fetchError) throw fetchError
      historyList.value = data || []
    } catch (e: any) {
      error.value = e.message || 'Gagal memuat riwayat'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const clearCache = () => {
    historyList.value = []
    productsCache.value = {}
    transactionsCache.value = {}
  }

  return {
    historyList,
    productsCache,
    transactionsCache,
    isLoading,
    error,
    fetchHistory,
    clearCache
  }
})
