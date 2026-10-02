import { setActivePinia, createPinia } from 'pinia'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockApiFetch = vi.fn()
vi.mock('~/composables/useApi', () => ({
  useApi: () => ({
    apiFetch: mockApiFetch,
  }),
}))

const mockSupabaseRestHeaders: Record<string, string> = {}
vi.mock('~/composables/useSupabase', () => ({
  useSupabase: () => ({
    rest: {
      headers: mockSupabaseRestHeaders,
    },
  }),
}))

const mockFetchUserPermissions = vi.fn()
vi.mock('~/stores/auth', () => ({
  useAuthStore: () => ({
    fetchUserPermissions: mockFetchUserPermissions,
  }),
}))

const mockFetchTodaySession = vi.fn()
vi.mock('~/stores/session', () => ({
  useSessionStore: () => ({
    fetchTodaySession: mockFetchTodaySession,
  }),
}))

const mockFetchTodayProducts = vi.fn()
vi.mock('~/stores/products', () => ({
  useProductStore: () => ({
    fetchTodayProducts: mockFetchTodayProducts,
  }),
}))

const mockFetchAllUmkm = vi.fn()
vi.mock('~/stores/umkm', () => ({
  useUmkmStore: () => ({
    fetchAll: mockFetchAllUmkm,
  }),
}))

const mockLocalStorage: Record<string, string> = {}
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
    setItem: vi.fn((key: string, val: string) => { mockLocalStorage[key] = val }),
    removeItem: vi.fn((key: string) => { delete mockLocalStorage[key] }),
    clear: vi.fn(() => {
      Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k])
    }),
  },
  writable: true,
})

import { useCompanyStore } from '~/stores/company'

const sampleCompanies = [
  {
    company_id: 'comp-1',
    company_name: 'Paroki St. Yohanes Bosko',
    company_slug: 'bosko',
    company_code: 'BOSKO',
    role: 'admin',
    role_name: 'Administrator',
    is_default: true,
    is_active: true,
  },
  {
    company_id: 'comp-2',
    company_name: 'Paroki St. Antonius Padua',
    company_slug: 'antonius',
    company_code: 'ANTONIUS',
    role: 'cashier',
    role_name: 'Kasir',
    is_default: false,
    is_active: true,
  },
]

describe('useCompanyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k])
    Object.keys(mockSupabaseRestHeaders).forEach((k) => delete mockSupabaseRestHeaders[k])
  })

  it('starts with default empty state', () => {
    const store = useCompanyStore()
    expect(store.activeCompanyId).toBeNull()
    expect(store.availableCompanies).toEqual([])
    expect(store.activeCompanyDetail).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.activeCompany).toBeNull()
    expect(store.hasMultipleCompanies).toBe(false)
  })

  it('fetches companies and maps them correctly', async () => {
    mockApiFetch.mockResolvedValueOnce(sampleCompanies)
    const store = useCompanyStore()

    const result = await store.fetchMyCompanies()

    expect(mockApiFetch).toHaveBeenCalledWith('/api/companies/my-companies')
    expect(result).toHaveLength(2)
    expect(store.availableCompanies).toHaveLength(2)
    expect(store.hasMultipleCompanies).toBe(true)
  })

  it('handles fetch companies failure gracefully', async () => {
    mockApiFetch.mockRejectedValueOnce(new Error('Network error'))
    const store = useCompanyStore()

    const result = await store.fetchMyCompanies()

    expect(result).toEqual([])
    expect(store.availableCompanies).toEqual([])
    expect(store.error).toBe('Network error')
  })

  it('sets active company and persists to localStorage and Supabase rest headers', async () => {
    mockApiFetch.mockResolvedValueOnce(sampleCompanies) // fetchMyCompanies
    mockApiFetch.mockResolvedValueOnce({ id: 'comp-1', name: 'Paroki St. Yohanes Bosko' }) // fetchActiveCompanyDetail

    const store = useCompanyStore()
    await store.fetchMyCompanies()

    await store.setActiveCompany('comp-1', true)

    expect(store.activeCompanyId).toBe('comp-1')
    expect(store.activeCompany?.company_name).toBe('Paroki St. Yohanes Bosko')
    expect(store.currentRole).toBe('admin')
    expect(localStorage.setItem).toHaveBeenCalledWith('omk_active_company_id', 'comp-1')
    expect(mockSupabaseRestHeaders['X-Company-Id']).toBe('comp-1')

    // Refreshed dependent stores
    expect(mockFetchUserPermissions).toHaveBeenCalledWith(true)
    expect(mockFetchTodaySession).toHaveBeenCalled()
    expect(mockFetchTodayProducts).toHaveBeenCalled()
    expect(mockFetchAllUmkm).toHaveBeenCalledWith(true)
  })

  it('throws error when setting company user has no access to', async () => {
    mockApiFetch.mockResolvedValueOnce(sampleCompanies)
    const store = useCompanyStore()
    await store.fetchMyCompanies()

    await expect(store.setActiveCompany('comp-999')).rejects.toThrow(
      'Anda tidak memiliki akses ke organisasi yang dipilih'
    )
  })

  it('switches company using switchCompany helper', async () => {
    mockApiFetch.mockResolvedValueOnce(sampleCompanies) // fetchMyCompanies
    mockApiFetch.mockResolvedValueOnce({ id: 'comp-2', name: 'Paroki St. Antonius' }) // active detail

    const store = useCompanyStore()
    await store.fetchMyCompanies()

    await store.switchCompany('comp-2')

    expect(store.activeCompanyId).toBe('comp-2')
    expect(store.currentRole).toBe('cashier')
  })

  it('initializes from localStorage if target is valid', async () => {
    mockLocalStorage['omk_active_company_id'] = 'comp-2'
    mockApiFetch.mockResolvedValueOnce(sampleCompanies) // fetchMyCompanies
    mockApiFetch.mockResolvedValueOnce({ id: 'comp-2' }) // active detail

    const store = useCompanyStore()
    await store.initialize()

    expect(store.activeCompanyId).toBe('comp-2')
  })

  it('initializes to default company if localStorage is empty', async () => {
    mockApiFetch.mockResolvedValueOnce(sampleCompanies) // fetchMyCompanies
    mockApiFetch.mockResolvedValueOnce({ id: 'comp-1' }) // active detail

    const store = useCompanyStore()
    await store.initialize()

    expect(store.activeCompanyId).toBe('comp-1') // comp-1 is_default = true
  })

  it('resets state and clears localStorage on reset', () => {
    mockLocalStorage['omk_active_company_id'] = 'comp-1'
    const store = useCompanyStore()
    store.activeCompanyId = 'comp-1'
    store.availableCompanies = sampleCompanies as any

    store.reset()

    expect(store.activeCompanyId).toBeNull()
    expect(store.availableCompanies).toEqual([])
    expect(localStorage.removeItem).toHaveBeenCalledWith('omk_active_company_id')
  })
})
