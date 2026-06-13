// stores/__tests__/cart.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { useCartStore } from '~/stores/cart'
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock auto-imported composables or helpers that aren't defined in test runtime
vi.stubGlobal('useSupabase', () => ({}))
vi.stubGlobal('useSupabaseUser', () => ({}))
vi.stubGlobal('useSupabaseClient', () => ({}))
vi.stubGlobal('navigateTo', vi.fn())
vi.stubGlobal('useToast', () => ({
  addToast: vi.fn()
}))
vi.stubGlobal('getTodayJakarta', () => '2025-06-15')
vi.stubGlobal('formatIDR', (val: number) => `Rp ${val}`)
vi.stubGlobal('useCurrencyFormat', (val: number) => `Rp ${val}`)
vi.stubGlobal('useSessionDate', () => ({
  todayDate: { value: '2025-06-15' }
}))
vi.stubGlobal('useNetworkStatus', () => ({
  isOnline: { value: true }
}))
vi.stubGlobal('useOfflineQueue', () => ({
  enqueue: vi.fn()
}))

describe('useCartStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds a product to cart', () => {
    const cart = useCartStore()
    cart.addItem({
      id: '1',
      nama_produk: 'Kue',
      harga_jual: 10000,
      stok_awal: 5,
      stok_sekarang: 5,
      is_active: true,
      created_at: ''
    })
    expect(cart.items).toHaveLength(1)
    expect(cart.items[0].qty).toBe(1)
    expect(cart.total).toBe(10000)
  })

  it('does not exceed stok_sekarang', () => {
    const cart = useCartStore()
    const product = {
      id: '1',
      nama_produk: 'Kue',
      harga_jual: 10000,
      stok_awal: 2,
      stok_sekarang: 2,
      is_active: true,
      created_at: ''
    }
    cart.addItem(product)
    cart.addItem(product)
    cart.addItem(product) // Third tap — should be rejected by stock limit
    expect(cart.items[0].qty).toBe(2)
  })
})
