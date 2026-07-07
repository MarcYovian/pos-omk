// stores/payment.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface UmkmPaymentSummary {
  umkm_id: string
  nama_umkm: string
  total_terutang: number
}

interface UmkmPaymentHistory {
  id: string
  umkm_id: string
  amount: number
  status: 'pending' | 'paid'
  paid_at: string | null
  recorded_by: string | null
  notes: string | null
  created_at: string
  nama_umkm?: string
}

export const usePaymentStore = defineStore('payment', () => {
  const summaries = ref<UmkmPaymentSummary[]>([])
  const history = ref<UmkmPaymentHistory[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const totalTerutang = computed(() => summaries.value.reduce((sum, s) => sum + Number(s.total_terutang), 0))

  const fetchSummary = async () => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await (supabase as any).rpc('get_umkm_payment_summary')

      if (fetchError) throw fetchError

      summaries.value = (data as UmkmPaymentSummary[]) || []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const fetchHistory = async () => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await (supabase as any).rpc('get_umkm_payment_history_all')

      if (fetchError) throw fetchError

      history.value = (data as UmkmPaymentHistory[]) || []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const markAsPaid = async (umkmId: string, amount: number, notes?: string) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: insertError } = await (supabase as any).rpc('mark_umkm_as_paid', {
        p_umkm_id: umkmId,
        p_amount: amount,
        p_notes: notes || null,
        p_recorded_by: null
      })

      if (insertError) throw insertError

      return data?.[0] || null
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    summaries,
    history,
    isLoading,
    error,
    totalTerutang,
    fetchSummary,
    fetchHistory,
    markAsPaid
  }
})