<!-- pages/pos.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useSessionStore } from '~/stores/session'
import { useProductStore } from '~/stores/products'
import { useCartStore } from '~/stores/cart'
import { useUmkmStore } from '~/stores/umkm'
import { useNetworkStatus } from '~/composables/useNetworkStatus'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
import AppInput from '~/components/ui/AppInput.vue'
import AppModal from '~/components/ui/AppModal.vue'
import AppToast from '~/components/ui/AppToast.vue'
import OfflineBanner from '~/components/ui/OfflineBanner.vue'

definePageMeta({
  middleware: ['auth']
})

// Stores & Composables
const authStore = useAuthStore()
const sessionStore = useSessionStore()
const productStore = useProductStore()
const cartStore = useCartStore()
const umkmStore = useUmkmStore()
const { isOnline } = useNetworkStatus()
const { addToast } = useToast()

// Local State
const searchQuery = ref('')
const selectedUmkmFilter = ref('all')
const isCheckoutModalOpen = ref(false)
const cashReceived = ref<number | ''>('')
const successChange = ref<number | null>(null)
const successTimer = ref<any>(null)

// Computed Properties
const activeTabProducts = computed(() => {
  let list = productStore.products
  // Only show active and in-stock products
  list = list.filter(p => p.is_active && p.stok_sekarang > 0)
  
  if (selectedUmkmFilter.value !== 'all') {
    list = list.filter(p => p.umkm_id === selectedUmkmFilter.value)
  }
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p => p.nama_produk.toLowerCase().includes(q))
  }
  
  return list
})

const changeAmount = computed(() => {
  if (cashReceived.value === '' || cashReceived.value === null) return -1
  return Number(cashReceived.value) - cartStore.total
})

// Lifecycle Hook
const loadData = async () => {
  try {
    await sessionStore.fetchTodaySession()
    if (sessionStore.currentSession) {
      await Promise.all([
        productStore.fetchTodayProducts(),
        umkmStore.fetchAll()
      ])
    }
  } catch (e) {
    addToast({ type: 'danger', message: 'Gagal memuat data' })
  }
}

onMounted(() => {
  loadData()
  productStore.subscribeRealtime()
})

onUnmounted(() => {
  productStore.unsubscribeRealtime()
  if (successTimer.value) clearTimeout(successTimer.value)
})

// Handlers
const handleAddToCart = (product: any) => {
  cartStore.addItem(product)
}

const openCheckout = () => {
  if (cartStore.isEmpty) return
  cashReceived.value = ''
  isCheckoutModalOpen.value = true
}

