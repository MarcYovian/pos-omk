import { setActivePinia, createPinia } from 'pinia'
import { useUmkmStore } from '~/stores/umkm'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const createQueryBuilder = () => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  maybeSingle: vi.fn(),
  single: vi.fn(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
})

const mockFrom = vi.fn()

vi.stubGlobal('useSupabase', () => ({
  from: mockFrom,
}))

const makeUmkm = (overrides: any = {}): any => ({
  id: 'umkm-1',
  nama_umkm: 'Ibu Sari',
  kontak_wa: '62812345678',
  is_active: true,
  created_at: '2025-06-15T08:00:00Z',
  ...overrides,
})

describe('useUmkmStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('has default state', () => {
    const store = useUmkmStore()
    expect(store.umkmList).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  describe('fetchAll', () => {
    it('fetches and stores UMKM list sorted by name', async () => {
      const qb = createQueryBuilder()
      const umkmData = [
        makeUmkm({ id: '2', nama_umkm: 'Budi' }),
        makeUmkm({ id: '1', nama_umkm: 'Ayu' }),
      ]
      qb.order.mockResolvedValue({ data: umkmData, error: null })
      mockFrom.mockReturnValue(qb)

      const store = useUmkmStore()
      await store.fetchAll()

      expect(mockFrom).toHaveBeenCalledWith('umkm')
      expect(qb.select).toHaveBeenCalledWith('*')
      expect(qb.order).toHaveBeenCalledWith('nama_umkm')
      expect(store.umkmList).toEqual(umkmData)
    })

    it('sets error on fetch failure', async () => {
      const qb = createQueryBuilder()
      qb.order.mockResolvedValue({ data: null, error: new Error('DB down') })
      mockFrom.mockReturnValue(qb)

      const store = useUmkmStore()
      await expect(store.fetchAll()).rejects.toThrow('DB down')
      expect(store.error).toBe('DB down')
    })
  })

  describe('addUmkm', () => {
    it('adds UMKM and maintains sort order', async () => {
      const qb = createQueryBuilder()
      const newUmkm = makeUmkm({ id: 'new-1', nama_umkm: 'Citra' })
      qb.single.mockResolvedValue({ data: newUmkm, error: null })
      mockFrom.mockReturnValue(qb)

      const store = useUmkmStore()
      store.umkmList = [
        makeUmkm({ id: '1', nama_umkm: 'Budi' }),
      ]
      const result = await store.addUmkm('Citra', '62898765432')

      expect(mockFrom).toHaveBeenCalledWith('umkm')
      expect(qb.insert).toHaveBeenCalledWith({
        nama_umkm: 'Citra',
        kontak_wa: '62898765432',
        is_active: true,
      })
      expect(store.umkmList[0].nama_umkm).toBe('Budi')
      expect(store.umkmList[1].nama_umkm).toBe('Citra')
      expect(result).toEqual(newUmkm)
    })

    it('throws on insert error', async () => {
      const qb = createQueryBuilder()
      qb.single.mockResolvedValue({ data: null, error: new Error('Insert failed') })
      mockFrom.mockReturnValue(qb)

      const store = useUmkmStore()
      await expect(store.addUmkm('Test', '123')).rejects.toThrow('Insert failed')
    })
  })

  describe('updateUmkm', () => {
    it('updates UMKM locally and returns updated data', async () => {
      const qb = createQueryBuilder()
      const updated = makeUmkm({ nama_umkm: 'Ibu Sari Updated' })
      qb.single.mockResolvedValue({ data: updated, error: null })
      mockFrom.mockReturnValue(qb)

      const store = useUmkmStore()
      store.umkmList = [makeUmkm({ id: 'umkm-1' })]

      const result = await store.updateUmkm('umkm-1', { nama_umkm: 'Ibu Sari Updated' })

      expect(mockFrom).toHaveBeenCalledWith('umkm')
      expect(qb.update).toHaveBeenCalledWith({ nama_umkm: 'Ibu Sari Updated' })
      expect(qb.eq).toHaveBeenCalledWith('id', 'umkm-1')
      expect(store.umkmList[0].nama_umkm).toBe('Ibu Sari Updated')
      expect(result).toEqual(updated)
    })

    it('throws on update error', async () => {
      const qb = createQueryBuilder()
      qb.single.mockResolvedValue({ data: null, error: new Error('Update failed') })
      mockFrom.mockReturnValue(qb)

      const store = useUmkmStore()
      store.umkmList = [makeUmkm()]

      await expect(store.updateUmkm('umkm-1', { nama_umkm: 'Baru' })).rejects.toThrow('Update failed')
    })
  })
})
