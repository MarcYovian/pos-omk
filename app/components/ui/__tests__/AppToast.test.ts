import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockToasts = ref<Array<{ id: number; type: string; message: string }>>([])
const mockRemoveToast = vi.fn()

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    toasts: mockToasts,
    removeToast: mockRemoveToast,
  }),
}))

import AppToast from '~/components/ui/AppToast.vue'

describe('AppToast', () => {
  beforeEach(() => {
    mockToasts.value = []
    vi.clearAllMocks()
  })

  it('renders toast messages', () => {
    mockToasts.value = [{ id: 1, type: 'success', message: 'Berhasil!' }]
    const wrapper = mount(AppToast)
    expect(wrapper.text()).toContain('Berhasil!')
  })

  it('applies success styling', () => {
    mockToasts.value = [{ id: 1, type: 'success', message: 'OK' }]
    const wrapper = mount(AppToast)
    const toastEl = wrapper.find('[class*="bg-green"]')
    expect(toastEl.exists()).toBe(true)
    expect(wrapper.html()).toContain('check-circle')
  })

  it('applies warning styling', () => {
    mockToasts.value = [{ id: 1, type: 'warning', message: 'Warning' }]
    const wrapper = mount(AppToast)
    const toastEl = wrapper.find('[class*="bg-amber"]')
    expect(toastEl.exists()).toBe(true)
    expect(wrapper.html()).toContain('exclamation-triangle')
  })

  it('applies danger styling', () => {
    mockToasts.value = [{ id: 1, type: 'danger', message: 'Error!' }]
    const wrapper = mount(AppToast)
    const toastEl = wrapper.find('[class*="bg-red"]')
    expect(toastEl.exists()).toBe(true)
    expect(wrapper.html()).toContain('x-circle')
  })

  it('renders multiple toasts', () => {
    mockToasts.value = [
      { id: 1, type: 'success', message: 'Satu' },
      { id: 2, type: 'warning', message: 'Dua' },
    ]
    const wrapper = mount(AppToast)
    expect(wrapper.text()).toContain('Satu')
    expect(wrapper.text()).toContain('Dua')
  })

  it('calls removeToast on close button click', async () => {
    mockToasts.value = [{ id: 42, type: 'success', message: 'Hapus' }]
    const wrapper = mount(AppToast)
    const closeBtn = wrapper.find('button')
    await closeBtn.trigger('click')
    expect(mockRemoveToast).toHaveBeenCalledWith(42)
  })

  it('renders nothing when no toasts', () => {
    const wrapper = mount(AppToast)
    expect(wrapper.find('[class*="bg-green"]').exists()).toBe(false)
  })
})
