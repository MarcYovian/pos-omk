// composables/useNetworkStatus.ts
import { ref } from 'vue'
import { useOfflineQueue } from '~/composables/useOfflineQueue'
import { useCartStore } from '~/stores/cart'
import { useToast } from '~/composables/useToast'

export const useNetworkStatus = () => {
  const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)
  const { getPending, markSynced, markFailed } = useOfflineQueue()
  
  const syncPendingTransactions = async () => {
    const cartStore = useCartStore()
    const pending = await getPending()
    if (pending.length === 0) return

    const { addToast } = useToast()
    let syncedCount = 0

    for (const tx of pending) {
      try {
        await cartStore.submitTransaction({
          sessionId:       tx.session_id,
          cashierId:       tx.cashier_id,
          nominalDiterima: tx.nominal_diterima,
          cartItems:       tx.cart_items,
          metodePembayaran: tx.metode_pembayaran,
        })
        await markSynced(tx.id)
        syncedCount++
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error'
        await markFailed(tx.id, msg)
      }
    }

    addToast({
      type: syncedCount === pending.length ? 'success' : 'warning',
      message: `${syncedCount} dari ${pending.length} transaksi offline berhasil disinkronkan.`
    })
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
      isOnline.value = true
      await syncPendingTransactions()
    })
    window.addEventListener('offline', () => {
      isOnline.value = false
    })
  }

  return { isOnline, syncPendingTransactions }
}
