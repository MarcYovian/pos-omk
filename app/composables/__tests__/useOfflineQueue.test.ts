import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStore = {
  put: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
}

vi.mock('idb', () => ({
  openDB: vi.fn(() => mockStore),
}))

const PendingTransactionStatus = {
  PENDING: 'pending',
  SYNCED: 'synced',
  FAILED: 'failed',
} as const

interface PendingTransaction {
  id: string
  timestamp: string
  status: string
  error_message?: string
}

import { useOfflineQueue } from '~/composables/useOfflineQueue'

const makeTransaction = (overrides: Partial<PendingTransaction> = {}): any => ({
  id: 'tx-1',
  timestamp: '2025-06-15T08:00:00Z',
  session_id: 'session-1',
  cashier_id: 'cashier-1',
  nominal_diterima: 50000,
  cart_items: [
    { product_id: 'p1', nama_produk: 'Kue', harga_jual: 10000, qty: 2, subtotal: 20000, stok_sekarang: 10, hasStockWarning: false },
  ],
  ...overrides,
})

describe('useOfflineQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('enqueues a transaction with pending status', async () => {
    const { enqueue } = useOfflineQueue()
    const tx = makeTransaction()
    await enqueue(tx)
    expect(mockStore.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ id: 'tx-1', status: 'pending' }),
    )
  })

  it('gets pending transactions sorted by timestamp', async () => {
    mockStore.getAll.mockResolvedValue([
      makeTransaction({ id: '1', timestamp: '2025-06-15T10:00:00Z', status: 'pending' }),
      makeTransaction({ id: '2', timestamp: '2025-06-15T08:00:00Z', status: 'pending' }),
      makeTransaction({ id: '3', timestamp: '2025-06-15T09:00:00Z', status: 'synced' }),
    ])

    const { getPending } = useOfflineQueue()
    const pending = await getPending()
    expect(pending).toHaveLength(2)
    expect(pending[0].id).toBe('2')
    expect(pending[1].id).toBe('1')
  })

  it('returns empty array when no pending transactions', async () => {
    mockStore.getAll.mockResolvedValue([])
    const { getPending } = useOfflineQueue()
    const pending = await getPending()
    expect(pending).toHaveLength(0)
  })

  it('marks a transaction as synced', async () => {
    mockStore.get.mockResolvedValue(makeTransaction({ status: 'pending' }))
    const { markSynced } = useOfflineQueue()
    await markSynced('tx-1')
    expect(mockStore.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ id: 'tx-1', status: 'synced' }),
    )
  })

  it('marks a transaction as failed with error message', async () => {
    mockStore.get.mockResolvedValue(makeTransaction({ status: 'pending' }))
    const { markFailed } = useOfflineQueue()
    await markFailed('tx-1', 'Network error')
    expect(mockStore.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ id: 'tx-1', status: 'failed', error_message: 'Network error' }),
    )
  })

  it('does not throw when marking non-existent transaction', async () => {
    mockStore.get.mockResolvedValue(undefined)
    const { markSynced, markFailed } = useOfflineQueue()
    await expect(markSynced('unknown')).resolves.toBeUndefined()
    await expect(markFailed('unknown', 'error')).resolves.toBeUndefined()
    expect(mockStore.put).not.toHaveBeenCalled()
  })
})
