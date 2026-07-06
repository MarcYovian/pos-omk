import { setActivePinia, createPinia } from 'pinia'
import { useHistoryStore } from '~/stores/history'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const createQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis()
})

const mockFrom = vi.fn()

vi.stubGlobal('useSupabase', () => ({
  from: mockFrom
}))

describe('useHistoryStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('has default state', () => {
    const store = useHistoryStore()
    expect(store.historyList).toEqual([])
    expect(store.productsCache).toEqual({})
    expect(store.transactionsCache).toEqual({})
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetches history successfully', async () => {
    const mockData = [{ session_date: '2026-07-06', gross_revenue: 1000 }]
    const builder = createQueryBuilder()
    mockFrom.mockReturnValue(builder)
    
    // Simulate Supabase response
    builder.order.mockResolvedValue({
      data: mockData,
      error: null
    })

    const store = useHistoryStore()
    await store.fetchHistory()

    expect(mockFrom).toHaveBeenCalledWith('session_history_summary')
    expect(store.historyList).toEqual(mockData)
    expect(store.isLoading).toBe(false)
  })

  it('skips fetch when cache exists and force is false', async () => {
    const store = useHistoryStore()
    store.historyList = [{ session_date: '2026-07-06' }]

    await store.fetchHistory()

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('forces fetch when force is true', async () => {
    const store = useHistoryStore()
    store.historyList = [{ session_date: '2026-07-06' }]

    const builder = createQueryBuilder()
    mockFrom.mockReturnValue(builder)
    builder.order.mockResolvedValue({
      data: [{ session_date: '2026-07-07' }],
      error: null
    })

    await store.fetchHistory(true)

    expect(mockFrom).toHaveBeenCalled()
    expect(store.historyList).toEqual([{ session_date: '2026-07-07' }])
  })

  it('clears cache successfully', () => {
    const store = useHistoryStore()
    store.historyList = [{ session_date: '2026-07-06' }]
    store.productsCache = { '2026-07-06': [] }
    store.transactionsCache = { 'tx-1': [] }

    store.clearCache()

    expect(store.historyList).toEqual([])
    expect(store.productsCache).toEqual({})
    expect(store.transactionsCache).toEqual({})
  })
})
