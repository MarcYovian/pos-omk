// stores/cashFlow.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface CashFlowSummary {
  total_income: number
  total_expense: number
  saldo: number
}

interface CashFlowItem {
  id: string
  type: 'income' | 'expense'
  source: 'transaction' | 'manual'
  amount: number
  description: string | null
  session_id: string | null
  recorded_by: string | null
  created_at: string
  session_date: string | null
}

export const useCashFlowStore = defineStore('cashFlow', () => {
  const summary = ref<CashFlowSummary>({
    total_income: 0,
    total_expense: 0,
    saldo: 0
  })
  const items = ref<CashFlowItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const totalCount = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)

  const saldo = computed(() => summary.value.saldo)
  const totalIncome = computed(() => summary.value.total_income)
  const totalExpense = computed(() => summary.value.total_expense)
  const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))

  const fetchSummary = async (startDate?: string, endDate?: string) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await (supabase as any).rpc('get_cash_flow_summary', {
        p_start_date: startDate || null,
        p_end_date: endDate || null
      })

      if (fetchError) throw fetchError

      if (data && data.length > 0) {
        summary.value = {
          total_income: Number(data[0].total_income) || 0,
          total_expense: Number(data[0].total_expense) || 0,
          saldo: Number(data[0].saldo) || 0
        }
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const fetchList = async (startDate?: string, endDate?: string, page: number = 1) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    currentPage.value = page

    try {
      const offset = (page - 1) * pageSize.value

      const [listResult, countResult] = await Promise.all([
        (supabase as any).rpc('get_cash_flow_list', {
          p_start_date: startDate || null,
          p_end_date: endDate || null,
          p_limit: pageSize.value,
          p_offset: offset
        }),
        (supabase as any).rpc('get_cash_flow_count', {
          p_start_date: startDate || null,
          p_end_date: endDate || null
        })
      ])

      if (listResult.error) throw listResult.error
      if (countResult.error) throw countResult.error

      items.value = (listResult.data as CashFlowItem[]) || []
      totalCount.value = countResult.data?.[0]?.total_count || 0
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const addCashFlow = async (
    type: 'income' | 'expense',
    amount: number,
    description: string,
    sessionId?: string
  ) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: insertError } = await (supabase as any).rpc('add_cash_flow', {
        p_type: type,
        p_amount: amount,
        p_description: description,
        p_session_id: sessionId || null,
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
    summary,
    items,
    isLoading,
    error,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    saldo,
    totalIncome,
    totalExpense,
    fetchSummary,
    fetchList,
    addCashFlow
  }
})