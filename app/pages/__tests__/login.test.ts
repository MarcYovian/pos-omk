import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

const mockLogin = vi.fn()
const mockAddToast = vi.fn()
const mockNavigateTo = vi.fn()

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({ addToast: mockAddToast, toasts: { value: [] }, removeToast: vi.fn() }),
}))

const mockUser = ref<any>(null)
vi.stubGlobal('useSupabaseUser', () => mockUser)
vi.stubGlobal('navigateTo', mockNavigateTo)
vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('useSupabase', () => ({
  auth: { signInWithPassword: vi.fn(), signOut: vi.fn() },
}))

describe('login page', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockUser.value = null
  })

  it('renders login form with title', async () => {
    const Page = (await import('~/pages/login.vue')).default
    const wrapper = shallowMount(Page)
    expect(wrapper.find('form').exists()).toBe(true)
    expect(wrapper.text()).toContain('OMK POS')
  })

  it('calls authStore.login on form submission', async () => {
    mockLogin.mockResolvedValue({})

    const { useAuthStore } = await import('~/stores/auth')
    const store = useAuthStore()
    store.login = mockLogin

    const Page = (await import('~/pages/login.vue')).default
    const wrapper = shallowMount(Page)

    const form = wrapper.find('form')
    await form.trigger('submit')

    expect(mockLogin).toHaveBeenCalled()
  })

  it('shows error on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid'))

    const { useAuthStore } = await import('~/stores/auth')
    const store = useAuthStore()
    store.login = mockLogin

    const Page = (await import('~/pages/login.vue')).default
    const wrapper = shallowMount(Page)
    await wrapper.find('form').trigger('submit')

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'danger' }),
    )
  })

  it('redirects to /admin on successful admin login', async () => {
    mockLogin.mockImplementation(async () => {
      mockUser.value = { id: 'admin-id', user_metadata: { role: 'admin' } }
      return {}
    })

    const { useAuthStore } = await import('~/stores/auth')
    const store = useAuthStore()
    store.login = mockLogin
    store.role = 'admin' as any

    const Page = (await import('~/pages/login.vue')).default
    const wrapper = shallowMount(Page)
    await wrapper.find('form').trigger('submit')

    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success' }),
    )
    expect(mockNavigateTo).toHaveBeenCalledWith('/admin')
  })

  it('redirects to /pos on successful cashier login', async () => {
    mockLogin.mockImplementation(async () => {
      mockUser.value = { id: 'cashier-id', user_metadata: { role: 'cashier' } }
      return {}
    })

    const { useAuthStore } = await import('~/stores/auth')
    const store = useAuthStore()
    store.login = mockLogin
    store.role = 'cashier' as any

    const Page = (await import('~/pages/login.vue')).default
    const wrapper = shallowMount(Page)
    await wrapper.find('form').trigger('submit')

    expect(mockNavigateTo).toHaveBeenCalledWith('/pos')
  })
})
