<!-- app/pages/admin/settings/company.vue -->
<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useCompanyStore } from '~/stores/company'
import { useAuthStore } from '~/stores/auth'
import { useApi } from '~/composables/useApi'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'

definePageMeta({
  layout: 'admin',
  middleware: ['auth', 'admin']
})

const companyStore = useCompanyStore()
const authStore = useAuthStore()
const { apiFetch } = useApi()
const { addToast } = useToast()

const isLoading = ref(false)
const isSaving = ref(false)

const form = reactive({
  name: '',
  slug: '',
  phone: '',
  address: '',
  logo_url: '',
  settings: {
    receipt_footer: '',
    qris_name: '',
    bank_info: '',
  }
})

const loadCompanyData = async () => {
  isLoading.value = true
  try {
    const data = await apiFetch<any>('/api/companies/active')
    if (data) {
      form.name = data.name || ''
      form.slug = data.slug || ''
      form.phone = data.phone || ''
      form.address = data.address || ''
      form.logo_url = data.logo_url || ''
      form.settings = {
        receipt_footer: data.settings?.receipt_footer || '',
        qris_name: data.settings?.qris_name || '',
        bank_info: data.settings?.bank_info || '',
      }
    }
  } catch (err: any) {
    addToast({
      type: 'danger',
      message: err?.message || 'Gagal memuat profil organisasi'
    })
  } finally {
    isLoading.value = false
  }
}

const handleSave = async () => {
  if (!form.name.trim()) {
    addToast({ type: 'warning', message: 'Nama paroki/organisasi wajib diisi' })
    return
  }

  isSaving.value = true
  try {
    await apiFetch('/api/companies/active', {
      method: 'PATCH',
      body: {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        logo_url: form.logo_url.trim() || null,
        settings: {
          ...form.settings,
        }
      }
    })

    addToast({
      type: 'success',
      message: 'Profil organisasi berhasil diperbarui'
    })

    // Refresh store details
    await Promise.allSettled([
      companyStore.fetchActiveCompanyDetail(),
      companyStore.fetchMyCompanies()
    ])
  } catch (err: any) {
    addToast({
      type: 'danger',
      message: err?.message || 'Gagal menyimpan perubahan profil'
    })
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  loadCompanyData()
})
</script>

<template>
  <div class="max-w-4xl mx-auto space-y-6">
    <!-- Header -->
    <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div class="flex items-center gap-4">
        <div class="h-12 w-12 rounded-2xl bg-brand-600/10 text-brand-600 border border-brand-500/20 flex items-center justify-center shrink-0">
          <Icon name="heroicons:building-library" class="w-6 h-6" />
        </div>
        <div>
          <h1 class="text-lg font-black text-slate-900 tracking-tight">Profil Paroki / Organisasi</h1>
          <p class="text-xs text-slate-500 mt-0.5">Kelola identitas resmi, alamat, kontak, dan footer nota kasir</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
          <span class="h-2 w-2 rounded-full bg-emerald-500"></span>
          Aktif: {{ companyStore.activeCompany?.company_name || 'Memuat...' }}
        </span>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="p-12 text-center text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200">
      <div class="inline-block animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full mb-2"></div>
      <p class="text-xs">Memuat data profil organisasi...</p>
    </div>

    <!-- Settings Form -->
    <form v-else @submit.prevent="handleSave" class="space-y-6">
      <!-- Section 1: Identitas Utama -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Icon name="heroicons:identification" class="w-5 h-5 text-brand-600" />
          <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Identitas Utama</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Organisasi / Paroki <span class="text-rose-500">*</span>
            </label>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Contoh: Paroki St. Yohanes Bosko"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">
              Kode Singkatan (Slug)
            </label>
            <input
              v-model="form.slug"
              type="text"
              disabled
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-mono font-bold text-slate-500 cursor-not-allowed select-none"
            />
            <p class="text-[10px] text-slate-400 mt-1">Kode pengenal unik di database (dikelola oleh platform administrator)</p>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            URL Logo Paroki
          </label>
          <input
            v-model="form.logo_url"
            type="url"
            placeholder="https://example.com/logo.png"
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      <!-- Section 2: Kontak & Lokasi -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Icon name="heroicons:map-pin" class="w-5 h-5 text-brand-600" />
          <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Kontak & Lokasi</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">
              Nomor WhatsApp / Telepon Paroki
            </label>
            <input
              v-model="form.phone"
              type="tel"
              placeholder="081234567890"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Merchant QRIS
            </label>
            <input
              v-model="form.settings.qris_name"
              type="text"
              placeholder="Contoh: TOKO VENTURA OMK"
              class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            Alamat Lengkap Gereja
          </label>
          <textarea
            v-model="form.address"
            rows="3"
            placeholder="Jalan Danau Sunter Utara Blok B-1..."
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          ></textarea>
        </div>
      </div>

      <!-- Section 3: Konfigurasi POS & Struk Belanja -->
      <div class="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div class="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Icon name="heroicons:receipt-percent" class="w-5 h-5 text-brand-600" />
          <h2 class="text-sm font-bold text-slate-800 uppercase tracking-wider">Konfigurasi Nota POS</h2>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-700 mb-1.5">
            Catatan Kaki Struk (Receipt Footer)
          </label>
          <textarea
            v-model="form.settings.receipt_footer"
            rows="2"
            placeholder="Terima kasih telah berbelanja & mendukung UMKM Paroki kami. Berkah Dalem."
            class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          ></textarea>
          <p class="text-[10px] text-slate-400 mt-1">Pesan penutup yang dicetak atau ditampilkan di bawah nota belanja kasir.</p>
        </div>
      </div>

      <!-- Action Button -->
      <div class="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          @click="loadCompanyData"
          class="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          Reset Perubahan
        </button>

        <button
          type="submit"
          :disabled="isSaving"
          class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-60 cursor-pointer"
        >
          <Icon v-if="isSaving" name="heroicons:arrow-path" class="w-4 h-4 animate-spin" />
          <Icon v-else name="heroicons:check" class="w-4 h-4" />
          <span>{{ isSaving ? 'Menyimpan...' : 'Simpan Profil' }}</span>
        </button>
      </div>
    </form>
  </div>
</template>
