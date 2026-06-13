import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppInput from '~/components/ui/AppInput.vue'

describe('AppInput', () => {
  it('renders basic input with value', () => {
    const wrapper = mount(AppInput, { props: { modelValue: 'test' } })
    const input = wrapper.find('input')
    expect(input.exists()).toBe(true)
    expect(input.element.value).toBe('test')
  })

  it('shows label when provided', () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: '', label: 'Nama Produk' },
    })
    expect(wrapper.text()).toContain('Nama Produk')
  })

  it('shows required indicator', () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: '', label: 'Nama', required: true },
    })
    expect(wrapper.find('span.text-danger').exists()).toBe(true)
  })

  it('displays error message', () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: '', error: 'Wajib diisi' },
    })
    expect(wrapper.text()).toContain('Wajib diisi')
  })

  it('displays hint when no error', () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: '', hint: 'Masukkan nama produk', error: undefined },
    })
    expect(wrapper.text()).toContain('Masukkan nama produk')
  })

  it('does not show hint when error exists', () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: '', hint: 'Hint', error: 'Error!' },
    })
    expect(wrapper.text()).toContain('Error!')
    expect(wrapper.text()).not.toContain('Hint')
  })

  it('emits update:modelValue on text input', async () => {
    const wrapper = mount(AppInput, { props: { modelValue: '' } })
    const input = wrapper.find('input')
    await input.setValue('kopi')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['kopi'])
  })

  it('emits number value for type=number', async () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: 0, type: 'number' },
    })
    const input = wrapper.find('input')
    await input.setValue(5000)
    const emitted = wrapper.emitted('update:modelValue')![0]
    expect(emitted).toEqual([5000])
  })

  it('disables input when disabled prop is true', () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: '', disabled: true },
    })
    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })

  it('sets placeholder attribute', () => {
    const wrapper = mount(AppInput, {
      props: { modelValue: '', placeholder: 'Cari produk...' },
    })
    expect(wrapper.find('input').attributes('placeholder')).toBe('Cari produk...')
  })
})
