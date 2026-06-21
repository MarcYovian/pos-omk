<!-- pages/pos.vue -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '~/stores/auth'
import { useSessionStore } from '~/stores/session'
import { useProductStore } from '~/stores/products'
import { useCartStore } from '~/stores/cart'
import { useUmkmStore } from '~/stores/umkm'
import { useNetworkStatus } from '~/composables/useNetworkStatus'
import { useToast } from '~/composables/useToast'
import AppButton from '~/components/ui/AppButton.vue'
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
const isCartOpen = ref(false)
const isCheckoutOpen = ref(false)
const cashInput = ref('')
const successChange = ref<number | null>(null)
const successTimer = ref<any>(null)
const paymentMethod = ref<'cash' | 'qris'>('cash')
const lastPaymentMethod = ref<'cash' | 'qris'>('cash')

// Numpad state
const numpadValue = ref('')

// Computed Properties
const activeTabProducts = computed(() => {
  let list = productStore.products
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
  const num = Number(numpadValue.value)
  if (!numpadValue.value || isNaN(num)) return -1
  return num - cartStore.total
})

const isChangeOk = computed(() => changeAmount.value >= 0)

// Lifecycle
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
  umkmStore.subscribeRealtime()
})

onUnmounted(() => {
  productStore.unsubscribeRealtime()
  umkmStore.unsubscribeRealtime()
  if (successTimer.value) clearTimeout(successTimer.value)
})

// Close cart when no items
watch(() => cartStore.itemCount, (val) => {
  if (val === 0) isCartOpen.value = false
})

// Handlers
const handleAddToCart = (product: any) => {
  cartStore.addItem(product)
  // On mobile, briefly show the cart button pulse
}

const openCheckout = () => {
  if (cartStore.isEmpty) return
  numpadValue.value = ''
  paymentMethod.value = 'cash'
  isCartOpen.value = false
  // Small delay to let cart sheet close
  setTimeout(() => { isCheckoutOpen.value = true }, 200)
}

// Numpad handlers
const numpadPress = (key: string) => {
  if (key === 'del') {
    numpadValue.value = numpadValue.value.slice(0, -1)
    return
  }
  if (key === 'clear') {
    numpadValue.value = ''
    return
  }
  // Max 12 digits
  if (numpadValue.value.length >= 12) return
  numpadValue.value += key
}

// Quick presets: round up to neat amounts
const quickAmounts = computed(() => {
  const total = cartStore.total
  const options: number[] = []
  // Exact
  options.push(total)
  // Round to nearest 5k, 10k, 20k, 50k
  const roundTo = (n: number, r: number) => Math.ceil(n / r) * r
  const r5k = roundTo(total, 5000)
  const r10k = roundTo(total, 10000)
  const r50k = roundTo(total, 50000)
  const r100k = roundTo(total, 100000)
  ;[r5k, r10k, r50k, r100k].forEach(v => {
    if (v > total && !options.includes(v)) options.push(v)
  })
  return options.slice(0, 4)
})

const handleCheckoutSubmit = async () => {
  const isQris = paymentMethod.value === 'qris'
  const amount = isQris ? cartStore.total : Number(numpadValue.value)
  if (!isQris && (!numpadValue.value || isNaN(amount) || changeAmount.value < 0)) return

  try {
    const res = await cartStore.checkout(amount, paymentMethod.value) as any
    isCheckoutOpen.value = false
    searchQuery.value = ''
    selectedUmkmFilter.value = 'all'
    numpadValue.value = ''

    if (res && 'offline' in res) {
      // offline handled inside store
    } else {
      successChange.value = res.kembalian
      lastPaymentMethod.value = paymentMethod.value
      const successMsg = isQris
        ? 'Transaksi QRIS berhasil diselesaikan'
        : `Transaksi berhasil! Kembalian: ${useCurrencyFormat(res.kembalian)}`
      addToast({
        type: 'success',
        message: successMsg
      })
      successTimer.value = setTimeout(() => {
        successChange.value = null
        lastPaymentMethod.value = 'cash'
      }, 3000)
    }

    await productStore.fetchTodayProducts()
  } catch (e: any) {
    addToast({
      type: 'danger',
      message: e.message || 'Transaksi gagal, silakan coba lagi'
    })
  }
}

const numpadKeys = [
  ['7','8','9'],
  ['4','5','6'],
  ['1','2','3'],
  ['clear','0','del'],
]
</script>

