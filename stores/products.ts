// stores/products.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ProductCashierView, ProductAdmin } from '~/types/app'
import { useAuthStore } from '~/stores/auth'

export const useProductStore = defineStore('products', () => {
  const products = ref<(ProductCashierView | ProductAdmin)[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  let realtimeChannel: RealtimeChannel | null = null

  const activeProducts = computed(() =>
    products.value.filter(p => p.is_active && p.stok_sekarang > 0)
  )

  const getByUmkm = (umkmId: string) =>
    products.value.filter(p => p.umkm_id === umkmId)

  const fetchTodayProducts = async () => {
    const supabase = useSupabase()
    const { todayDate } = useSessionDate()
    const authStore = useAuthStore()

    isLoading.value = true
    error.value = null

    try {
      const table = authStore.role === 'admin' ? 'products' : 'products_cashier_view'
      
      const { data, error: fetchError } = await supabase
        .from(table)
        .select('*, umkm(nama_umkm)')
        .eq('session_date', todayDate.value)
        .order('nama_produk')

      if (fetchError) throw fetchError
      products.value = data ?? []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const updateProductStock = (productId: string, newStock: number) => {
    const product = products.value.find(p => p.id === productId)
    if (product) product.stok_sekarang = newStock
  }

  const toggleActive = async (productId: string, isActive: boolean) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({ is_active: isActive })
        .eq('id', productId)

      if (updateError) throw updateError
      
      const product = products.value.find(p => p.id === productId)
      if (product) product.is_active = isActive
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const subscribeRealtime = () => {
    const supabase = useSupabase()
    const { todayDate } = useSessionDate()
    const cartStore = useCartStore()

    realtimeChannel = supabase
      .channel(`products-stock-${todayDate.value}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'products',
        filter: `session_date=eq.${todayDate.value}`,
      }, (payload) => {
        const updatedId = payload.new.id
        const newStock = payload.new.stok_sekarang
        updateProductStock(updatedId, newStock)
        cartStore.updateStockWarning(updatedId, newStock > 0)
      })
      .subscribe()
  }

  const unsubscribeRealtime = () => {
    if (realtimeChannel) {
      const supabase = useSupabase()
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  return {
    products,
    isLoading,
    error,
    activeProducts,
    getByUmkm,
    fetchTodayProducts,
    updateProductStock,
    toggleActive,
    subscribeRealtime,
    unsubscribeRealtime,
  }
})
