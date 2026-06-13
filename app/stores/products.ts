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
        .from(table as any)
        .select('*, umkm(nama_umkm)')
        .eq('session_date', todayDate.value)
        .order('nama_produk') as any

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
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `session_date=eq.${todayDate.value}`,
      }, (payload) => {
        console.log('[Realtime Product Change] Event:', payload.eventType, 'Payload:', payload)
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          fetchTodayProducts()
        } else if (payload.eventType === 'UPDATE') {
          const updatedId = payload.new.id
          const newStock = payload.new.stok_sekarang
          
          const localProduct = products.value.find(p => p.id === updatedId)
          if (!localProduct) {
            fetchTodayProducts()
          } else if (
            payload.new.nama_produk !== localProduct.nama_produk ||
            payload.new.harga_jual !== localProduct.harga_jual ||
            payload.new.is_active !== localProduct.is_active
          ) {
            fetchTodayProducts()
          } else {
            updateProductStock(updatedId, newStock)
            cartStore.updateStockWarning(updatedId, newStock > 0)
          }
        }
      })
      .subscribe((status, err) => {
        console.log(`[Realtime Stock Subscribe] Status: ${status}`, err || '')
      })
  }

  const unsubscribeRealtime = () => {
    if (realtimeChannel) {
      const supabase = useSupabase()
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  const updateProduct = async (
    productId: string,
    updates: {
      nama_produk: string
      harga_asli: number
      harga_jual: number
      stok_awal: number
      stok_sekarang: number
    }
  ) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { error: updateError } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId)

      if (updateError) throw updateError
      await fetchTodayProducts()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const deleteProduct = async (productId: string) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)

      if (deleteError) throw deleteError
      await fetchTodayProducts()
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
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
    updateProduct,
    deleteProduct,
    subscribeRealtime,
    unsubscribeRealtime,
  }
})
