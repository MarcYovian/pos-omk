// stores/session.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Session } from '~/types/app'

export const useSessionStore = defineStore('session', () => {
  const currentSession = ref<Session | null>(null)
  const sessionDate = ref(getTodayJakarta())
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const isOpen = computed(() => currentSession.value?.status === 'open')
  const isClosed = computed(() => currentSession.value?.status === 'closed')
  const sessionId = computed(() => currentSession.value?.id || null)

  const fetchTodaySession = async () => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: fetchError } = await supabase
        .from('sessions')
        .select('*')
        .eq('session_date', sessionDate.value)
        .maybeSingle()

      if (fetchError) throw fetchError
      currentSession.value = data
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const openSession = async (openedBy: string) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      const { data, error: insertError } = await supabase
        .from('sessions')
        .insert({
          session_date: sessionDate.value,
          opened_by: openedBy,
          status: 'open'
        })
        .select()
        .single()

      if (insertError) throw insertError
      currentSession.value = data
      return data
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const closeSession = async (adminId: string) => {
    const supabase = useSupabase()
    isLoading.value = true
    error.value = null
    try {
      if (!sessionId.value) throw new Error('No active session to close.')
      const { data, error: closeError } = await supabase.rpc('close_session', {
        p_session_id: sessionId.value,
        p_admin_id: adminId
      })

      if (closeError) throw closeError
      // Refetch today session to sync local state
      await fetchTodaySession()
      return data
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    currentSession,
    sessionDate,
    isLoading,
    error,
    isOpen,
    isClosed,
    sessionId,
    fetchTodaySession,
    openSession,
    closeSession
  }
})
