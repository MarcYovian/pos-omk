// utils/__tests__/date.test.ts
import { describe, it, expect } from 'vitest'
import { getTodayJakarta, formatDateIndonesian } from '../date'

describe('date utilities', () => {
  it('formats dates in Indonesian correctly', () => {
    // "2025-06-15" is a Sunday (Minggu)
    const formatted = formatDateIndonesian('2025-06-15')
    expect(formatted).toContain('Minggu')
    expect(formatted).toContain('15')
    expect(formatted).toContain('Juni')
    expect(formatted).toContain('2025')
  })

  it('retrieves today date in YYYY-MM-DD format', () => {
    const today = getTodayJakarta()
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