<template>
  <div class="pos-root">
    <!-- Offline Banner -->
    <OfflineBanner />

    <!-- ═══════════════════════ HEADER ═══════════════════════ -->
    <header class="pos-header">
      <div class="pos-header-left">
        <div class="pos-logo">
          <span class="pos-logo-icon">🛒</span>
          <span class="pos-logo-text">OMK POS</span>
        </div>
        <span class="pos-role-badge">{{ authStore.role }}</span>
      </div>
      <div class="pos-header-right">
        <NuxtLink
          v-if="authStore.role === 'admin'"
          to="/admin"
          class="pos-header-btn pos-header-btn--admin"
        >
          <Icon name="heroicons:cog-6-tooth" class="w-4 h-4" />
          <span class="hidden sm:inline">Admin</span>
        </NuxtLink>
        <ProfileDropdown variant="dark" />
      </div>
    </header>

    <!-- ═══════════════════════ MAIN ═══════════════════════ -->
    <main class="pos-main">

      <!-- ── Session closed states ── -->
      <div v-if="!sessionStore.currentSession" class="pos-state-screen">
        <div class="pos-state-icon pos-state-icon--locked">
          <Icon name="heroicons:lock-closed" class="w-10 h-10" />
        </div>
        <h2 class="pos-state-title">Sesi Belum Dibuka</h2>
        <p class="pos-state-desc">Silakan hubungi admin untuk membuka sesi hari ini.</p>
        <NuxtLink v-if="authStore.role === 'admin'" to="/admin/setup">
          <button class="pos-state-cta">Buka Sesi Sekarang</button>
        </NuxtLink>
      </div>

      <div v-else-if="sessionStore.isClosed" class="pos-state-screen">
        <div class="pos-state-icon pos-state-icon--closed">
          <Icon name="heroicons:no-symbol" class="w-10 h-10" />
        </div>
        <h2 class="pos-state-title">Sesi Sudah Ditutup</h2>
        <p class="pos-state-desc">Sesi transaksi hari ini sudah diselesaikan dan dikunci oleh admin.</p>
      </div>

      <!-- ── Active POS Layout ── -->
      <template v-else>

        <!-- LEFT: Product area (full on mobile, 3/5 on desktop) -->
        <div class="pos-product-area">

          <!-- Search & UMKM filter -->
          <div class="pos-search-bar">
            <div class="pos-search-row">
              <div class="pos-search-input-wrap">
                <Icon name="heroicons:magnifying-glass" class="pos-search-icon" />
                <input
                  v-model="searchQuery"
                  type="search"
                  placeholder="Cari produk..."
                  class="pos-search-input"
                />
              </div>
              <!-- Product count (desktop only) -->
              <span class="pos-product-count">
                {{ activeTabProducts.length }} produk
              </span>
            </div>

            <!-- UMKM filter pills -->
            <div class="pos-filter-pills">
              <button
                @click="selectedUmkmFilter = 'all'"
                class="pos-pill"
                :class="{ 'pos-pill--active': selectedUmkmFilter === 'all' }"
              >
                Semua
              </button>
              <button
                v-for="u in umkmStore.umkmList"
                :key="u.id"
                @click="selectedUmkmFilter = u.id"
                class="pos-pill"
                :class="{ 'pos-pill--active': selectedUmkmFilter === u.id }"
              >
                {{ u.nama_umkm }}
              </button>
            </div>
          </div>

          <!-- Loading state -->
          <div v-if="productStore.isLoading" class="pos-product-loading">
            <div class="pos-spinner"></div>
            <p>Memuat produk...</p>
          </div>

          <!-- Empty state -->
          <div v-else-if="activeTabProducts.length === 0" class="pos-product-empty">
            <Icon name="heroicons:face-frown" class="w-14 h-14 text-slate-300 mb-3" />
            <p class="font-semibold text-slate-500">Produk tidak ditemukan</p>
            <p class="text-sm text-slate-400 mt-1">Coba kata kunci lain atau stok mungkin habis.</p>
          </div>

          <!-- Product grid -->
          <div v-else class="pos-product-grid">
            <button
              v-for="p in activeTabProducts"
              :key="p.id"
              @click="handleAddToCart(p)"
              class="pos-product-card"
            >
              <!-- UMKM label -->
              <span class="pos-product-umkm">{{ p.umkm?.nama_umkm || 'UMKM' }}</span>

              <!-- Product name -->
              <h3 class="pos-product-name">{{ p.nama_produk }}</h3>

              <!-- Stock & Price -->
              <div class="pos-product-footer">
                <span class="pos-product-stock">
                  <Icon name="heroicons:cube" class="w-3 h-3" />
                  {{ p.stok_sekarang }}
                </span>
                <span class="pos-product-price">{{ useCurrencyFormat(p.harga_jual) }}</span>
              </div>

              <!-- Add indicator -->
              <div class="pos-product-add-ring">
                <Icon name="heroicons:plus" class="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>

        <!-- RIGHT: Cart (desktop sidebar) -->
        <aside class="pos-cart-sidebar">
          <div class="pos-cart-header">
            <div class="pos-cart-header-left">
              <Icon name="heroicons:shopping-cart" class="w-5 h-5" />
              <span>Keranjang</span>
              <span v-if="cartStore.itemCount > 0" class="pos-cart-badge">{{ cartStore.itemCount }}</span>
            </div>
            <span v-if="!cartStore.isEmpty" class="pos-cart-header-total">{{ useCurrencyFormat(cartStore.total) }}</span>
          </div>

          <!-- Cart items -->
          <div class="pos-cart-body">
            <div v-if="cartStore.isEmpty" class="pos-cart-empty">
              <Icon name="heroicons:shopping-bag" class="w-12 h-12 text-slate-200 mb-2" />
              <p class="text-slate-400 text-sm">Keranjang kosong</p>
              <p class="text-slate-300 text-xs mt-1">Ketuk produk untuk menambah</p>
            </div>

            <TransitionGroup name="cart-item" tag="div" class="pos-cart-items">
              <div
                v-for="item in cartStore.items"
                :key="item.product_id"
                class="pos-cart-item"
              >
                <!-- Stock Warning -->
                <div v-if="item.hasStockWarning" class="pos-cart-warning">
                  <Icon name="heroicons:exclamation-triangle-solid" class="w-3.5 h-3.5" />
                  Stok habis di kasir lain
                </div>
                <div class="pos-cart-item-row">
                  <p class="pos-cart-item-name">{{ item.nama_produk }}</p>
                  <button @click="cartStore.removeItem(item.product_id)" class="pos-cart-remove">
                    <Icon name="heroicons:trash" class="w-4 h-4" />
                  </button>
                </div>
                <div class="pos-cart-item-row pos-cart-item-row--bottom">
                  <!-- Qty control -->
                  <div class="pos-qty-control">
                    <button @click="cartStore.decrementItem(item.product_id)" class="pos-qty-btn">−</button>
                    <span class="pos-qty-val">{{ item.qty }}</span>
                    <button
                      @click="cartStore.addItem({ id: item.product_id, stok_sekarang: item.stok_sekarang } as any)"
                      class="pos-qty-btn"
                    >+</button>
                  </div>
                  <div class="pos-cart-item-price">
                    <span class="pos-cart-item-unit">{{ useCurrencyFormat(item.harga_jual) }}</span>
                    <span class="pos-cart-item-sub">{{ useCurrencyFormat(item.subtotal) }}</span>
                  </div>
                </div>
              </div>
            </TransitionGroup>
          </div>

          <!-- Cart footer -->
          <div class="pos-cart-footer">
            <div class="pos-cart-total-row">
              <span class="pos-cart-total-label">Total</span>
              <span class="pos-cart-total-val">{{ useCurrencyFormat(cartStore.total) }}</span>
            </div>
            <button
              @click="openCheckout"
              :disabled="cartStore.isEmpty"
              class="pos-pay-btn"
            >
              <Icon name="heroicons:credit-card" class="w-5 h-5" />
              Bayar Sekarang
            </button>
          </div>
        </aside>

      </template>
    </main>

    <!-- ═══════════════════════ MOBILE CART FAB ═══════════════════════ -->
    <Transition name="fab">
      <button
        v-if="sessionStore.currentSession && !sessionStore.isClosed && cartStore.itemCount > 0"
        @click="isCartOpen = true"
        class="pos-fab"
      >
        <Icon name="heroicons:shopping-cart" class="w-6 h-6" />
        <span class="pos-fab-label">Keranjang</span>
        <span class="pos-fab-count">{{ cartStore.itemCount }}</span>
        <span class="pos-fab-total">{{ useCurrencyFormat(cartStore.total) }}</span>
      </button>
    </Transition>

    <!-- ═══════════════════════ MOBILE CART DRAWER ═══════════════════════ -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="isCartOpen" class="pos-drawer-overlay" @click.self="isCartOpen = false">
          <div class="pos-drawer">
            <!-- Drawer handle -->
            <div class="pos-drawer-handle-bar" @click="isCartOpen = false">
              <div class="pos-drawer-handle"></div>
            </div>

            <!-- Drawer header -->
            <div class="pos-drawer-header">
              <div class="flex items-center gap-2">
                <Icon name="heroicons:shopping-cart" class="w-5 h-5 text-brand-700" />
                <span class="font-bold text-slate-800">Keranjang Belanja</span>
                <span class="pos-cart-badge">{{ cartStore.itemCount }}</span>
              </div>
              <button @click="isCartOpen = false" class="pos-drawer-close">
                <Icon name="heroicons:x-mark" class="w-5 h-5" />
              </button>
            </div>

            <!-- Drawer items -->
            <div class="pos-drawer-body">
              <TransitionGroup name="cart-item" tag="div" class="pos-cart-items">
                <div
                  v-for="item in cartStore.items"
                  :key="item.product_id"
                  class="pos-cart-item"
                >
                  <div v-if="item.hasStockWarning" class="pos-cart-warning">
                    <Icon name="heroicons:exclamation-triangle-solid" class="w-3.5 h-3.5" />
                    Stok habis di kasir lain
                  </div>
                  <div class="pos-cart-item-row">
                    <p class="pos-cart-item-name">{{ item.nama_produk }}</p>
                    <button @click="cartStore.removeItem(item.product_id)" class="pos-cart-remove">
                      <Icon name="heroicons:trash" class="w-4 h-4" />
                    </button>
                  </div>
                  <div class="pos-cart-item-row pos-cart-item-row--bottom">
                    <div class="pos-qty-control">
                      <button @click="cartStore.decrementItem(item.product_id)" class="pos-qty-btn">−</button>
                      <span class="pos-qty-val">{{ item.qty }}</span>
                      <button
                        @click="cartStore.addItem({ id: item.product_id, stok_sekarang: item.stok_sekarang } as any)"
                        class="pos-qty-btn"
                      >+</button>
                    </div>
                    <div class="pos-cart-item-price">
                      <span class="pos-cart-item-unit">{{ useCurrencyFormat(item.harga_jual) }}</span>
                      <span class="pos-cart-item-sub">{{ useCurrencyFormat(item.subtotal) }}</span>
                    </div>
                  </div>
                </div>
              </TransitionGroup>
            </div>

            <!-- Drawer footer -->
            <div class="pos-drawer-footer">
              <div class="pos-cart-total-row">
                <span class="pos-cart-total-label">Total Tagihan</span>
                <span class="pos-cart-total-val">{{ useCurrencyFormat(cartStore.total) }}</span>
              </div>
              <button @click="openCheckout" class="pos-pay-btn pos-pay-btn--large">
                <Icon name="heroicons:credit-card" class="w-5 h-5" />
                Lanjut Bayar
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════════════ CHECKOUT MODAL ═══════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isCheckoutOpen" class="pos-checkout-overlay" @click.self="isCheckoutOpen = false">
          <div class="pos-checkout-modal">
            <!-- Header -->
            <div class="pos-checkout-header">
              <button @click="isCheckoutOpen = false" class="pos-checkout-back">
                <Icon name="heroicons:arrow-left" class="w-5 h-5" />
              </button>
              <h2 class="pos-checkout-title">Proses Pembayaran</h2>
              <div class="w-8"></div>
            </div>

            <!-- Payment Method Tabs -->
            <div class="pos-payment-tabs">
              <button
                @click="paymentMethod = 'cash'"
                class="pos-payment-tab"
                :class="{ 'pos-payment-tab--active': paymentMethod === 'cash' }"
              >
                <Icon name="heroicons:banknotes" class="w-4 h-4" />
                <span>Tunai / Cash</span>
              </button>
              <button
                @click="paymentMethod = 'qris'"
                class="pos-payment-tab"
                :class="{ 'pos-payment-tab--active': paymentMethod === 'qris' }"
              >
                <Icon name="heroicons:qr-code" class="w-4 h-4" />
                <span>QRIS Statis</span>
              </button>
            </div>

            <!-- Total display -->
            <div class="pos-checkout-total-card">
              <p class="pos-checkout-total-label">Total Tagihan</p>
              <p class="pos-checkout-total-amount">{{ useCurrencyFormat(cartStore.total) }}</p>
            </div>

            <!-- CASH PAYMENT FLOW -->
            <div v-if="paymentMethod === 'cash'" class="flex flex-col gap-3 w-full">
              <!-- Cash received display -->
              <div class="pos-checkout-input-display">
                <span class="pos-checkout-input-label">Uang Diterima</span>
                <span class="pos-checkout-input-value" :class="{ 'pos-checkout-input-value--filled': numpadValue }">
                  {{ numpadValue ? useCurrencyFormat(Number(numpadValue)) : 'Rp 0' }}
                </span>
              </div>

              <!-- Quick amount presets -->
              <div class="pos-quick-amounts">
                <button
                  v-for="amt in quickAmounts"
                  :key="amt"
                  @click="numpadValue = String(amt)"
                  class="pos-quick-btn"
                  :class="{ 'pos-quick-btn--active': numpadValue === String(amt) }"
                >
                  {{ useCurrencyFormat(amt) }}
                </button>
              </div>

              <!-- Change display -->
              <Transition name="fade">
                <div v-if="numpadValue" class="pos-change-display" :class="isChangeOk ? 'pos-change-display--ok' : 'pos-change-display--err'">
                  <template v-if="isChangeOk">
                    <Icon name="heroicons:check-circle-solid" class="w-5 h-5" />
                    <span>Kembalian: <strong>{{ useCurrencyFormat(changeAmount) }}</strong></span>
                  </template>
                  <template v-else>
                    <Icon name="heroicons:x-circle-solid" class="w-5 h-5" />
                    <span>Kurang: <strong>{{ useCurrencyFormat(Math.abs(changeAmount)) }}</strong></span>
                  </template>
                </div>
              </Transition>

              <!-- Numpad -->
              <div class="pos-numpad">
                <div v-for="(row, ri) in numpadKeys" :key="ri" class="pos-numpad-row">
                  <button
                    v-for="key in row"
                    :key="key"
                    @click="numpadPress(key)"
                    class="pos-numpad-key"
                    :class="{
                      'pos-numpad-key--action': key === 'del' || key === 'clear',
                      'pos-numpad-key--del': key === 'del',
                    }"
                  >
                    <template v-if="key === 'del'">
                      <Icon name="heroicons:backspace" class="w-6 h-6" />
                    </template>
                    <template v-else-if="key === 'clear'">
                      <span class="text-xs font-bold">CLR</span>
                    </template>
                    <template v-else>{{ key }}</template>
                  </button>
                </div>
              </div>
            </div>

            <!-- QRIS PAYMENT FLOW -->
            <div v-else class="flex flex-col items-center gap-3 w-full py-1">
              <div class="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-center gap-3 w-full">
                <img
                  src="/qris.jpg"
                  alt="QRIS Statis"
                  class="w-44 h-44 object-contain rounded-xl shadow-sm border border-slate-100"
                />
                <div class="text-center">
                  <span class="text-[9px] text-slate-400 font-bold tracking-wider uppercase block">NAMA MERCHANT</span>
                  <span class="text-xs font-extrabold text-slate-800 block">TOKO VENTURA</span>
                </div>
              </div>
              <div class="bg-amber-50 border border-amber-100 text-amber-900 text-xs px-3.5 py-3 rounded-xl flex items-start gap-2.5 leading-relaxed font-semibold">
                <Icon name="heroicons:information-circle-solid" class="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                <span>
                  Pelanggan men-scan QRIS dan memasukkan nominal manual sebesar <strong class="text-amber-950 font-black">{{ useCurrencyFormat(cartStore.total) }}</strong>. Tekan tombol di bawah setelah bukti transfer divalidasi.
                </span>
              </div>
            </div>

            <!-- Submit -->
            <button
              @click="handleCheckoutSubmit"
              :disabled="cartStore.isCheckingOut || (paymentMethod === 'cash' && (!numpadValue || !isChangeOk))"
              class="pos-checkout-submit"
              :class="{ 'pos-checkout-submit--qris': paymentMethod === 'qris' }"
            >
              <template v-if="cartStore.isCheckingOut">
                <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses...
              </template>
              <template v-else>
                <Icon :name="paymentMethod === 'qris' ? 'heroicons:check-badge' : 'heroicons:check'" class="w-5 h-5" />
                {{ paymentMethod === 'qris' ? 'Konfirmasi Lunas ✓' : 'Selesaikan Transaksi' }}
              </template>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════════════ SUCCESS OVERLAY ═══════════════════════ -->
    <Transition name="success-pop">
      <div v-if="successChange !== null" class="pos-success-overlay">
        <div class="pos-success-card">
          <div class="pos-success-icon">✓</div>
          <h3 class="pos-success-title">Transaksi Berhasil!</h3>
          <div v-if="lastPaymentMethod === 'cash'" class="pos-success-change-box">
            <p class="pos-success-change-label">Kembalian</p>
            <p class="pos-success-change-val">{{ useCurrencyFormat(successChange) }}</p>
          </div>
          <div v-else class="pos-success-change-box !bg-emerald-50 !border-emerald-200">
            <p class="pos-success-change-label !text-emerald-700">Metode Pembayaran</p>
            <p class="pos-success-change-val !text-emerald-800">QRIS Statis Lunas</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Global Toast -->
    <AppToast />
  </div>
