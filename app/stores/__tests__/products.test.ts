import { setActivePinia, createPinia } from 'pinia'
import { useProductStore } from '~/stores/products'
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { useSessionStore } from '~/stores/session'
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.stubGlobal('getTodayJakarta', () => '2025-06-15')
vi.stubGlobal('formatIDR', (val: number) => `Rp ${val}`)
vi.stubGlobal('useCurrencyFormat', (val: number) => `Rp ${val}`)
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useToast', () => ({ addToast: vi.fn() }))
vi.stubGlobal('useOfflineQueue', () => ({ enqueue: vi.fn() }))
vi.stubGlobal('useNetworkStatus', () => ({ isOnline: { value: true } }))
const mockCartStore = { updateStockWarning: vi.fn() }
vi.stubGlobal('useCartStore', () => mockCartStore)
vi.stubGlobal('useSupabaseUser', () => ({ value: null }))
vi.stubGlobal('useSessionDate', () => ({ todayDate: { value: '2025-06-15' } }))

const createQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
})

const mockChannelOn = vi.fn().mockReturnThis()
const mockChannelSubscribe = vi.fn().mockReturnThis()
const mockRemoveChannel = vi.fn()
const mockFrom = vi.fn()
const mockChannel = vi.fn(() => ({
  on: mockChannelOn,
  subscribe: mockChannelSubscribe,
}))

vi.stubGlobal('useSupabase', () => ({
  from: mockFrom,
  channel: mockChannel,
  removeChannel: mockRemoveChannel,
}))

const makeSessionProduct = (overrides: any = {}): any => ({
  id: 'sp-1',
  session_id: 'session-1',
  master_product_id: 'mp-1',
  nama_produk: 'Kue Nastar',
  harga_asli: 8000,
  harga_jual: 10000,
  stok_awal: 10,
  stok_sekarang: 10,
  is_active: true,
  umkm_id: 'umkm-1',
  created_at: '2025-06-15T08:00:00Z',
  ...overrides,
})

