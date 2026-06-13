import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockIsOnline = ref(true)

vi.mock('~/composables/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: mockIsOnline,
  }),
}))

import OfflineBanner from '~/components/ui/OfflineBanner.vue'

describe('OfflineBanner', () => {
  it('shows banner when offline', () => {
    mockIsOnline.value = false
    const wrapper = mount(OfflineBanner)
    expect(wrapper.text()).toContain('Tidak ada koneksi')
    expect(wrapper.find('[class*="bg-danger"]').exists()).toBe(true)
  })

  it('hides banner when online', () => {
    mockIsOnline.value = true
    const wrapper = mount(OfflineBanner)
    expect(wrapper.text()).toBe('')
  })

  it('contains offline mode message', () => {
    mockIsOnline.value = false
    const wrapper = mount(OfflineBanner)
    expect(wrapper.text()).toContain('Mode offline aktif')
  })
})