</template>

<style scoped>
/* ─────────────────────────────────────────────
   ROOT & LAYOUT
───────────────────────────────────────────── */
.pos-root {
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  background: #f1f5f9;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ─────────────────────────────────────────────
   HEADER
───────────────────────────────────────────── */
.pos-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 52px;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  box-shadow: 0 2px 12px rgba(0,0,0,0.25);
}

.pos-header-left {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.pos-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pos-logo-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.pos-logo-text {
  font-size: 1.125rem;
  font-weight: 900;
  color: white;
  letter-spacing: -0.02em;
}

.pos-role-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2);
  padding: 2px 8px;
  border-radius: 999px;
}

.pos-header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pos-header-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  transition: all 0.15s;
  cursor: pointer;
}
.pos-header-btn:hover {
  background: rgba(255,255,255,0.2);
  color: white;
}
.pos-header-btn--admin {
  background: rgba(99,102,241,0.3);
  border-color: rgba(99,102,241,0.5);
  color: #a5b4fc;
}
.pos-header-btn--admin:hover {
  background: rgba(99,102,241,0.5);
  color: white;
}

/* ─────────────────────────────────────────────
   MAIN LAYOUT
───────────────────────────────────────────── */
.pos-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

@media (min-width: 768px) {
  .pos-main {
    flex-direction: row;
    height: calc(100dvh - 52px);
    overflow: hidden;
  }
}

