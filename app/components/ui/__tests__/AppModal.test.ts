import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppModal from '~/components/ui/AppModal.vue'

describe('AppModal', () => {
  it('is hidden when modelValue is false', () => {
    const wrapper = mount(AppModal, { props: { modelValue: false } })
    expect(wrapper.find('.fixed.inset-0').exists()).toBe(false)
  })

  it('is visible when modelValue is true', () => {
    const wrapper = mount(AppModal, { props: { modelValue: true } })
    expect(wrapper.find('.fixed.inset-0').exists()).toBe(true)
  })

  it('shows title when provided', () => {
    const wrapper = mount(AppModal, {
      props: { modelValue: true, title: 'Konfirmasi' },
    })
    expect(wrapper.text()).toContain('Konfirmasi')
  })

  it('emits update:modelValue false when close button clicked', async () => {
    const wrapper = mount(AppModal, {
      props: { modelValue: true, title: 'Modal' },
    })
    const closeBtn = wrapper.find('button')
    await closeBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('emits update:modelValue false on backdrop click', async () => {
    const wrapper = mount(AppModal, {
      props: { modelValue: true },
    })
    const backdrop = wrapper.find('[class*="bg-slate-900/50"]')
    await backdrop.trigger('click')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('hides close button in persistent mode', () => {
    const wrapper = mount(AppModal, {
      props: { modelValue: true, persistent: true, title: 'Persistent' },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(0)
  })

  it('does not close on backdrop click in persistent mode', async () => {
    const wrapper = mount(AppModal, {
      props: { modelValue: true, persistent: true },
    })
    const backdrop = wrapper.findAll('.fixed.inset-0').at(0)
    await backdrop!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('renders with size class', () => {
    const wrapper = mount(AppModal, {
      props: { modelValue: true, size: 'lg' },
    })
    const modalContent = wrapper.find('.relative.w-full')
    expect(modalContent.classes()).toContain('max-w-lg')
  })

  it('renders default slot content', () => {
    const wrapper = mount(AppModal, {
      props: { modelValue: true },
      slots: { default: 'Modal body content' },
    })
    expect(wrapper.text()).toContain('Modal body content')
  })

  it('renders footer slot', () => {
    const wrapper = mount(AppModal, {
      props: { modelValue: true },
      slots: { footer: '<button>Simpan</button>' },
    })
    expect(wrapper.text()).toContain('Simpan')
  })

  it('renders header slot overrides title', () => {
    const wrapper = mount(AppModal, {
      props: { modelValue: true, title: 'Default Title' },
      slots: { header: '<h3>Custom Header</h3>' },
    })
    expect(wrapper.text()).toContain('Custom Header')
    expect(wrapper.text()).not.toContain('Default Title')
  })
})
