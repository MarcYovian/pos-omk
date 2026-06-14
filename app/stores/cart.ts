// stores/cart.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CartItem } from '~/types/pos'
import type { ProductCashierView } from '~/types/app'
import { useOfflineQueue } from '~/composables/useOfflineQueue'
import { useNetworkStatus } from '~/composables/useNetworkStatus'
import { useSessionStore } from '~/stores/session'
import { useAuthStore } from '~/stores/auth'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])
  const isCheckingOut = ref(false)
  const checkoutError = ref<string | null>(null)

  const total = computed(() =>
    items.value.reduce((sum, item) => sum + (item.qty * item.harga_jual), 0)
  )

  const isEmpty = computed(() => items.value.length === 0)
  const itemCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.qty, 0)
  )

  const hasWarnings = computed(() =>
    items.value.some(item => item.hasStockWarning)
  )

  const addItem = (product: ProductCashierView) => {
    const existing = items.value.find(item => item.product_id === product.id)
    if (existing) {
      if (existing.qty + 1 > product.stok_sekarang) {
        const { addToast } = useToast()
        addToast({ type: 'warning', message: 'Stok tidak cukup' })
        return
      }
      existing.qty++
      existing.subtotal = existing.qty * existing.harga_jual
    } else {
      if (1 > product.stok_sekarang) {
        const { addToast } = useToast()
        addToast({ type: 'warning', message: 'Stok habis' })
        return
      }
      items.value.push({
        product_id: product.id,
        nama_produk: product.nama_produk,
        harga_jual: product.harga_jual,
        qty: 1,
        subtotal: product.harga_jual,
        stok_sekarang: product.stok_sekarang,
        hasStockWarning: false
      })
    }
  }

  const removeItem = (productId: string) => {
    items.value = items.value.filter(item => item.product_id !== productId)
  }

  const decrementItem = (productId: string) => {
    const existing = items.value.find(item => item.product_id === productId)
    if (existing) {
      existing.qty--
      if (existing.qty <= 0) {
        removeItem(productId)
      } else {
        existing.subtotal = existing.qty * existing.harga_jual
      }
    }
  }

  const clearCart = () => {
    items.value = []
  }

  const updateStockWarning = (productId: string, inStock: boolean) => {
    const existing = items.value.find(item => item.product_id === productId)
    if (existing) {
      existing.hasStockWarning = !inStock
    }
  }

  // Raw RPC submission
  const submitTransaction = async (payload: {
    sessionId: string
    cashierId: string
    nominalDiterima: number
    cartItems: CartItem[]
    metodePembayaran?: 'cash' | 'qris'
  }) => {
    const supabase = useSupabase()
    const { data, error } = await supabase.rpc('complete_transaction', {
      p_session_id:       payload.sessionId,
      p_cashier_id:       payload.cashierId,
      p_nominal_diterima: payload.nominalDiterima,
      p_cart_items:       payload.cartItems.map(item => ({
        product_id: item.product_id,
        qty:        item.qty,
        harga_jual: item.harga_jual
      })),
      p_metode_pembayaran: payload.metodePembayaran || 'cash'
    } as any)

    if (error) {
      throw new Error(error.message)
    }
    return data
  }

  const checkout = async (nominalDiterima: number, paymentMethod: 'cash' | 'qris' = 'cash') => {
    const sessionStore = useSessionStore()
    const authStore = useAuthStore()
    const { isOnline } = useNetworkStatus()
    const { enqueue } = useOfflineQueue()
    const { addToast } = useToast()

    isCheckingOut.value = true
    checkoutError.value = null

    try {
      if (!sessionStore.sessionId) {
        throw new Error('Sesi hari ini belum aktif.')
      }
      const u = authStore.user
      const cashierId = u 
        ? (u.id || (u as any).sub || (u as any).value?.id || (u as any).value?.sub || (u.user_metadata as any)?.sub)
        : null

      if (!cashierId) {
        throw new Error(`Pengguna tidak terautentikasi. User: ${JSON.stringify(u)}`)
      }

      if (!isOnline.value) {
        // Offline Flow
        const localId = crypto.randomUUID()
        await enqueue({
          id: localId,
          timestamp: new Date().toISOString(),
          session_id: sessionStore.sessionId,
          cashier_id: cashierId,
          nominal_diterima: nominalDiterima,
          cart_items: [...items.value],
          metode_pembayaran: paymentMethod
        })
        addToast({
          type: 'warning',
          message: 'Transaksi disimpan offline. Akan disinkronkan saat terhubung kembali.'
        })
        clearCart()
        return { offline: true }
      } else {
        // Online Flow
        const res = await submitTransaction({
          sessionId: sessionStore.sessionId,
          cashierId: cashierId,
          nominalDiterima: nominalDiterima,
          cartItems: items.value,
          metodePembayaran: paymentMethod
        })
        clearCart()
        return res
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error'
      checkoutError.value = errMsg
      throw e
    } finally {
      isCheckingOut.value = false
    }
  }

  return {
    items,
    isCheckingOut,
    checkoutError,
    total,
    isEmpty,
    itemCount,
    hasWarnings,
    addItem,
    removeItem,
    decrementItem,
    clearCart,
    updateStockWarning,
    submitTransaction,
    checkout
  }
})