/* ─────────────────────────────────────────────
   SESSION STATE SCREENS
───────────────────────────────────────────── */
.pos-state-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 2rem;
  text-align: center;
  gap: 0.75rem;
}

.pos-state-icon {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.pos-state-icon--locked {
  background: #f1f5f9;
  color: #94a3b8;
}

.pos-state-icon--closed {
  background: #fee2e2;
  color: #ef4444;
}

.pos-state-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1e293b;
}

.pos-state-desc {
  font-size: 0.875rem;
  color: #64748b;
  max-width: 320px;
}

.pos-state-cta {
  margin-top: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: #0f172a;
  color: white;
  font-weight: 700;
  border-radius: 12px;
  font-size: 0.9rem;
  transition: all 0.15s;
  cursor: pointer;
}
.pos-state-cta:hover {
  background: #1e3a5f;
  transform: translateY(-1px);
}

/* ─────────────────────────────────────────────
   PRODUCT AREA
───────────────────────────────────────────── */
.pos-product-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding-bottom: 80px; /* space for FAB on mobile */
}

@media (min-width: 768px) {
  .pos-product-area {
    padding-bottom: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
}

/* ─────────────────────────────────────────────
   SEARCH BAR
───────────────────────────────────────────── */
.pos-search-bar {
  padding: 0.75rem;
  background: white;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  /* Sticky inside a scroll container on desktop works natively */
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
  box-shadow: 0 1px 0 #e2e8f0;
}

@media (min-width: 768px) {
  .pos-search-bar {
    padding: 0.875rem 1rem;
  }
}

.pos-search-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.pos-product-count {
  display: none;
  white-space: nowrap;
  font-size: 0.78rem;
  font-weight: 600;
  color: #94a3b8;
  flex-shrink: 0;
}

@media (min-width: 768px) {
  .pos-product-count {
    display: inline;
  }
}

.pos-search-input-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  padding: 0 0.75rem;
  transition: border-color 0.15s;
  flex: 1; /* expand in row */
}
.pos-search-input-wrap:focus-within {
  border-color: #3b82f6;
  background: white;
}

