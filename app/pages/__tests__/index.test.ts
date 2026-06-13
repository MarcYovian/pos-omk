import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'

const mockNavigateTo = vi.fn()

vi.stubGlobal('navigateTo', mockNavigateTo)
vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('useSupabase', () => ({
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
}))

describe('index page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('redirects admin to /admin', async () => {
    vi.stubGlobal('useSupabaseUser', () => ({ value: { id: 'user-1', user_metadata: { role: 'admin' } } }))

    const Page = (await import('~/pages/index.vue')).default
    shallowMount(Page)
    expect(mockNavigateTo).toHaveBeenCalledWith('/admin')
  })

  it('redirects cashier to /pos', async () => {
    vi.stubGlobal('useSupabaseUser', () => ({ value: { id: 'user-1', user_metadata: { role: 'cashier' } } }))

    const Page = (await import('~/pages/index.vue')).default
    shallowMount(Page)
    expect(mockNavigateTo).toHaveBeenCalledWith('/pos')
  })
})
