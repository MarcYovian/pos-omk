import { describe, it, expect, vi } from 'vitest'
import { useSessionDate } from '~/composables/useSessionDate'

vi.stubGlobal('getTodayJakarta', () => '2025-06-15')
vi.stubGlobal('formatDateIndonesian', (date: string) => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const d = new Date(date + 'T12:00:00Z')
  return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
})

describe('useSessionDate', () => {
  it('returns today date in YYYY-MM-DD format', () => {
    const { todayDate } = useSessionDate()
    expect(todayDate.value).toBe('2025-06-15')
  })

  it('returns formatted date in Indonesian', () => {
    const { formattedToday } = useSessionDate()
    expect(formattedToday.value).toBe('Minggu, 15 Juni 2025')
  })
})