.pos-search-icon {
  width: 1rem;
  height: 1rem;
  color: #94a3b8;
  flex-shrink: 0;
}

.pos-search-input {
  flex: 1;
  padding: 0.625rem 0;
  font-size: 0.9rem;
  color: #1e293b;
  background: transparent;
  border: none;
  outline: none;
  min-height: 44px;
}
.pos-search-input::placeholder {
  color: #94a3b8;
}

.pos-filter-pills {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.pos-filter-pills::-webkit-scrollbar { display: none; }

.pos-pill {
  flex-shrink: 0;
  padding: 0.375rem 0.875rem;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  border: 1.5px solid transparent;
  transition: all 0.15s;
  min-height: 36px;
  white-space: nowrap;
  cursor: pointer;
}
.pos-pill:hover {
  background: #e2e8f0;
  color: #374151;
}
.pos-pill--active {
  background: #0f172a;
  color: white;
  border-color: #0f172a;
}

/* ─────────────────────────────────────────────
   PRODUCT GRID
───────────────────────────────────────────── */
.pos-product-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  color: #94a3b8;
  font-size: 0.875rem;
}

.pos-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid #e2e8f0;
  border-top-color: #0f172a;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.pos-product-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
}

.pos-product-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.625rem;
  padding: 0.75rem;
  /* Do NOT use flex:1 or overflow here — let the parent scroll */
  align-content: start;
  background: #f1f5f9;
}

