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
import AppModal from '~/components/ui/AppModal.vue'
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

// Edit State
const isEditModalOpen = ref(false)
const editingProduct = ref<ProductAdmin | null>(null)
const editName = ref('')
const editHargaAsli = ref<number | ''>('')
const editHargaJual = ref<number | ''>('')
const editStokAwal = ref<number | ''>('')
const editStokSekarang = ref<number | ''>('')
const isUpdatingProduct = ref(false)

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

const openEditModal = (product: ProductAdmin) => {
  editingProduct.value = product
  editName.value = product.nama_produk
  editHargaAsli.value = product.harga_asli
  editHargaJual.value = product.harga_jual
  editStokAwal.value = product.stok_awal
  editStokSekarang.value = product.stok_sekarang
  isEditModalOpen.value = true
}

const handleEditProductSubmit = async () => {
  if (!editingProduct.value) return
  if (!editName.value.trim() || editHargaAsli.value === '' || editHargaJual.value === '' || editStokAwal.value === '' || editStokSekarang.value === '') {
    addToast({ type: 'warning', message: 'Harap isi semua kolom' })
    return
  }

  const cost = Number(editHargaAsli.value)
  const sell = Number(editHargaJual.value)
  const qtyAwal = Number(editStokAwal.value)
  const qtySekarang = Number(editStokSekarang.value)

  if (cost <= 0 || qtyAwal < 0 || qtySekarang < 0) {
    addToast({ type: 'warning', message: 'Nilai input tidak valid' })
    return
  }

  if (sell < cost) {
    addToast({ type: 'warning', message: 'Harga jual tidak boleh lebih rendah dari harga UMKM' })
    return
  }

  isUpdatingProduct.value = true
  try {
    await productStore.updateProduct(editingProduct.value.id, {
      nama_produk: editName.value.trim(),
      harga_asli: cost,
      harga_jual: sell,
      stok_awal: qtyAwal,
      stok_sekarang: qtySekarang
    })
    addToast({ type: 'success', message: 'Produk berhasil diperbarui' })
    isEditModalOpen.value = false
    editingProduct.value = null
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memperbarui produk' })
  } finally {
    isUpdatingProduct.value = false
  }
}

const handleDelete = async (productId: string) => {
  if (sessionStore.isClosed) return
  if (!confirm('Apakah Anda yakin ingin menghapus produk ini?')) return

  try {
    await productStore.deleteProduct(productId)
    addToast({ type: 'success', message: 'Produk berhasil dihapus' })
  } catch (e: any) {
    console.error(e)
    const errorMsg = e?.message || ''
    if (errorMsg.includes('foreign key constraint') || errorMsg.includes('violates foreign key')) {
      addToast({ type: 'danger', message: 'Gagal menghapus: Produk ini sudah memiliki transaksi hari ini.' })
    } else {
      addToast({ type: 'danger', message: 'Gagal menghapus produk' })
    }
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col">
    <!-- Header -->
    <header class="sticky top-0 z-30 bg-gradient-to-r from-brand-900 to-brand-700 text-white px-4 py-4 shadow-md flex items-center justify-between backdrop-blur-md">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/setup" class="hover:bg-white/10 p-2 rounded-xl transition flex items-center justify-center">
          <Icon name="heroicons:arrow-left" class="w-5 h-5" />
        </NuxtLink>
        <div class="flex flex-col">
          <h1 class="text-md font-black tracking-tight leading-tight">Kelola Produk</h1>
          <p class="text-xs text-brand-200 font-semibold font-mono leading-none mt-0.5">
            {{ currentUmkm?.nama_umkm || 'Memuat...' }}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <ProfileDropdown variant="dark" />
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
            class="bg-white border border-slate-150 rounded-2xl p-4 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <!-- Product Details -->
            <div class="flex flex-col gap-1 sm:w-2/3">
              <h3 class="font-bold text-slate-800 text-sm leading-snug">{{ p.nama_produk }}</h3>
              <div class="grid grid-cols-2 gap-x-2 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-4 text-xs mt-1">
                <div class="text-slate-400 font-mono font-bold flex flex-col sm:flex-row sm:gap-1">
                  <span class="text-[10px] sm:text-xs">Harga UMKM:</span>
                  <span>{{ useCurrencyFormat((p as ProductAdmin).harga_asli) }}</span>
                </div>
                <div class="text-slate-400 font-mono font-bold flex flex-col sm:flex-row sm:gap-1">
                  <span class="text-[10px] sm:text-xs">Harga POS:</span>
                  <span>{{ useCurrencyFormat(p.harga_jual) }}</span>
                </div>
                <div class="text-slate-500 font-mono font-semibold flex flex-col sm:flex-row sm:gap-1">
                  <span class="text-[10px] sm:text-xs">Stok Awal:</span>
                  <span>{{ p.stok_awal }}</span>
                </div>
                <div class="text-slate-500 font-mono font-semibold flex flex-col sm:flex-row sm:gap-1">
                  <span class="text-[10px] sm:text-xs">Sisa:</span>
                  <span>{{ p.stok_sekarang }}</span>
                </div>
              </div>
            </div>
            
            <!-- Active Toggle & Edit/Delete Button -->
            <div class="flex items-center justify-between sm:justify-end gap-3 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
              <!-- Edit/Delete buttons -->
              <div class="flex items-center gap-1">
                <button
                  @click="handleDelete(p.id)"
                  :disabled="sessionStore.isClosed"
                  class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
                  title="Hapus Produk"
                >
                  <Icon name="heroicons:trash" class="w-5 h-5" />
                </button>

                <button
                  @click="openEditModal(p as ProductAdmin)"
                  :disabled="sessionStore.isClosed"
                  class="p-1.5 text-slate-400 hover:text-brand-900 hover:bg-slate-100 rounded-lg transition disabled:opacity-50 min-h-[32px] min-w-[32px] flex items-center justify-center"
                  title="Edit Produk"
                >
                  <Icon name="heroicons:pencil-square" class="w-5 h-5" />
                </button>
              </div>

              <!-- Toggle switch container -->
              <div class="flex items-center gap-2">
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
      </div>

    </main>

    <!-- Edit Product Modal -->
    <AppModal
      v-model="isEditModalOpen"
      title="Edit Detail Produk"
      size="md"
    >
      <form @submit.prevent="handleEditProductSubmit" class="flex flex-col gap-4 py-2">
        <AppInput
          v-model="editName"
          label="Nama Produk"
          placeholder="Nama produk..."
          required
        />

        <div class="grid grid-cols-2 gap-4">
          <AppInput
            v-model="editHargaAsli"
            label="Harga UMKM (Rp)"
            type="number"
            placeholder="Harga asli..."
            input-mode="numeric"
            required
          />
          
          <AppInput
            v-model="editHargaJual"
            label="Harga Jual POS (Rp)"
            type="number"
            placeholder="Harga jual..."
            input-mode="numeric"
            required
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <AppInput
            v-model="editStokAwal"
            label="Stok Awal"
            type="number"
            placeholder="Stok awal..."
            input-mode="numeric"
            required
          />

          <AppInput
            v-model="editStokSekarang"
            label="Sisa Stok Saat Ini"
            type="number"
            placeholder="Sisa stok..."
            input-mode="numeric"
            required
          />
        </div>
      </form>

      <template #footer>
        <AppButton
          variant="secondary"
          @click="isEditModalOpen = false"
        >
          Batal
        </AppButton>
        <AppButton
          :loading="isUpdatingProduct"
          @click="handleEditProductSubmit"
        >
          Simpan Perubahan
        </AppButton>
      </template>
    </AppModal>

    <AppToast />
  </div>
</template>
