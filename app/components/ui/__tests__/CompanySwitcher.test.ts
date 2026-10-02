import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mockActiveCompanyId = ref<string | null>('comp-1')
const mockAvailableCompanies = ref<any[]>([])
const mockSwitchCompany = vi.fn()

vi.mock('~/stores/company', () => ({
  useCompanyStore: () => ({
    get activeCompanyId() { return mockActiveCompanyId.value },
    get availableCompanies() { return mockAvailableCompanies.value },
    get activeCompany() { return mockAvailableCompanies.value.find(c => c.company_id === mockActiveCompanyId.value) || null },
    get hasMultipleCompanies() { return mockAvailableCompanies.value.length > 1 },
    get isSuperAdminTenant() { return false },
    switchCompany: mockSwitchCompany,
  }),
}))

const mockAddToast = vi.fn()
vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    addToast: mockAddToast,
  }),
}))

import CompanySwitcher from '~/components/ui/CompanySwitcher.vue'

describe('CompanySwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockActiveCompanyId.value = 'comp-1'
    mockAvailableCompanies.value = [
      {
        company_id: 'comp-1',
        company_name: 'Paroki St. Yohanes Bosko',
        company_code: 'BOSKO',
        role: 'admin',
      },
    ]
  })

  it('renders single-company static badge when user has only 1 company', () => {
    const wrapper = mount(CompanySwitcher, {
      global: {
        stubs: { Icon: true },
      },
    })

    expect(wrapper.text()).toContain('Paroki St. Yohanes Bosko')
    expect(wrapper.text()).toContain('BOSKO')
    // No multi-company interactive dropdown trigger
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('renders multi-company button trigger when user has > 1 company', async () => {
    mockAvailableCompanies.value = [
      {
        company_id: 'comp-1',
        company_name: 'Paroki St. Yohanes Bosko',
        company_code: 'BOSKO',
        role: 'admin',
      },
      {
        company_id: 'comp-2',
        company_name: 'Paroki St. Antonius',
        company_code: 'ANTONIUS',
        role: 'cashier',
      },
    ]

    const wrapper = mount(CompanySwitcher, {
      global: {
        stubs: { Icon: true },
      },
    })

    const triggerBtn = wrapper.find('button')
    expect(triggerBtn.exists()).toBe(true)
    expect(triggerBtn.text()).toContain('Paroki St. Yohanes Bosko')
  })

  it('toggles dropdown menu on button click and allows selecting another company', async () => {
    mockAvailableCompanies.value = [
      {
        company_id: 'comp-1',
        company_name: 'Paroki St. Yohanes Bosko',
        company_code: 'BOSKO',
        role: 'admin',
      },
      {
        company_id: 'comp-2',
        company_name: 'Paroki St. Antonius',
        company_code: 'ANTONIUS',
        role: 'cashier',
      },
    ]

    const wrapper = mount(CompanySwitcher, {
      global: {
        stubs: { Icon: true },
      },
    })

    // Initially closed
    expect(wrapper.text()).not.toContain('PILIH PAROKI / ORGANISASI')

    // Open dropdown
    const triggerBtn = wrapper.find('button')
    await triggerBtn.trigger('click')

    expect(wrapper.text()).toContain('PILIH PAROKI / ORGANISASI')
    expect(wrapper.text()).toContain('Paroki St. Antonius')

    // Click second company
    const buttons = wrapper.findAll('button')
    const antoniusBtn = buttons.find(b => b.text().includes('Paroki St. Antonius'))
    expect(antoniusBtn).toBeDefined()

    await antoniusBtn?.trigger('click')
    expect(mockSwitchCompany).toHaveBeenCalledWith('comp-2')
  })
})
