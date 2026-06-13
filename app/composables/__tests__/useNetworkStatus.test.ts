import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetPending = vi.fn()
const mockMarkSynced = vi.fn()
const mockMarkFailed = vi.fn()
const mockSubmitTransaction = vi.fn()
const mockAddToast = vi.fn()

vi.stubGlobal('useToast', () => ({ addToast: mockAddToast, toasts: { value: [] }, removeToast: vi.fn() }))

vi.mock('~/composables/useOfflineQueue', () => ({
  useOfflineQueue: () => ({
    getPending: mockGetPending,
    markSynced: mockMarkSynced,
    markFailed: mockMarkFailed,
  }),
}))

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
    toasts: { value: [] },
    removeToast: vi.fn(),
  }),
}))

vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useSupabaseUser', () => ({ value: null }))

vi.mock('~/stores/cart', () => ({
  useCartStore: () => ({ submitTransaction: mockSubmitTransaction }),
}))

let onlineListeners: Array<() => Promise<void>> = []
let offlineListeners: Array<() => void> = []

vi.stubGlobal('window', {
  addEventListener: (event: string, handler: any) => {
    if (event === 'online') onlineListeners.push(handler)
    if (event === 'offline') offlineListeners.push(handler)
  },
})

import { useNetworkStatus } from '~/composables/useNetworkStatus'

describe('useNetworkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    onlineListeners = []
    offlineListeners = []
  })

  it('returns isOnline based on navigator.onLine', () => {
    vi.stubGlobal('navigator', { onLine: true })
    const { isOnline } = useNetworkStatus()
    expect(isOnline.value).toBe(true)
  })

  it('detects offline state', () => {
    vi.stubGlobal('navigator', { onLine: false })
    const { isOnline } = useNetworkStatus()
    expect(isOnline.value).toBe(false)
  })

  it('syncs pending transactions when coming online', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    const pendingTx = { id: 'tx-1', session_id: 's1', cashier_id: 'c1', nominal_diterima: 50000, cart_items: [] }
    mockGetPending.mockResolvedValue([pendingTx])
    mockSubmitTransaction.mockResolvedValue({ success: true })

    useNetworkStatus()
    await onlineListeners[0]()

    expect(mockSubmitTransaction).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 's1',
      cashierId: 'c1',
    }))
    expect(mockMarkSynced).toHaveBeenCalledWith('tx-1')
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    )
  })

  it('marks transaction as failed on sync error', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    const pendingTx = { id: 'tx-2', session_id: 's1', cashier_id: 'c1', nominal_diterima: 30000, cart_items: [] }
    mockGetPending.mockResolvedValue([pendingTx])
    mockSubmitTransaction.mockRejectedValue(new Error('RPC error'))

    useNetworkStatus()
    await onlineListeners[0]()

    expect(mockMarkFailed).toHaveBeenCalledWith('tx-2', 'RPC error')
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'warning' }),
    )
  })

  it('does not sync when no pending transactions', async () => {
    vi.stubGlobal('navigator', { onLine: true })
    mockGetPending.mockResolvedValue([])

    useNetworkStatus()
    await onlineListeners[0]()

    expect(mockSubmitTransaction).not.toHaveBeenCalled()
    expect(mockAddToast).not.toHaveBeenCalled()
  })

  it('registers offline event listener', () => {
    vi.stubGlobal('navigator', { onLine: true })
    useNetworkStatus()
    expect(offlineListeners).toHaveLength(1)
  })
})
