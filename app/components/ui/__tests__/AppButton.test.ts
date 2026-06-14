import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppButton from '~/components/ui/AppButton.vue'

describe('AppButton', () => {
  it('renders with default props', () => {
    const wrapper = mount(AppButton, { slots: { default: 'Klik' } })
    expect(wrapper.text()).toBe('Klik')
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    expect(wrapper.classes()).toContain('bg-brand-900')
  })

  it('renders with variant classes', () => {
    const variants = [
      { variant: 'primary', cls: 'bg-brand-900' },
      { variant: 'secondary', cls: 'bg-brand-100' },
      { variant: 'danger', cls: 'bg-danger' },
      { variant: 'ghost', cls: 'bg-transparent' },
    ] as const

    for (const { variant, cls } of variants) {
      const wrapper = mount(AppButton, {
        props: { variant },
        slots: { default: 'Btn' },
      })
      expect(wrapper.classes()).toContain(cls)
    }
  })

  it('renders with size classes', () => {
    const sizes = [
      { size: 'sm', cls: 'px-3' },
      { size: 'md', cls: 'px-3.5' },
      { size: 'lg', cls: 'px-5' },
    ] as const

    for (const { size, cls } of sizes) {
      const wrapper = mount(AppButton, {
        props: { size },
        slots: { default: 'Btn' },
      })
      expect(wrapper.classes()).toContain(cls)
    }
  })

  it('disables button when loading', () => {
    const wrapper = mount(AppButton, {
      props: { loading: true },
      slots: { default: 'Loading' },
    })
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('disables button when disabled prop is true', () => {
    const wrapper = mount(AppButton, {
      props: { disabled: true },
      slots: { default: 'Disabled' },
    })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })

  it('adds fullWidth class', () => {
    const wrapper = mount(AppButton, {
      props: { fullWidth: true },
      slots: { default: 'Full' },
    })
    expect(wrapper.classes()).toContain('w-full')
  })

  it('emits click event', () => {
    const wrapper = mount(AppButton, { slots: { default: 'Click' } })
    wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeTruthy()
  })

  it('does not emit click when disabled', () => {
    const wrapper = mount(AppButton, {
      props: { disabled: true },
      slots: { default: 'No click' },
    })
    wrapper.find('button').trigger('click')
    expect(wrapper.emitted('click')).toBeFalsy()
  })
})
