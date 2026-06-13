import { describe, it, expect, vi } from 'vitest'
import { useCurrencyFormat } from '~/composables/useCurrencyFormat'

vi.stubGlobal('formatIDR', (val: number) => {
  const formatted = val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `Rp ${formatted}`
})

describe('useCurrencyFormat', () => {
  it('formats amount using formatIDR', () => {
    expect(useCurrencyFormat(15000)).toBe('Rp 15.000')
  })

  it('formats zero', () => {
    expect(useCurrencyFormat(0)).toBe('Rp 0')
  })

  it('formats large values', () => {
    expect(useCurrencyFormat(1500000)).toBe('Rp 1.500.000')
  })
})
