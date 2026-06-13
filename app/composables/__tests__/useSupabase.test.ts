import { describe, it, expect, vi } from 'vitest'
import { useSupabase } from '~/composables/useSupabase'

const mockClient = { from: vi.fn() }
vi.stubGlobal('useSupabaseClient', () => mockClient)

describe('useSupabase', () => {
  it('returns supabase client', () => {
    const client = useSupabase()
    expect(client).toBe(mockClient)
    expect(client.from).toBeDefined()
  })
})
