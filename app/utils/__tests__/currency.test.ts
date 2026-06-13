// utils/__tests__/currency.test.ts
import { describe, it, expect } from 'vitest'
import { formatIDR } from '../currency'

describe('formatIDR', () => {
  it('formats zero correctly', () => {
    expect(formatIDR(0).replace(/\s/g, ' ')).toBe('Rp 0')
  })

  it('formats positive integers correctly', () => {
    expect(formatIDR(12500).replace(/\s/g, ' ')).toBe('Rp 12.500')
  })

  it('formats large values correctly', () => {
    expect(formatIDR(1500000).replace(/\s/g, ' ')).toBe('Rp 1.500.000')
  })
})
