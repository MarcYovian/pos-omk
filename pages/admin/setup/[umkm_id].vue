<!-- pages/admin/setup/[umkm_id].vue -->
<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useSessionStore } from '~/stores/session'
import { useUmkmStore } from '~/stores/umkm'
import { useProductStore } from '~/stores/products'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppToast from '~/components/ui/AppToast.vue'
import type { ProductAdmin } from '~/types/app'

definePageMeta({
  middleware: ['auth', 'admin']
})

const route = useRoute()
const sessionStore = useSessionStore()
const umkmStore = useUmkmStore()
const productStore = useProductStore()
const { addToast } = useToast()

const umkmId = route.params.umkm_id as string

// Form State
const productName = ref('')
const hargaAsli = ref<number | ''>('')
const hargaJual = ref<number | ''>('')
const stokAwal = ref<number | ''>('')
const isAddingProduct = ref(false)

const currentUmkm = computed(() => {
  return umkmStore.umkmList.find(u => u.id === umkmId)
})

const umkmProducts = computed(() => {
  return productStore.getByUmkm(umkmId)
})

const loadAllData = async () => {
  try {
    await sessionStore.fetchTodaySession()
    await umkmStore.fetchAll()
    if (sessionStore.currentSession) {
      await productStore.fetchTodayProducts()
    }
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat data' })
  }
}

onMounted(() => {
  loadAllData()
})

const handleAddProductSubmit = async () => {
  if (!productName.value.trim() || hargaAsli.value === '' || hargaJual.value === '' || stokAwal.value === '') {
    addToast({ type: 'warning', message: 'Harap isi semua kolom' })
    return
  }

  const cost = Number(hargaAsli.value)
  const sell = Number(hargaJual.value)
  const qty = Number(stokAwal.value)

  if (cost <= 0 || qty <= 0) {
    addToast({ type: 'warning', message: 'Harga UMKM dan Stok Awal harus lebih besar dari 0' })
    return
  }

  if (sell < cost) {
    addToast({ type: 'warning', message: 'Harga jual tidak boleh lebih rendah dari harga UMKM (harga asli)' })
    return
  }

  const supabase = useSupabase()
  isAddingProduct.value = true
  
  try {
    const { error: insertError } = await supabase
      .from('products')
      .insert({
        umkm_id: umkmId,
        session_date: sessionStore.sessionDate,
        nama_produk: productName.value.trim(),
        harga_asli: cost,
        harga_jual: sell,
        stok_awal: qty
      })

    if (insertError) throw insertError

    addToast({ type: 'success', message: 'Produk berhasil ditambahkan' })
    
    // Reset Form
    productName.value = ''
    hargaAsli.value = ''
    hargaJual.value = ''
    stokAwal.value = ''

    // Reload list
    await productStore.fetchTodayProducts()
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal menambahkan produk' })
  } finally {
    isAddingProduct.value = false
  }
}

const handleToggleActive = async (product: ProductAdmin) => {
  if (sessionStore.isClosed) return
  
  try {
    await productStore.toggleActive(product.id, !product.is_active)
    addToast({ type: 'success', message: 'Status produk diubah' })
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal mengubah status' })
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Header -->
    <header class="bg-brand-900 text-white px-4 py-3 shadow-md flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/setup" class="hover:text-brand-100 transition mr-1 flex items-center">
          <Icon name="heroicons:arrow-left" class="w-5 h-5" />
        </NuxtLink>
        <div class="flex flex-col">
          <h1 class="text-md font-black tracking-tight leading-tight">Kelola Produk</h1>
          <p class="text-xs text-white/85 font-semibold leading-none mt-0.5">
            {{ currentUmkm?.nama_umkm || 'Memuat...' }}
          </p>
        </div>
      </div>
    </header>

    <!-- Content -->
    <main class="flex-grow p-6 max-w-3xl w-full mx-auto flex flex-col gap-6">
      
      <!-- Add Product Card -->
      <div v-if="!sessionStore.isClosed" class="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm flex flex-col gap-4">
        <h2 class="text-sm font-bold text-slate-800">Tambah Produk Baru</h2>
        
        <form @submit.prevent="handleAddProductSubmit" class="flex flex-col gap-4">
          <AppInput
            v-model="productName"
            label="Nama Produk"
            placeholder="Contoh: Kue Kering Nastar"
            required
          />

          <div class="grid grid-cols-2 gap-4">
            <AppInput
              v-model="hargaAsli"
              label="Harga UMKM (Rp)"
              type="number"
              placeholder="Contoh: 10000"
              input-mode="numeric"
              required
            />
            
            <AppInput
              v-model="hargaJual"
              label="Harga Jual POS (Rp)"
              type="number"
              placeholder="Contoh: 12000"
              input-mode="numeric"
              required
            />
          </div>

          <AppInput
            v-model="stokAwal"
            label="Stok Awal"
            type="number"
            placeholder="Contoh: 10"
            input-mode="numeric"
            required
          />

          <AppButton
            type="submit"
            :loading="isAddingProduct"
            class="self-end mt-2"
          >
            Tambah ke Catalog
          </AppButton>
        </form>
      </div>

      <!-- Configured Products list -->
      <div class="flex flex-col gap-3">
        <h2 class="text-sm font-bold text-slate-700">Daftar Produk Hari Ini</h2>
        
        <div v-if="umkmProducts.length === 0" class="text-center py-12 bg-white rounded-2xl border border-dashed text-slate-400 text-sm">
          Belum ada produk yang didaftarkan untuk mitra ini hari ini.
        </div>

        <div v-else class="flex flex-col gap-3">
          <div
            v-for="p in umkmProducts"
            :key="p.id"
            class="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex items-center justify-between"
          >
            <div class="flex flex-col gap-1 w-2/3">
              <h3 class="font-bold text-slate-800 text-sm leading-snug">{{ p.nama_produk }}</h3>
              <div class="flex gap-4 text-xs font-mono font-bold text-slate-400 mt-1">
                <span>Harga UMKM: {{ useCurrencyFormat((p as ProductAdmin).harga_asli) }}</span>
                <span>Harga POS: {{ useCurrencyFormat(p.harga_jual) }}</span>
              </div>
              <div class="flex gap-4 text-xs font-mono font-semibold text-slate-500 mt-1">
                <span>Stok Awal: {{ p.stok_awal }}</span>
                <span>Sisa: {{ p.stok_sekarang }}</span>
              </div>
            </div>
            
            <!-- Active Toggle Button -->
            <div class="flex items-center gap-3">
              <span class="text-xs font-bold" :class="p.is_active ? 'text-success' : 'text-slate-400'">
                {{ p.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
              <button
                @click="handleToggleActive(p as ProductAdmin)"
                :disabled="sessionStore.isClosed"
                class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none min-h-[24px] min-w-[44px]"
                :class="p.is_active ? 'bg-brand-900' : 'bg-slate-200'"
              >
                <span
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                  :class="p.is_active ? 'translate-x-5' : 'translate-x-0'"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

    </main>
    <AppToast />
  </div>
</template>
