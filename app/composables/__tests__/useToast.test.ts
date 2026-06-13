import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useToast } from '~/composables/useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    const { toasts, removeToast } = useToast()
    toasts.value.forEach(t => removeToast(t.id))
  })

  it('adds a toast with generated id', () => {
    const { toasts, addToast } = useToast()
    addToast({ type: 'success', message: 'Berhasil!' })
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].type).toBe('success')
    expect(toasts.value[0].message).toBe('Berhasil!')
    expect(toasts.value[0].id).toBeTypeOf('number')
  })

  it('adds multiple toasts', () => {
    const { toasts, addToast } = useToast()
    addToast({ type: 'success', message: 'Satu' })
    addToast({ type: 'warning', message: 'Dua' })
    addToast({ type: 'danger', message: 'Tiga' })
    expect(toasts.value).toHaveLength(3)
    expect(toasts.value[0].type).toBe('success')
    expect(toasts.value[1].type).toBe('warning')
    expect(toasts.value[2].type).toBe('danger')
  })

  it('removes a toast by id', () => {
    const { toasts, addToast, removeToast } = useToast()
    addToast({ type: 'warning', message: 'Hapus aku' })
    const id = toasts.value[0].id
    removeToast(id)
    expect(toasts.value).toHaveLength(0)
  })

  it('auto-removes toast after 3 seconds', () => {
    const { toasts, addToast } = useToast()
    addToast({ type: 'danger', message: 'Error!' })
    expect(toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    expect(toasts.value).toHaveLength(0)
  })

  it('only removes the specified toast by id', () => {
    const { toasts, addToast, removeToast } = useToast()
    addToast({ type: 'success', message: 'Satu' })
    addToast({ type: 'warning', message: 'Dua' })
    removeToast(toasts.value[0].id)
    expect(toasts.value).toHaveLength(1)
    expect(toasts.value[0].message).toBe('Dua')
  })
})