@media (min-width: 480px) {
  .pos-product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 768px) {
  .pos-product-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.875rem;
    padding: 1rem;
  }
}

@media (min-width: 1024px) {
  .pos-product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1280px) {
  .pos-product-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.pos-product-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.75rem;
  background: white;
  border: 1.5px solid #f1f5f9;
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  /* Fixed height — never stretch */
  height: 120px;
  overflow: hidden;
}
.pos-product-card:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}
.pos-product-card:active {
  transform: scale(0.97);
  box-shadow: none;
}
@media (min-width: 768px) {
  .pos-product-card {
    height: 130px;
    padding: 0.875rem;
  }
}

.pos-product-umkm {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #3b82f6;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 999px;
  align-self: flex-start;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pos-product-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.pos-product-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: auto;
}

.pos-product-stock {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #94a3b8;
}

.pos-product-price {
  font-size: 0.85rem;
  font-weight: 900;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.pos-product-add-ring {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #0f172a;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.7);
  transition: all 0.15s;
}
.pos-product-card:hover .pos-product-add-ring {
  opacity: 1;
  transform: scale(1);
}

/* ─────────────────────────────────────────────
   DESKTOP CART SIDEBAR
───────────────────────────────────────────── */
.pos-cart-sidebar {
  display: none;
}

@media (min-width: 768px) {
  .pos-cart-sidebar {
    display: flex;
    flex-direction: column;
    width: 300px;
    flex-shrink: 0;
    background: white;
    border-left: 1px solid #e2e8f0;
    height: 100%;
    overflow: hidden;
    box-shadow: -2px 0 12px rgba(0,0,0,0.04);
  }
}

@media (min-width: 1024px) {
  .pos-cart-sidebar {
    width: 340px;
  }
}

@media (min-width: 1280px) {
  .pos-cart-sidebar {
    width: 380px;
  }
}

.pos-cart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1e293b;
  flex-shrink: 0;
}

.pos-cart-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #1e293b;
}

.pos-cart-header-total {
  font-size: 0.875rem;
  font-weight: 800;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
  background: #f1f5f9;
  padding: 3px 10px;
  border-radius: 999px;
}

.pos-cart-badge {
  margin-left: auto;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: #0f172a;
  color: white;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pos-cart-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.pos-cart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 160px;
  padding: 2rem 1rem;
}

.pos-cart-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pos-cart-item {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 0.625rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pos-cart-warning {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: #d97706;
  background: #fef3c7;
  border: 1px solid #fde68a;
  padding: 3px 8px;
  border-radius: 6px;
}

.pos-cart-item-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
}

