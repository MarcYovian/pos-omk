// stores/products.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { ProductCashierView, ProductAdmin } from '~/types/app'
import { useAuthStore } from '~/stores/auth'
import { useSessionStore } from '~/stores/session'

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
    const sessionStore = useSessionStore()
    const authStore = useAuthStore()

    const sessionId = sessionStore.sessionId
    if (!sessionId) {
      products.value = []
      return
    }

    isLoading.value = true
    error.value = null

    try {
      if (authStore.role === 'admin') {
        const { data, error: fetchError } = await supabase
          .from('session_products')
          .select(`
            *,
            master_product:master_products!inner(
              nama_produk,
              harga_asli,
              umkm_id,
              umkm!inner(nama_umkm)
            )
          `)
          .eq('session_id', sessionId)

        if (fetchError) throw fetchError

        products.value = (data ?? []).map((sp: any) => ({
          id: sp.id,
          session_id: sp.session_id,
          master_product_id: sp.master_product_id,
          nama_produk: sp.master_product?.nama_produk ?? '',
          harga_asli: sp.master_product?.harga_asli ?? 0,
          harga_jual: sp.harga_jual,
          stok_awal: sp.stok_awal,
          stok_sekarang: sp.stok_sekarang,
          is_active: sp.is_active,
          umkm_id: sp.master_product?.umkm_id ?? '',
          created_at: sp.created_at,
          umkm: sp.master_product?.umkm,
        }))

        products.value.sort((a, b) => a.nama_produk.localeCompare(b.nama_produk))
      } else {
        const { data, error: fetchError } = await supabase
          .from('products_cashier_view')
          .select('*, umkm(nama_umkm)')
          .eq('session_id', sessionId)
          .order('nama_produk') as any

        if (fetchError) throw fetchError
        products.value = data ?? []
      }
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
        .from('session_products')
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
    const sessionStore = useSessionStore()
    const cartStore = useCartStore()

    const sessionId = sessionStore.sessionId
    if (!sessionId) return

    realtimeChannel = supabase
      .channel(`session-products-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_products',
        filter: `session_id=eq.${sessionId}`,
      }, (payload) => {
        console.log('[Realtime SessionProduct Change] Event:', payload.eventType, 'Payload:', payload)
        
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
          fetchTodayProducts()
        } else if (payload.eventType === 'UPDATE') {
          const updatedId = payload.new.id
          const newStock = payload.new.stok_sekarang
          
          const localProduct = products.value.find(p => p.id === updatedId)
          if (!localProduct) {
            fetchTodayProducts()
          } else if (
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
      const product = products.value.find(p => p.id === productId) as ProductAdmin | undefined
      if (!product) throw new Error('Product not found')

      const masterProductId = product.master_product_id
      if (!masterProductId) throw new Error('Master product ID not found')

      const { error: updateError } = await supabase
        .from('session_products')
        .update({
          harga_jual: updates.harga_jual,
          stok_awal: updates.stok_awal,
          stok_sekarang: updates.stok_sekarang,
        })
        .eq('id', productId)

      if (updateError) throw updateError

      const { error: masterUpdateError } = await supabase
        .from('master_products')
        .update({
          nama_produk: updates.nama_produk,
          harga_asli: updates.harga_asli,
        })
        .eq('id', masterProductId)

      if (masterUpdateError) throw masterUpdateError

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
        .from('session_products')
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