const handleCheckoutSubmit = async () => {
  if (cashReceived.value === '' || changeAmount.value < 0) return

  try {
    const res = await cartStore.checkout(Number(cashReceived.value))
    
    isCheckoutModalOpen.value = false
    searchQuery.value = ''
    selectedUmkmFilter.value = 'all'

    if (res && 'offline' in res) {
      // offline handled inside store
    } else {
      successChange.value = res.kembalian
      addToast({
        type: 'success',
        message: `Transaksi berhasil! Kembalian: ${useCurrencyFormat(res.kembalian)}`
      })
      
      successTimer.value = setTimeout(() => {
        successChange.value = null
      }, 3000)
    }
    
    // Refresh products stock after checkout
    await productStore.fetchTodayProducts()
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Transaksi gagal, silakan coba lagi'
    })
  }
}
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <!-- Offline Banner -->
    <OfflineBanner />

    <!-- App Header -->
    <header class="bg-brand-900 text-white px-4 py-3 shadow-md flex items-center justify-between sticky top-0 z-30">
      <div class="flex items-center gap-3">
        <h1 class="text-xl font-black tracking-tight">OMK POS</h1>
        <span class="text-xs bg-white/20 px-2 py-0.5 rounded font-semibold text-white/95 capitalize">
          {{ authStore.role }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink
          v-if="authStore.role === 'admin'"
          to="/admin"
          class="text-xs bg-brand-600 hover:bg-brand-500 font-semibold px-3 py-1.5 rounded-lg transition"
        >
          Menu Admin
        </NuxtLink>
        <button
          @click="authStore.logout()"
          class="text-xs bg-white/10 hover:bg-white/20 font-semibold px-3 py-1.5 rounded-lg transition"
        >
          Keluar
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-grow flex flex-col md:flex-row min-h-0 bg-slate-50">
      
      <!-- Session check block -->
      <div v-if="!sessionStore.currentSession" class="w-full text-center py-16 px-4">
        <Icon name="heroicons:lock-closed" class="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h2 class="text-lg font-bold text-slate-800">Sesi Belum Dibuka</h2>
        <p class="text-slate-500 text-sm mt-1 mb-6">Silakan hubungi admin untuk membuka sesi hari ini.</p>
        <NuxtLink v-if="authStore.role === 'admin'" to="/admin/setup">
          <AppButton size="md">Buka Sesi Sekarang</AppButton>
        </NuxtLink>
      </div>

      <div v-else-if="sessionStore.isClosed" class="w-full text-center py-16 px-4">
        <Icon name="heroicons:no-symbol" class="w-12 h-12 text-danger mx-auto mb-4" />
        <h2 class="text-lg font-bold text-slate-800">Sesi Sudah Ditutup</h2>
        <p class="text-slate-500 text-sm mt-1">Sesi transaksi hari ini sudah diselesaikan dan dikunci oleh admin.</p>
      </div>

      <template v-else>
        <!-- Product list (left side) -->
        <div class="flex-grow flex flex-col p-4 gap-4 w-full md:w-3/5 lg:w-2/3">
          
          <!-- Search & filter bar -->
          <div class="flex flex-col gap-3 bg-white p-4 rounded-2xl shadow-sm">
            <AppInput
              v-model="searchQuery"
              placeholder="Cari nama produk..."
              class="w-full"
            />
            
            <!-- UMKM Filter Tabs -->
            <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                @click="selectedUmkmFilter = 'all'"
                class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition min-h-[36px]"
                :class="selectedUmkmFilter === 'all' ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              >
                Semua
              </button>
              <button
                v-for="u in umkmStore.umkmList"
                :key="u.id"
                @click="selectedUmkmFilter = u.id"
                class="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition min-h-[36px]"
                :class="selectedUmkmFilter === u.id ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'"
              >
                {{ u.nama_umkm }}
              </button>
            </div>
          </div>

          <!-- Product Grid -->
          <div class="flex-grow">
            <div v-if="activeTabProducts.length === 0" class="text-center py-12">
              <p class="text-slate-500 text-sm">Tidak ada produk yang cocok atau stok habis.</p>
            </div>
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                v-for="p in activeTabProducts"
                :key="p.id"
                @click="handleAddToCart(p)"
                class="bg-white border border-slate-100 rounded-2xl p-3 shadow-sm hover:shadow-md text-left transition flex flex-col gap-2 relative active:scale-95 duration-150 min-h-[120px]"
              >
                <!-- Badge UMKM -->
                <span class="text-[10px] bg-brand-50 text-brand-900 font-bold px-2 py-0.5 rounded-full self-start">
                  {{ p.umkm?.nama_umkm || 'UMKM' }}
                </span>
                
                <h3 class="text-sm font-bold text-slate-800 line-clamp-2 leading-tight mt-1 flex-grow">
                  {{ p.nama_produk }}
                </h3>
                
                <div class="flex items-end justify-between mt-auto">
                  <span class="text-xs font-mono font-bold text-slate-500">
                    Sisa: {{ p.stok_sekarang }}
                  </span>
                  <span class="font-mono text-sm font-black text-brand-900 leading-none">
                    {{ useCurrencyFormat(p.harga_jual) }}
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Cart Panel (right side) -->
        <div class="w-full md:w-2/5 lg:w-1/3 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-4 flex flex-col shadow-lg sticky bottom-0 md:h-[calc(100vh-48px)] md:top-[48px]">
          <h2 class="text-md font-bold text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Icon name="heroicons:shopping-cart" class="w-5 h-5 text-brand-900" />
            <span>Keranjang Belanja</span>
            <span v-if="cartStore.itemCount > 0" class="text-xs bg-brand-900 text-white px-2 py-0.5 rounded-full font-bold">
              {{ cartStore.itemCount }}
            </span>
          </h2>

          <!-- Cart items list -->
          <div class="flex-grow overflow-y-auto py-3 gap-2 flex flex-col">
            <div v-if="cartStore.isEmpty" class="text-center text-slate-400 py-12 flex flex-col items-center gap-2">
              <Icon name="heroicons:shopping-bag" class="w-10 h-10 text-slate-300" />
              <p class="text-sm">Keranjang masih kosong</p>
            </div>
            
            <div
              v-for="item in cartStore.items"
              :key="item.product_id"
              class="flex flex-col border border-slate-100 rounded-xl p-3 gap-2 bg-slate-50/50"
            >
              <!-- Stock Warning Alert inside cart -->
              <div v-if="item.hasStockWarning" class="text-[10px] bg-amber-50 text-warning border border-amber-100 px-2 py-1 rounded font-semibold flex items-center gap-1">
                <Icon name="heroicons:exclamation-triangle-solid" class="w-3.5 h-3.5" />
                <span>Stok habis di kasir lain. Konfirmasi admin.</span>
              </div>

              <div class="flex items-start justify-between">
                <h4 class="text-sm font-bold text-slate-800 leading-tight w-2/3">{{ item.nama_produk }}</h4>
                <button
                  @click="cartStore.removeItem(item.product_id)"
                  class="text-slate-400 hover:text-danger p-0.5 rounded transition"
                >
                  <Icon name="heroicons:trash" class="w-4 h-4" />
                </button>
              </div>
              
              <div class="flex items-center justify-between mt-auto">
                <!-- Quantity Adjustment -->
                <div class="flex items-center border border-slate-200 bg-white rounded-lg overflow-hidden">
                  <button
                    @click="cartStore.decrementItem(item.product_id)"
                    class="px-2 py-1 text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition min-w-[32px] min-h-[32px]"
                  >
                    -
                  </button>
                  <span class="px-3 text-sm font-bold font-mono text-slate-800">{{ item.qty }}</span>
                  <button
                    @click="cartStore.addItem({ id: item.product_id, stok_sekarang: item.stok_sekarang } as any)"
                    class="px-2 py-1 text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition min-w-[32px] min-h-[32px]"
                  >
                    +
                  </button>
                </div>
                <div class="text-right">
                  <span class="text-xs text-slate-400 block font-mono">{{ useCurrencyFormat(item.harga_jual) }}</span>
                  <span class="font-mono text-sm font-bold text-slate-800">{{ useCurrencyFormat(item.subtotal) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sticky Cart Footer -->
          <div class="border-t border-slate-100 pt-4 mt-auto flex flex-col gap-3">
            <div class="flex justify-between items-end">
              <span class="text-sm font-semibold text-slate-500">Total Tagihan:</span>
              <span class="font-mono text-pos-price text-brand-900 leading-none tabular-nums">
                {{ useCurrencyFormat(cartStore.total) }}
              </span>
            </div>

            <AppButton
              @click="openCheckout"
              :disabled="cartStore.isEmpty"
              size="lg"
              full-width
            >
              Bayar
            </AppButton>
          </div>
        </div>
      </template>
    </main>

    <!-- Prominent Success Change Banner overlay -->
    <div
      v-if="successChange !== null"
      class="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
    >
      <div class="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-green-100 flex flex-col items-center gap-4 animate-bounce">
        <Icon name="heroicons:check-circle-solid" class="w-16 h-16 text-success animate-pulse" />
        <h3 class="text-xl font-black text-slate-800">Transaksi Berhasil!</h3>
        <div class="bg-green-50 px-6 py-4 rounded-2xl w-full border border-green-100">
          <p class="text-xs font-semibold text-success uppercase tracking-wider">Kembalian Buyer</p>
          <p class="font-mono text-pos-change text-success mt-1 tabular-nums">
            {{ useCurrencyFormat(successChange) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Checkout Modal -->
    <AppModal
      v-model="isCheckoutModalOpen"
      title="Proses Pembayaran"
      size="md"
    >
      <div class="flex flex-col gap-5 py-2">
        <div class="bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div class="flex justify-between text-sm text-slate-500 font-semibold mb-1">
            <span>Total Pembelanjaan:</span>
          </div>
          <div class="font-mono text-pos-price text-slate-800 tabular-nums">
            {{ useCurrencyFormat(cartStore.total) }}
          </div>
        </div>

        <AppInput
          v-model="cashReceived"
          label="Uang Diterima"
          type="number"
          placeholder="Masukkan jumlah uang..."
          input-mode="numeric"
          required
        />

        <div class="mt-2">
          <div v-if="changeAmount < 0 && cashReceived !== ''" class="text-sm font-semibold text-danger bg-red-50 border border-red-100 p-3 rounded-lg flex items-center gap-2">
            <Icon name="heroicons:x-circle-solid" class="w-5 h-5" />
            <span>Uang kurang: {{ useCurrencyFormat(Math.abs(changeAmount)) }}</span>
          </div>
          <div v-else-if="changeAmount >= 0" class="bg-green-50 border border-green-100 p-4 rounded-lg">
            <span class="text-xs font-semibold text-success uppercase tracking-wider block">Kembalian:</span>
            <span class="font-mono text-pos-price text-success leading-tight block mt-1 tabular-nums">
              {{ useCurrencyFormat(changeAmount) }}
            </span>
          </div>
        </div>
      </div>

      <template #footer>
        <AppButton
          variant="secondary"
          @click="isCheckoutModalOpen = false"
        >
          Batal
        </AppButton>
        <AppButton
          :disabled="cashReceived === '' || changeAmount < 0"
          :loading="cartStore.isCheckingOut"
          @click="handleCheckoutSubmit"
        >
          Selesai
        </AppButton>
      </template>
    </AppModal>

    <!-- Global App Toast notifications -->
    <AppToast />
  </div>
</template>