.pos-cart-item-row--bottom {
  align-items: center;
}

.pos-cart-item-name {
  font-size: 0.825rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.3;
  flex: 1;
}

.pos-cart-remove {
  color: #cbd5e1;
  padding: 2px;
  border-radius: 6px;
  transition: all 0.15s;
  cursor: pointer;
  flex-shrink: 0;
}
.pos-cart-remove:hover {
  color: #ef4444;
  background: #fee2e2;
}

/* Qty control */
.pos-qty-control {
  display: flex;
  align-items: center;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
  background: white;
}

.pos-qty-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  color: #475569;
  transition: all 0.1s;
  cursor: pointer;
}
.pos-qty-btn:hover {
  background: #f1f5f9;
}
.pos-qty-btn:active {
  background: #e2e8f0;
}

.pos-qty-val {
  min-width: 28px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 800;
  color: #1e293b;
}

.pos-cart-item-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.pos-cart-item-unit {
  font-size: 0.7rem;
  color: #94a3b8;
  font-variant-numeric: tabular-nums;
}

.pos-cart-item-sub {
  font-size: 0.875rem;
  font-weight: 800;
  color: #1e293b;
  font-variant-numeric: tabular-nums;
}

/* Cart footer */
.pos-cart-footer {
  padding: 0.875rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: white;
}

.pos-cart-total-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pos-cart-total-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
}

.pos-cart-total-val {
  font-size: 1.375rem;
  font-weight: 900;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.pos-pay-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  color: white;
  font-size: 0.9rem;
  font-weight: 700;
  border-radius: 12px;
  transition: all 0.15s;
  cursor: pointer;
  min-height: 48px;
}
.pos-pay-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(15,23,42,0.3);
}
.pos-pay-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.pos-pay-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.pos-pay-btn--large {
  padding: 1rem;
  font-size: 1rem;
  border-radius: 14px;
}

/* ─────────────────────────────────────────────
   MOBILE FAB
───────────────────────────────────────────── */
.pos-fab {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  color: white;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: 0 8px 24px rgba(15,23,42,0.4);
  cursor: pointer;
  transition: all 0.2s;
  min-height: 52px;
  white-space: nowrap;
}
.pos-fab:hover {
  transform: translateX(-50%) translateY(-2px);
  box-shadow: 0 12px 32px rgba(15,23,42,0.5);
}
.pos-fab:active {
  transform: translateX(-50%) scale(0.97);
}

@media (min-width: 768px) {
  .pos-fab {
    display: none;
  }
}

.pos-fab-label {
  font-size: 0.85rem;
}

.pos-fab-count {
  background: white;
  color: #0f172a;
  font-size: 0.75rem;
  font-weight: 900;
  border-radius: 999px;
  min-width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

.pos-fab-total {
  font-size: 0.85rem;
  font-weight: 800;
  color: rgba(255,255,255,0.85);
  font-variant-numeric: tabular-nums;
}

/* ─────────────────────────────────────────────
   MOBILE CART DRAWER
───────────────────────────────────────────── */
.pos-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.pos-drawer {
  background: white;
  border-radius: 24px 24px 0 0;
  max-height: 85dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.pos-drawer-handle-bar {
  padding: 0.75rem;
  display: flex;
  justify-content: center;
  cursor: pointer;
}

.pos-drawer-handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: #cbd5e1;
}

.pos-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem 0.75rem;
  border-bottom: 1px solid #f1f5f9;
}

.pos-drawer-close {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  background: #f1f5f9;
  transition: all 0.15s;
  cursor: pointer;
}
.pos-drawer-close:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.pos-drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
}

.pos-drawer-footer {
  padding: 1rem;
  border-top: 1px solid #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: white;
  box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
}

/* ─────────────────────────────────────────────
   CHECKOUT MODAL
───────────────────────────────────────────── */
.pos-checkout-overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

@media (min-width: 640px) {
  .pos-checkout-overlay {
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(6px);
    justify-content: center;
    align-items: center;
    padding: 1rem;
  }
}

.pos-checkout-modal {
  background: white;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 1rem 1.5rem;
  overflow-y: auto;
}

@media (min-width: 640px) {
  .pos-checkout-modal {
    flex: none;
    width: 100%;
    max-width: 420px;
    border-radius: 24px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.3);
    padding: 0 1.5rem 1.5rem;
  }
}

.pos-checkout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 0 0.5rem;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.pos-checkout-back {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
}
.pos-checkout-back:hover {
  background: #e2e8f0;
}

.pos-checkout-title {
  font-size: 1rem;
  font-weight: 800;
  color: #1e293b;
}

.pos-checkout-total-card {
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%);
  border-radius: 16px;
  padding: 1.25rem;
  text-align: center;
}

.pos-checkout-total-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.25rem;
}

.pos-checkout-total-amount {
  font-size: 2rem;
  font-weight: 900;
  color: white;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.pos-checkout-input-display {
  background: #f8fafc;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  padding: 0.875rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  transition: border-color 0.15s;
}

.pos-checkout-input-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #94a3b8;
}