describe('useProductStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    // Stub session store to return a session ID
    const sessionStore = useSessionStore()
    sessionStore.currentSession = {
      id: 'session-1',
      session_date: '2025-06-15',
      status: 'open',
      opened_by: null,
      closed_by: null,
      opened_at: '2025-06-15T08:00:00Z',
      closed_at: null,
      notes: null,
      created_at: '2025-06-15T08:00:00Z',
    }
  })

  it('has default state', () => {
    const store = useProductStore()
    expect(store.products).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('activeProducts', () => {
    it('returns only active and in-stock products', () => {
      const store = useProductStore()
      store.products = [
        makeSessionProduct({ id: '1', is_active: true, stok_sekarang: 5 }),
        makeSessionProduct({ id: '2', is_active: false, stok_sekarang: 5 }),
        makeSessionProduct({ id: '3', is_active: true, stok_sekarang: 0 }),
        makeSessionProduct({ id: '4', is_active: true, stok_sekarang: 3 }),
      ]

      expect(store.activeProducts).toHaveLength(2)
      expect(store.activeProducts.map((p: any) => p.id)).toEqual(['1', '4'])
    })

    it('returns empty array when no products match', () => {
      const store = useProductStore()
      store.products = [
        makeSessionProduct({ is_active: false }),
      ]
      expect(store.activeProducts).toHaveLength(0)
    })
  })

  describe('getByUmkm', () => {
    it('filters products by umkm_id', () => {
      const store = useProductStore()
      store.products = [
        makeSessionProduct({ id: '1', umkm_id: 'umkm-1' }),
        makeSessionProduct({ id: '2', umkm_id: 'umkm-2' }),
        makeSessionProduct({ id: '3', umkm_id: 'umkm-1' }),
      ]

      const result = store.getByUmkm('umkm-1')
      expect(result).toHaveLength(2)
      expect(result.map((p: any) => p.id)).toEqual(['1', '3'])
    })
  })

  describe('fetchTodayProducts', () => {
    it('fetches session_products with master_product join when role is admin', async () => {
      const authStore = useAuthStore()
      authStore.role = 'admin'

      const qb = createQueryBuilder()
      const rawData = [{
        id: 'sp-1',
        session_id: 'session-1',
        master_product_id: 'mp-1',
        harga_jual: 10000,
        stok_awal: 10,
        stok_sekarang: 10,
        is_active: true,
        created_at: '2025-06-15T08:00:00Z',
        master_product: {
          nama_produk: 'Kue Nastar',
          harga_asli: 8000,
          umkm_id: 'umkm-1',
          umkm: { nama_umkm: 'Ibu Sari' },
        },
      }]
      qb.eq.mockResolvedValue({ data: rawData, error: null })
      mockFrom.mockReturnValue(qb)

      const store = useProductStore()
      await store.fetchTodayProducts()

      expect(mockFrom).toHaveBeenCalledWith('session_products')
      expect(qb.eq).toHaveBeenCalledWith('session_id', 'session-1')
      expect(store.products).toHaveLength(1)
      expect((store.products[0] as any).nama_produk).toBe('Kue Nastar')
      expect((store.products[0] as any).harga_asli).toBe(8000)
      expect((store.products[0] as any).umkm?.nama_umkm).toBe('Ibu Sari')
    })

    it('fetches products from cashier view when role is cashier', async () => {
      const authStore = useAuthStore()
      authStore.role = 'cashier'

      const qb = createQueryBuilder()
      qb.order.mockResolvedValue({ data: [], error: null })
      mockFrom.mockReturnValue(qb)

      const store = useProductStore()
      await store.fetchTodayProducts()

      expect(mockFrom).toHaveBeenCalledWith('products_cashier_view')
      expect(qb.eq).toHaveBeenCalledWith('session_id', 'session-1')
    })

    it('sets error on fetch failure', async () => {
      const authStore = useAuthStore()
      authStore.role = 'admin'

      const qb = createQueryBuilder()
      qb.eq.mockResolvedValue({ data: null, error: new Error('Network error') })
      mockFrom.mockReturnValue(qb)

      const store = useProductStore()
      await expect(store.fetchTodayProducts()).rejects.toThrow('Network error')
      expect(store.error).toBe('Network error')
    })
  })

  describe('updateProductStock', () => {
    it('updates stok_sekarang for matching product', () => {
      const store = useProductStore()
      store.products = [makeSessionProduct({ id: 'sp-1', stok_sekarang: 10 })]

      store.updateProductStock('sp-1', 5)
      expect(store.products[0]!.stok_sekarang).toBe(5)
    })

    it('does nothing for non-existent product', () => {
      const store = useProductStore()
      store.products = [makeSessionProduct({ id: 'sp-1' })]

      store.updateProductStock('sp-2', 5)
      expect(store.products).toHaveLength(1)
    })
  })

  describe('toggleActive', () => {
    it('updates is_active via session_products table', async () => {
      const qb = createQueryBuilder()
      qb.eq.mockResolvedValue({ data: null, error: null })
      mockFrom.mockReturnValue(qb)

      const store = useProductStore()
      store.products = [makeSessionProduct({ id: 'sp-1', is_active: true })]

      await store.toggleActive('sp-1', false)

      expect(mockFrom).toHaveBeenCalledWith('session_products')
      expect(qb.update).toHaveBeenCalledWith({ is_active: false })
      expect(qb.eq).toHaveBeenCalledWith('id', 'sp-1')
      expect(store.products[0]!.is_active).toBe(false)
    })

    it('throws on update error', async () => {
      const qb = createQueryBuilder()
      qb.eq.mockResolvedValue({ data: null, error: new Error('Update failed') })
      mockFrom.mockReturnValue(qb)

      const store = useProductStore()
      await expect(store.toggleActive('sp-1', true)).rejects.toThrow('Update failed')
    })
  })

  describe('realtime subscription', () => {
    it('subscribes to session_products changes', () => {
      const store = useProductStore()
      store.subscribeRealtime()

      expect(mockChannel).toHaveBeenCalledWith('session-products-session-1')
      expect(mockChannelOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_products',
          filter: 'session_id=eq.session-1',
        },
        expect.any(Function),
      )
      expect(mockChannelSubscribe).toHaveBeenCalled()
    })

    it('unsubscribes and removes channel', () => {
      const store = useProductStore()
      store.subscribeRealtime()

      store.unsubscribeRealtime()
      expect(mockRemoveChannel).toHaveBeenCalled()
    })

    it('handles unsubscribe when no channel exists', () => {
      const store = useProductStore()
      store.unsubscribeRealtime()
      expect(mockRemoveChannel).not.toHaveBeenCalled()
    })

    it('realtime callback updates stock and cart warning', () => {
      const store = useProductStore()
      store.products = [makeSessionProduct({ id: 'sp-1', stok_sekarang: 10, is_active: true })]

      store.subscribeRealtime()
      const callback = mockChannelOn.mock.calls[0][2]
      callback({
        eventType: 'UPDATE',
        new: {
          id: 'sp-1',
          stok_sekarang: 3,
          is_active: true,
        }
      })

      expect(store.products[0]!.stok_sekarang).toBe(3)
      expect(mockCartStore.updateStockWarning).toHaveBeenCalledWith('sp-1', true)
    })
  })
})
