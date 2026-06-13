// stores/umkm.ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { UMKM } from '~/types/app'

export const useUmkmStore = defineStore('umkm', () => {
  const umkmList = ref<UMKM[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchAll = async () => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('umkm')
        .select('*')
        .order('nama_umkm')

      if (fetchError) throw fetchError
      umkmList.value = data ?? []
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const addUmkm = async (nama: string, kontak: string) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: insertError } = await supabase
        .from('umkm')
        .insert({
          nama_umkm: nama,
          kontak_wa: kontak,
          is_active: true
        })
        .select()
        .single()

      if (insertError) throw insertError
      umkmList.value.push(data)
      // Sort after addition
      umkmList.value.sort((a, b) => a.nama_umkm.localeCompare(b.nama_umkm))
      return data
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const updateUmkm = async (id: string, updates: Partial<Omit<UMKM, 'id' | 'created_at'>>) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: updateError } = await supabase
        .from('umkm')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError
      const index = umkmList.value.findIndex(u => u.id === id)
      if (index !== -1) {
        umkmList.value[index] = data
      }
      return data
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  let realtimeChannel: any = null

  const subscribeRealtime = () => {
    const supabase = useSupabase()
    realtimeChannel = supabase
      .channel('umkm-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'umkm'
      }, (payload) => {
        console.log('[Realtime UMKM Change] Event:', payload.eventType, 'Payload:', payload)
        fetchAll()
      })
      .subscribe((status, err) => {
        console.log(`[Realtime UMKM Subscribe] Status: ${status}`, err || '')
      })
  }

  const unsubscribeRealtime = () => {
    if (realtimeChannel) {
      const supabase = useSupabase()
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }

  return {
    umkmList,
    isLoading,
    error,
    fetchAll,
    addUmkm,
    updateUmkm,
    subscribeRealtime,
    unsubscribeRealtime
  }
})