.pos-checkout-input-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: #cbd5e1;
  font-variant-numeric: tabular-nums;
  transition: color 0.15s;
}
.pos-checkout-input-value--filled {
  color: #0f172a;
}

.pos-quick-amounts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.pos-quick-btn {
  padding: 0.625rem;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #475569;
  background: #f8fafc;
  transition: all 0.12s;
  cursor: pointer;
  text-align: center;
  font-variant-numeric: tabular-nums;
  min-height: 44px;
}
.pos-quick-btn:hover {
  border-color: #0f172a;
  color: #0f172a;
  background: #f1f5f9;
}
.pos-quick-btn--active {
  background: #0f172a;
  color: white;
  border-color: #0f172a;
}

.pos-change-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
}

.pos-change-display--ok {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}
.pos-change-display--err {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

/* Numpad */
.pos-numpad {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pos-numpad-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.pos-numpad-key {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.375rem;
  font-weight: 700;
  color: #1e293b;
  background: #f8fafc;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.1s;
  -webkit-tap-highlight-color: transparent;
}
.pos-numpad-key:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}
.pos-numpad-key:active {
  background: #e2e8f0;
  transform: scale(0.94);
}

.pos-numpad-key--action {
  background: #f1f5f9;
  color: #475569;
}

.pos-numpad-key--del {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}
.pos-numpad-key--del:hover {
  background: #fee2e2;
}

.pos-checkout-submit {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
  font-size: 1rem;
  font-weight: 800;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 56px;
  margin-top: 0.25rem;
}
.pos-checkout-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(22,163,74,0.4);
}
.pos-checkout-submit:active:not(:disabled) {
  transform: scale(0.98);
}
.pos-checkout-submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ─────────────────────────────────────────────
   SUCCESS OVERLAY
───────────────────────────────────────────── */
.pos-success-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(6px);
  padding: 1.5rem;
}

.pos-success-card {
  background: white;
  border-radius: 28px;
  padding: 2.5rem 2rem;
  text-align: center;
  max-width: 340px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 24px 64px rgba(0,0,0,0.25);
  border: 2px solid #bbf7d0;
}

.pos-success-icon {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: white;
  font-size: 2.5rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(22,163,74,0.4);
  animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes pop-in {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.pos-success-title {
  font-size: 1.375rem;
  font-weight: 900;
  color: #1e293b;
}

.pos-success-change-box {
  background: #f0fdf4;
  border: 2px solid #bbf7d0;
  border-radius: 16px;
  padding: 1rem 2rem;
  width: 100%;
}

.pos-success-change-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #16a34a;
  margin-bottom: 0.25rem;
}

.pos-success-change-val {
  font-size: 2rem;
  font-weight: 900;
  color: #15803d;
  font-variant-numeric: tabular-nums;
}

/* ─────────────────────────────────────────────
   TRANSITIONS
───────────────────────────────────────────── */
/* FAB */
.fab-enter-active, .fab-leave-active { transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.fab-enter-from { transform: translateX(-50%) translateY(80px) scale(0.8); opacity: 0; }
.fab-leave-to { transform: translateX(-50%) translateY(80px) scale(0.8); opacity: 0; }

/* Drawer */
.drawer-enter-active { transition: all 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
.drawer-leave-active { transition: all 0.25s ease-in; }
.drawer-enter-from .pos-drawer { transform: translateY(100%); }
.drawer-leave-to .pos-drawer { transform: translateY(100%); }
.drawer-enter-from { opacity: 0; }
.drawer-leave-to { opacity: 0; }

/* Modal */
.modal-enter-active { transition: all 0.3s ease-out; }
.modal-leave-active { transition: all 0.2s ease-in; }
.modal-enter-from { opacity: 0; transform: scale(1.04); }
.modal-leave-to { opacity: 0; transform: scale(0.96); }

/* Success pop */
.success-pop-enter-active { transition: all 0.3s ease-out; }
.success-pop-leave-active { transition: all 0.25s ease-in; }
.success-pop-enter-from { opacity: 0; }
.success-pop-leave-to { opacity: 0; }

/* Fade */
.fade-enter-active, .fade-leave-active { transition: all 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }

/* Cart item list */
.cart-item-enter-active { transition: all 0.2s ease-out; }
.cart-item-leave-active { transition: all 0.15s ease-in; }
.cart-item-enter-from { opacity: 0; transform: translateX(-12px); }
.cart-item-leave-to { opacity: 0; height: 0; }

/* Payment Tabs Styling */
.pos-payment-tabs {
  display: flex;
  background: #f1f5f9;
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
  margin-bottom: 0.5rem;
}

.pos-payment-tab {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  font-size: 0.8rem;
  font-weight: 700;
  color: #64748b;
  border-radius: 10px;
  transition: all 0.2s ease;
  border: none;
  background: transparent;
  cursor: pointer;
}

.pos-payment-tab--active {
  background: white;
  color: #1e3a5f;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.pos-checkout-submit--qris {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
  box-shadow: 0 4px 14px rgba(16,185,129,0.3) !important;
}

.pos-checkout-submit--qris:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%) !important;
}
</style>
