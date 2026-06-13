import { setActivePinia, createPinia } from 'pinia'
import { useProductStore } from '~/stores/products'
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
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

const makeProduct = (overrides: any = {}): any => ({
  id: 'prod-1',
  umkm_id: 'umkm-1',
  session_date: '2025-06-15',
  nama_produk: 'Kue Nastar',
  harga_jual: 10000,
  stok_awal: 10,
  stok_sekarang: 10,
  is_active: true,
  created_at: '2025-06-15T08:00:00Z',
  ...overrides,
})

describe('useProductStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
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
        makeProduct({ id: '1', is_active: true, stok_sekarang: 5 }),
        makeProduct({ id: '2', is_active: false, stok_sekarang: 5 }),
        makeProduct({ id: '3', is_active: true, stok_sekarang: 0 }),
        makeProduct({ id: '4', is_active: true, stok_sekarang: 3 }),
      ]

      expect(store.activeProducts).toHaveLength(2)
      expect(store.activeProducts.map((p: any) => p.id)).toEqual(['1', '4'])
    })

    it('returns empty array when no products match', () => {
      const store = useProductStore()
      store.products = [
        makeProduct({ is_active: false }),
      ]
      expect(store.activeProducts).toHaveLength(0)
    })
  })

  describe('getByUmkm', () => {
    it('filters products by umkm_id', () => {
      const store = useProductStore()
      store.products = [
        makeProduct({ id: '1', umkm_id: 'umkm-1' }),
        makeProduct({ id: '2', umkm_id: 'umkm-2' }),
        makeProduct({ id: '3', umkm_id: 'umkm-1' }),
      ]

      const result = store.getByUmkm('umkm-1')
      expect(result).toHaveLength(2)
      expect(result.map((p: any) => p.id)).toEqual(['1', '3'])
    })
  })

  describe('fetchTodayProducts', () => {
    it('fetches products from admin view when role is admin', async () => {
      const authStore = useAuthStore()
      authStore.role = 'admin'

      const qb = createQueryBuilder()
      const products = [makeProduct()]
      qb.order.mockResolvedValue({ data: products, error: null })
      mockFrom.mockReturnValue(qb)

      const store = useProductStore()
      await store.fetchTodayProducts()

      expect(mockFrom).toHaveBeenCalledWith('products')
      expect(qb.select).toHaveBeenCalledWith('*, umkm(nama_umkm)')
      expect(qb.eq).toHaveBeenCalledWith('session_date', '2025-06-15')
      expect(store.products).toEqual(products)
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
    })

    it('sets error on fetch failure', async () => {
      const authStore = useAuthStore()
      authStore.role = 'admin'

      const qb = createQueryBuilder()
      qb.order.mockResolvedValue({ data: null, error: new Error('Network error') })
      mockFrom.mockReturnValue(qb)

      const store = useProductStore()
      await expect(store.fetchTodayProducts()).rejects.toThrow('Network error')
      expect(store.error).toBe('Network error')
    })
  })

  describe('updateProductStock', () => {
    it('updates stok_sekarang for matching product', () => {
      const store = useProductStore()
      store.products = [makeProduct({ id: 'prod-1', stok_sekarang: 10 })]

      store.updateProductStock('prod-1', 5)
      expect(store.products[0]!.stok_sekarang).toBe(5)
    })

    it('does nothing for non-existent product', () => {
      const store = useProductStore()
      store.products = [makeProduct({ id: 'prod-1' })]

      store.updateProductStock('prod-2', 5)
      expect(store.products).toHaveLength(1)
    })
  })

  describe('toggleActive', () => {
    it('updates is_active via supabase and local state', async () => {
      const qb = createQueryBuilder()
      qb.eq.mockResolvedValue({ data: null, error: null })
      mockFrom.mockReturnValue(qb)

      const store = useProductStore()
      store.products = [makeProduct({ id: 'prod-1', is_active: true })]

      await store.toggleActive('prod-1', false)

      expect(qb.update).toHaveBeenCalledWith({ is_active: false })
      expect(qb.eq).toHaveBeenCalledWith('id', 'prod-1')
      expect(store.products[0]!.is_active).toBe(false)
    })

    it('throws on update error', async () => {
      const qb = createQueryBuilder()
      qb.eq.mockResolvedValue({ data: null, error: new Error('Update failed') })
      mockFrom.mockReturnValue(qb)

      const store = useProductStore()
      await expect(store.toggleActive('prod-1', true)).rejects.toThrow('Update failed')
    })
  })

  describe('realtime subscription', () => {
    it('subscribes to postgres changes', () => {
      const store = useProductStore()
      store.subscribeRealtime()

      expect(mockChannel).toHaveBeenCalledWith('products-stock-2025-06-15')
      expect(mockChannelOn).toHaveBeenCalledWith(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: 'session_date=eq.2025-06-15',
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
      store.products = [makeProduct({ id: 'prod-1', stok_sekarang: 10, nama_produk: 'Kue Nastar', harga_jual: 10000, is_active: true })]

      store.subscribeRealtime()
      const callback = mockChannelOn.mock.calls[0][2]
      callback({
        eventType: 'UPDATE',
        new: {
          id: 'prod-1',
          stok_sekarang: 3,
          nama_produk: 'Kue Nastar',
          harga_jual: 10000,
          is_active: true
        }
      })

      expect(store.products[0]!.stok_sekarang).toBe(3)
      expect(mockCartStore.updateStockWarning).toHaveBeenCalledWith('prod-1', true)
    })
  })
})
