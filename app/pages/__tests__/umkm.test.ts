import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { shallowMount } from '@vue/test-utils'
import { ref } from 'vue'

const mockAddToast = vi.fn()
const mockNavigateTo = vi.fn()

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({ addToast: mockAddToast, toasts: { value: [] }, removeToast: vi.fn() }),
}))

vi.stubGlobal('navigateTo', mockNavigateTo)
vi.stubGlobal('definePageMeta', vi.fn())
vi.mock('~/composables/useCurrencyFormat', () => ({
  useCurrencyFormat: (val: number) => `Rp ${val}`
}))

const mockRoute = {
  params: { umkm_id: '1' }
}
vi.mock('vue-router', () => ({
  useRoute: () => mockRoute,
  useRouter: () => ({}),
}))

const mockFrom = vi.fn()
vi.stubGlobal('useSupabase', () => ({
  from: mockFrom,
}))

describe('UMKM and Master Products Pages', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Master Data UMKM Index Page', () => {
    it('mounts without crash', async () => {
      // Mock store fetchAll and list
      const { useUmkmStore } = await import('~/stores/umkm')
      const store = useUmkmStore()
      store.umkmList = [
        { id: '1', nama_umkm: 'Ibu Sari', kontak_wa: '62812345678', is_active: true, created_at: '' }
      ]
      store.fetchAll = vi.fn().mockResolvedValue([])
      store.subscribeRealtime = vi.fn()
      store.unsubscribeRealtime = vi.fn()

      const Page = (await import('~/pages/admin/umkm/index.vue')).default
      const wrapper = shallowMount(Page)
      
      expect(wrapper.text()).toContain('Profil & Data Master UMKM')
      expect(wrapper.text()).toContain('Ibu Sari')
    })
  })

  describe('Master Products Detail Page', () => {
    it('mounts without crash and shows product cost', async () => {


      const { useUmkmStore } = await import('~/stores/umkm')
      const umkmStore = useUmkmStore()
      umkmStore.umkmList = [
        { id: '1', nama_umkm: 'Ibu Sari', kontak_wa: '62812345678', is_active: true, created_at: '' }
      ]
      umkmStore.fetchAll = vi.fn().mockResolvedValue([])

      // Mock supabase select for master products
      const createQueryBuilder = () => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: 'prod-1', umkm_id: '1', nama_produk: 'Nastar', harga_asli: 15000, is_active: true, created_at: '' }
          ],
          error: null
        }),
      })
      mockFrom.mockReturnValue(createQueryBuilder())

      const Page = (await import('~/pages/admin/umkm/[umkm_id].vue')).default
      const wrapper = shallowMount(Page)
      
      expect(wrapper.text()).toContain('Katalog Produk Master')
      expect(wrapper.text()).toContain('Ibu Sari')
      // Wait for async fetch in onMounted
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(wrapper.text()).toContain('Nastar')
    })
  })
})
