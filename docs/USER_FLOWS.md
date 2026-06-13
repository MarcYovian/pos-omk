# USER_FLOWS.md — User Journey & State Flow Reference
# OMK Consignment POS — Frontend Navigation & State Management

> **Document Status:** Ground-Truth v1.1 — Authoritative source for AI Coding Agent  
> **Framework:** Nuxt.js (Vue 3) + Pinia stores  
> **Critical Rule:** Every route, state transition, and API call sequence described here must be implemented exactly. Do not invent shortcuts or alternative navigation paths.

---

## Table of Contents

1. [Route Architecture](#1-route-architecture)
2. [Authentication Flow](#2-authentication-flow)
3. [Flow 1: Morning Setup (Admin)](#3-flow-1-morning-setup-admin)
4. [Flow 2: Cashier POS Transaction](#4-flow-2-cashier-pos-transaction)
5. [Flow 3: Admin Revenue Dashboard (Live)](#5-flow-3-admin-revenue-dashboard-live)
6. [Flow 4: End-of-Day Reconciliation](#6-flow-4-end-of-day-reconciliation)
7. [Flow 5: WhatsApp Report Generation](#7-flow-5-whatsapp-report-generation)
8. [Global State (Pinia Stores)](#8-global-state-pinia-stores)
9. [Error States & Edge Cases](#9-error-states--edge-cases)
10. [Offline Flow](#10-offline-flow)

---

## 1. Route Architecture

```
/                        → Redirect to /pos (cashier) or /admin (admin) based on role
/login                   → Login page (unauthenticated only)
/pos                     → Cashier POS screen [AUTH: cashier + admin]
/admin                   → Admin dashboard hub [AUTH: admin only]
/admin/setup             → Weekly session setup [AUTH: admin only]
/admin/setup/[umkm_id]   → Product setup for specific UMKM [AUTH: admin only]
/admin/dashboard         → Revenue split dashboard [AUTH: admin only]
/admin/reconciliation    → End-of-day stock reconciliation [AUTH: admin only]
/admin/reports           → WhatsApp report generator [AUTH: admin only]
```

**Route Guards (Nuxt middleware `auth.ts`):**
```
/login         → if authenticated → redirect to role-based home
/pos           → if not authenticated → redirect to /login
/admin/**      → if not authenticated → /login
               → if authenticated but role !== 'admin' → /pos (not /login)
```

**Role-based home:**
- `admin` → `/admin`
- `cashier` → `/pos`

---

## 2. Authentication Flow

### 2.1 Login Flow

```
User opens app
     │
     ▼
Is session token valid?
     │
     ├─ YES → Get role from user_metadata
     │              │
     │              ├─ role: 'admin'   → navigate to /admin
     │              └─ role: 'cashier' → navigate to /pos
     │
     └─ NO → Show /login page
                   │
                   User enters email + password
                   │
                   ▼
            supabase.auth.signInWithPassword()
                   │
                   ├─ SUCCESS → Load user role from user_metadata
                   │                 │
                   │                 ├─ role: 'admin'   → /admin
                   │                 └─ role: 'cashier' → /pos
                   │
                   └─ ERROR   → Show error toast: "Email atau password salah"
                                Stay on /login
```

**Login page state:**
```typescript
// /pages/login.vue
interface LoginState {
  email: string
  password: string
  isLoading: boolean
  errorMessage: string | null
}
```

### 2.2 Session Persistence

- Supabase Auth persists session in localStorage automatically
- On app load (`app.vue` `onMounted`): call `supabase.auth.getSession()`
- If valid session exists: skip login page, route to role-based home
- Token refresh is handled automatically by Supabase client

### 2.3 Logout Flow

```
User taps logout (available in all authenticated views)
     │
     ▼
supabase.auth.signOut()
     │
     ▼
Clear Pinia stores (cart, session, products)
     │
     ▼
Navigate to /login
```

---

## 3. Flow 1: Morning Setup (Admin)

**Trigger:** Admin arrives before mass, opens app, navigates to `/admin/setup`  
**Goal:** Configure which products are active and their stock/price for today's Sunday session

### 3.1 Session Initialization

```
Admin navigates to /admin/setup
     │
     ▼
Check: Does a session record exist for today's date?
  Query: SELECT * FROM sessions WHERE session_date = TODAY
     │
     ├─ YES (status: 'open')
     │    → Load existing session
     │    → Show session summary + product list
     │    → Admin can still edit products
     │
     ├─ YES (status: 'closed')
     │    → Show read-only view
     │    → Banner: "Sesi hari ini sudah ditutup"
     │    → No edits allowed
     │
     └─ NO
          → Show "Buka Sesi Baru" button
          │
          Admin taps "Buka Sesi Baru"
          │
          ▼
     INSERT INTO sessions (session_date, opened_by)
     VALUES (TODAY, current_user_id)
          │
          ├─ SUCCESS → Refresh, show empty product setup
          └─ ERROR   → Toast: "Gagal membuka sesi. Coba lagi."
```

### 3.2 UMKM Product Configuration

```
/admin/setup shows list of UMKM cards
     │
     Each UMKM card shows:
     - UMKM name
     - Number of products configured for today
     - "Tambah Produk" button
     │
     Admin taps "Tambah Produk" on a UMKM card
     │
     ▼
Navigate to /admin/setup/[umkm_id]
     │
     ▼
Show product form + existing products for this UMKM + today's session_date

=== ADD PRODUCT FORM ===
Fields:
  - nama_produk  (text input, required, max 100 chars)
  - harga_asli   (number input, required, > 0, label: "Harga UMKM (Rp)")
  - harga_jual   (number input, required, >= harga_asli, label: "Harga Jual (Rp)")
  - stok_awal    (number input, required, > 0, label: "Jumlah Stok")

Client-side validation on submit:
  ✓ All fields non-empty
  ✓ harga_asli > 0
  ✓ harga_jual >= harga_asli  → else: "Harga jual tidak boleh lebih rendah dari harga UMKM"
  ✓ stok_awal > 0

On valid submit:
  ▼
INSERT INTO products (umkm_id, session_date, nama_produk, harga_asli, harga_jual, stok_awal)
  │
  ├─ SUCCESS → Product appears in list below form; form resets for next product
  └─ ERROR   → Toast: "Gagal menambah produk. Coba lagi."
```

### 3.3 Toggle Product Active State

```
Each product row shows a toggle switch (is_active)
     │
Admin toggles switch
     │
     ▼
UPDATE products SET is_active = [new_value] WHERE id = [product_id]
     │
     ├─ SUCCESS → Toggle reflects new state; POS screen updates in real-time
     └─ ERROR   → Revert toggle UI; Toast: "Gagal mengubah status produk"
```

### 3.4 Setup Completion

```
Admin reviews all products for all UMKM
     │
Admin navigates back to /admin
     │
Admin taps "Buka Kasir" → navigates to /pos (to verify display)
     │
Admin confirms POS looks correct
     │
Sales phase can begin ✓
```

---

## 4. Flow 2: Cashier POS Transaction

**Trigger:** Post-mass (Sunday afternoon), buyers approach the stall  
**Goal:** Process one or more product purchases in a single transaction

### 4.1 POS Screen Initialization

```
Cashier navigates to /pos (or is already there)
     │
     ▼
Fetch today's active products:
  Query view: products_cashier_view
  WHERE session_date = TODAY AND is_active = TRUE
  ORDER BY umkm_id, nama_produk
     │
     ├─ No products found → Show empty state: "Belum ada produk aktif hari ini"
     │                       (Admin needs to complete setup first)
     │
     └─ Products found → Render product grid
                         Subscribe to Realtime: products WHERE session_date = TODAY
```

### 4.2 Building the Cart

```
POS Screen State:
  activeFilter: 'all' | umkm_id  (currently selected UMKM filter tab)
  searchQuery: string             (live text filter)
  cart: CartItem[]               (current order)

=== PRODUCT GRID ===
Display: products WHERE stok_sekarang > 0 AND matches activeFilter AND matches searchQuery

User taps a product card:
     │
     ▼
Is product already in cart?
     │
     ├─ YES → Increment qty by 1
     │           Check: cart_item.qty + 1 > product.stok_sekarang?
     │               YES → Show inline toast: "Stok tidak cukup" (do NOT add)
     │               NO  → Increment qty; update cart subtotal
     │
     └─ NO  → Add new CartItem {product_id, nama_produk, harga_jual, qty: 1}
                  Check: 1 > product.stok_sekarang?
                      YES → Show inline toast: "Stok habis"
                      NO  → Add to cart; update cart subtotal

Cart panel (visible alongside or below product grid):
  - Product name, qty (with − and × controls), subtotal per line
  - Grand total at bottom
  - "Bayar" / "Checkout" button (disabled if cart is empty)
```

### 4.3 Checkout Sequence

```
Cashier taps "Bayar" button
     │
     ▼
Checkout modal/sheet opens:

  [1] Order Summary
      ┌─────────────────────────────────────┐
      │ Kue Kering Nastar    x2    Rp 30.000│
      │ Minuman Jahe         x1    Rp 8.000 │
      │                                     │
      │ TOTAL               Rp 38.000       │
      └─────────────────────────────────────┘

  [2] "Uang Diterima" input field
      - Number keyboard shown (inputmode="numeric")
      - Default: empty (cashier must type)
      - As cashier types:
          kembalian = uang_diterima - total
          Display kembalian live (large, prominent)
          If kembalian < 0: show red "Uang kurang: Rp [amount]"
          If kembalian >= 0: show green "Kembalian: Rp [amount]"

  [3] "Selesai" button
      - Disabled if uang_diterima < total OR uang_diterima is empty

Cashier enters amount, taps "Selesai":
     │
     ▼
Call RPC: complete_transaction({
  p_session_id:       [current_session_id],
  p_cashier_id:       [auth.uid()],
  p_nominal_diterima: [uang_diterima],
  p_cart_items:       [{ product_id, qty, harga_jual }, ...]
})
     │
     ├─ SUCCESS
     │    │
     │    ▼
     │   Show kembalian amount prominently for 3 seconds:
     │   ┌────────────────────────┐
     │   │  ✓ Transaksi Berhasil  │
     │   │  Kembalian: Rp 12.000  │
     │   └────────────────────────┘
     │    │
     │    After 3 seconds:
     │    → Close checkout modal
     │    → Clear cart
     │    → Reset search and filter
     │    → Product grid updates (stok_sekarang already updated via Realtime)
     │
     └─ ERROR
          │
          Parse error message from RPC:
          │
          ├─ "Insufficient stock" → Toast: "Stok [produk] habis saat transaksi. Silakan periksa keranjang."
          │                          Refresh product stock from DB
          │                          Return to cart view (do NOT close modal)
          │
          ├─ "Session is closed"  → Toast: "Sesi sudah ditutup. Hubungi admin."
          │                          Disable POS screen
          │
          └─ Other error         → Toast: "Transaksi gagal. Coba lagi."
                                    Stay in checkout modal
```

### 4.4 Cart Modification

```
In the cart panel:

Tap "−" on a cart line:
     → qty > 1: decrement qty
     → qty = 1: remove item from cart

Tap "×" (remove) on a cart line:
     → Remove item from cart regardless of qty

Cart automatically recalculates subtotal and total after any change.
```

### 4.5 Realtime Stock Update During Active Cart

```
While cashier has items in cart, Realtime update arrives:
  product X stok_sekarang changed to 0 (sold out by another cashier)
     │
     ▼
Is product X currently in the cart?
     │
     ├─ YES → Show persistent warning on cart item:
     │         "⚠ Stok [produk] habis di kasir lain. Konfirmasi dengan admin."
     │         Do NOT auto-remove from cart.
     │         Cashier must manually decide (remove or proceed with error on submit)
     │
     └─ NO  → Update product card UI only (hide or gray out card)
```

---

## 5. Flow 3: Admin Revenue Dashboard (Live)

**Trigger:** Admin wants to monitor sales in real-time during the session  
**Route:** `/admin/dashboard`

```
Admin opens /admin/dashboard
     │
     ▼
Fetch session data:
  1. GET sessions WHERE session_date = TODAY → get session_id + status
  2. Call RPC: get_session_financial_summary(session_id)
     │
     ▼
Display:

  ┌──────────────────────────────────────────────────────┐
  │  SESSION SUMMARY                     [Live • Updating]│
  │                                                      │
  │  Pendapatan Kotor     Rp 450.000                     │
  │  Total Setor UMKM     Rp 320.000                     │
  │  Profit OMK           Rp 130.000                     │
  │  Transaksi            12                             │
  └──────────────────────────────────────────────────────┘

  ┌──── Per-UMKM Table ─────────────────────────────────┐
  │ UMKM        Terjual  Bruto      Setor      Profit   │
  │ Ibu Sari    15 item  Rp180.000  Rp130.000  Rp50.000 │
  │ Pak Budi    8 item   Rp120.000  Rp90.000   Rp30.000 │
  │ ...         [tap to expand]                          │
  └──────────────────────────────────────────────────────┘

Refresh strategy:
  - On page mount: call get_session_financial_summary once
  - Subscribe to Supabase Realtime on `transactions` table for this session
  - On any new transaction event: re-call get_session_financial_summary
  - Auto-refresh every 30 seconds as fallback

Tap on UMKM row → expand to show per-product breakdown (inline, no navigation)
```

---

## 6. Flow 4: End-of-Day Reconciliation

**Trigger:** Session sales are complete, admin wants to close out  
**Route:** `/admin/reconciliation`  
**Precondition:** An open session must exist for today

### 6.1 Reconciliation Entry

```
Admin navigates to /admin/reconciliation
     │
     ▼
Fetch all active products for today's session:
  SELECT * FROM products
  WHERE session_date = TODAY AND is_active = TRUE
  ORDER BY umkm_id, nama_produk
     │
     ▼
For each product, show:
  ┌────────────────────────────────────────────────────┐
  │ [UMKM Badge] Kue Kering Nastar                     │
  │ Sisa Sistem: 3 unit    Sisa Fisik: [___] unit      │
  │                         Status: ⬜ Belum diisi      │
  └────────────────────────────────────────────────────┘

Admin inputs stok_fisik for each product:
  - On input: calculate selisih = stok_fisik - stok_sekarang
  - selisih = 0 → green indicator "✓ Cocok"
  - selisih ≠ 0 → red indicator "⚠ Selisih: [+/-N]"
  - stok_fisik > stok_awal → yellow warning "Lebih dari stok awal?"

Progress indicator: "X dari Y produk sudah diisi"
```

### 6.2 Session Close Action

```
All products filled in
     │
     ▼
"Tutup Sesi" button becomes active

Admin taps "Tutup Sesi"
     │
     ▼
Confirmation dialog:
  ┌────────────────────────────────────────────┐
  │  Tutup Sesi Hari Ini?                      │
  │                                            │
  │  Setelah ditutup, sesi tidak dapat dibuka  │
  │  kembali. Semua data transaksi terkunci.   │
  │                                            │
  │  [Batal]              [Ya, Tutup Sesi]     │
  └────────────────────────────────────────────┘

Admin taps "Ya, Tutup Sesi":
     │
     ▼
Step 1: Batch insert reconciliation records
  FOR EACH product:
    INSERT INTO reconciliation (session_id, product_id, stok_fisik,
                                stok_sekarang_snap, recorded_by)
    VALUES (session_id, product_id, stok_fisik_input,
            current stok_sekarang, admin_id)
    ON CONFLICT (session_id, product_id) DO UPDATE SET stok_fisik = EXCLUDED.stok_fisik
     │
     ▼
Step 2: Call RPC: close_session(session_id, admin_id)
     │
     ├─ SUCCESS
     │    → Navigate to /admin/reports
     │    → Show toast: "Sesi berhasil ditutup. Laporan siap."
     │
     └─ ERROR (e.g., reconciliation incomplete)
          → Show specific error message from RPC
          → Stay on reconciliation page
```

---

## 7. Flow 5: WhatsApp Report Generation

**Trigger:** Admin closes session, needs to send sales reports to each UMKM  
**Route:** `/admin/reports`  
**Precondition:** Session status must be `'closed'`

```
Admin navigates to /admin/reports
     │
     ▼
If session not closed → redirect to /admin/reconciliation with message:
  "Harap tutup sesi terlebih dahulu untuk melihat laporan."
     │
     ▼
Fetch report data:
  JOIN: products → transaction_details → reconciliation
  GROUP BY: umkm_id, product_id
  Include: products with 0 sales (still need to report returns)
     │
     ▼
Display one card per UMKM:

  ┌─────────────────────────────────────────────────────┐
  │  🏷️ Ibu Sari - Kue Kering                           │
  │  wa.me/6281234567890                                │
  │                                                     │
  │  PREVIEW LAPORAN:                                   │
  │  ┌─────────────────────────────────────────────┐   │
  │  │ Halo Ibu Sari! 👋                           │   │
  │  │ Berikut laporan penjualan hari ini:         │   │
  │  │ 📅 Minggu, 15 Juni 2025                    │   │
  │  │                                             │   │
  │  │ DETAIL PENJUALAN:                           │   │
  │  │ • Kue Nastar: 10 terjual, 3 dikembalikan   │   │
  │  │ • Kue Putri Salju: 0 terjual, 5 dikembalikan│  │
  │  │                                             │   │
  │  │ RINGKASAN:                                  │   │
  │  │ Total terjual: 10 item                      │   │
  │  │ Total setoran ke Ibu Sari: Rp 130.000       │   │
  │  │                                             │   │
  │  │ Mohon konfirmasi penerimaan. Terima kasih! 🙏│  │
  │  │ — Tim OMK                                   │   │
  │  └─────────────────────────────────────────────┘   │
  │                                                     │
  │  [📋 Salin Laporan WA]    [Sudah Dikirim ✓]        │
  └─────────────────────────────────────────────────────┘

Admin taps "Salin Laporan WA":
     │
     ▼
navigator.clipboard.writeText(reportText)
     │
     ├─ SUCCESS → Button changes to "✓ Disalin!" for 2 seconds → reverts
     │             Toast: "Laporan Ibu Sari berhasil disalin!"
     │
     └─ ERROR   → Show modal with full text and instruction:
                  "Salin teks berikut secara manual:"
                  [Full report text, selectable]
                  [Tombol Close]

Admin taps "Sudah Dikirim ✓":
  → Visual checkmark on card (local state only, not persisted to DB in MVP)
  → Helps admin track which UMKM have been notified
```

### 7.1 Report Text Generation (Frontend Logic)

```typescript
function generateUMKMReport(umkm: UMKM, products: ProductReport[], sessionDate: Date): string {
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(sessionDate)

  const productLines = products.map(p => {
    const qtySold = p.stok_awal - p.stok_sekarang       // or from SUM(td.qty)
    const qtyReturned = p.reconciliation.stok_fisik
    return `• ${p.nama_produk}: ${qtySold} terjual, ${qtyReturned} dikembalikan`
  }).join('\n')

  const totalSold = products.reduce((sum, p) => sum + (p.stok_awal - p.stok_sekarang), 0)
  const totalRemittance = products.reduce((sum, p) => sum + p.remittance_due, 0)
  const formattedRemittance = new Intl.NumberFormat('id-ID').format(totalRemittance)

  return `Halo ${umkm.nama_umkm}! 👋

Berikut laporan penjualan hari ini:
📅 ${formattedDate}

DETAIL PENJUALAN:
${productLines}

RINGKASAN:
Total terjual: ${totalSold} item
Total setoran ke ${umkm.nama_umkm}: Rp${formattedRemittance}

Mohon konfirmasi penerimaan. Terima kasih atas kerja samanya! 🙏
— Tim OMK`
}
```

---

## 8. Global State (Pinia Stores)

### 8.1 `useAuthStore`

```typescript
// stores/auth.ts
interface AuthState {
  user: User | null           // Supabase auth user object
  role: 'admin' | 'cashier' | null
  isLoading: boolean
}

// Actions:
// - login(email, password)
// - logout()
// - refreshSession()
// - getRole() → reads from user.user_metadata.role
```

### 8.2 `useSessionStore`

```typescript
// stores/session.ts
interface SessionState {
  currentSession: Session | null  // Today's sessions record
  sessionDate: string             // TODAY in 'YYYY-MM-DD' format (Jakarta TZ)
  isLoading: boolean
}

// Actions:
// - fetchTodaySession()     → GET sessions WHERE session_date = today
// - openSession()           → INSERT into sessions
// - closeSession(adminId)   → call close_session RPC
// Getters:
// - isOpen: boolean
// - isClosed: boolean
// - sessionId: UUID | null
```

### 8.3 `useProductStore`

```typescript
// stores/products.ts
interface ProductState {
  products: Product[]         // All active products for today (cashier view: no harga_asli)
  isLoading: boolean
  lastFetchedAt: Date | null
  realtimeSubscription: RealtimeChannel | null
}

// Actions:
// - fetchTodayProducts()    → query products_cashier_view
// - subscribeRealtime()     → Supabase Realtime on products table
// - unsubscribeRealtime()
// - updateProductStock(productId, newStock)  → called from realtime handler
// - toggleActive(productId, isActive)        → admin only

// Getters:
// - getByUmkm(umkmId): Product[]
// - getActive(): Product[]        → is_active AND stok_sekarang > 0
// - search(query): Product[]
```

### 8.4 `useCartStore`

```typescript
// stores/cart.ts
interface CartItem {
  product_id:   string
  nama_produk:  string
  harga_jual:   number
  qty:          number
  subtotal:     number   // computed: qty * harga_jual
  stok_sekarang: number  // snapshot at time of add (for validation)
  hasStockWarning: boolean  // set true if realtime update shows stock = 0
}

interface CartState {
  items: CartItem[]
  isCheckingOut: boolean
  checkoutError: string | null
}

// Getters:
// - total: number            → SUM(subtotal)
// - isEmpty: boolean
// - itemCount: number        → SUM(qty)
// - hasWarnings: boolean     → any item.hasStockWarning

// Actions:
// - addItem(product)         → add or increment; validate against stok_sekarang
// - removeItem(productId)
// - decrementItem(productId)
// - clearCart()
// - updateStockWarning(productId, inStock: boolean)  → called from realtime handler
// - checkout(nominalDiterima) → calls complete_transaction RPC
```

### 8.5 `useUmkmStore`

```typescript
// stores/umkm.ts
interface UmkmState {
  umkmList: UMKM[]
  isLoading: boolean
}

// Actions:
// - fetchAll()
// - addUmkm(umkm)
// - updateUmkm(id, updates)
```

---

## 9. Error States & Edge Cases

### 9.1 Session Not Found

```
POS screen loads but no session exists for today:
→ Show: "Belum ada sesi hari ini. Hubungi admin untuk membuka sesi."
→ POS is disabled (no cart, no product grid shown)
→ Admin-role users see link to /admin/setup
```

### 9.2 Session Already Closed

```
Cashier tries to checkout but session was closed mid-session:
→ complete_transaction RPC returns error: "Session is closed"
→ Show modal: "Sesi sudah ditutup oleh admin. Kasir tidak dapat memproses transaksi."
→ Disable POS screen
→ Show "Sesi Ditutup" banner at top of screen
```

### 9.3 Stock Race Condition

```
Cashier A and Cashier B both add the last unit of Product X to their carts.
Cashier A completes checkout first.
Cashier B taps "Selesai":
→ complete_transaction RPC detects stok_sekarang < qty needed
→ Returns: "Insufficient stock for product [X]. Available: 0, Requested: 1"
→ Frontend toast: "Stok [nama produk] habis saat transaksi. Hapus dari keranjang."
→ Cart item marked with ⚠ warning
→ Realtime update also updates product card to stok = 0
```

### 9.4 No Products Configured

```
Cashier opens /pos but admin hasn't set up products yet:
→ Show empty state illustration
→ Text: "Produk belum tersedia. Tunggu admin menyiapkan stok."
→ Auto-refresh every 30 seconds
```

### 9.5 Insufficient Cash Entered

```
Cashier enters uang_diterima < total in checkout:
→ "Selesai" button remains disabled
→ Kembalian shows in red: "Uang kurang: Rp [amount]"
→ No API call made
```

### 9.6 Reconciliation: Partial Entry Attempt

```
Admin tries to tap "Tutup Sesi" with some products not yet filled:
→ Button disabled until all stok_fisik fields have a value
→ Tooltip/hint: "[N] produk belum diisi"
```

---

## 10. Offline Flow

### 10.1 Offline Detection

```typescript
// composables/useNetworkStatus.ts
const isOnline = ref(navigator.onLine)
window.addEventListener('online', () => isOnline.value = true)
window.addEventListener('offline', () => isOnline.value = false)
```

### 10.2 Offline Banner

```
When isOnline = false:
→ Show sticky banner at top of all screens:
   ┌────────────────────────────────────────────────────┐
   │ 🔴 Tidak ada koneksi. Mode offline aktif.          │
   └────────────────────────────────────────────────────┘
→ POS screen still shows cached product data
→ Real-time stock sync paused (last known values shown)
```

### 10.3 Offline Transaction Queuing

```
Cashier completes checkout while offline:
     │
     ▼
Save transaction to IndexedDB queue:
  {
    id:               uuid (locally generated),
    timestamp:        ISO string,
    session_id:       string,
    cashier_id:       string,
    nominal_diterima: number,
    cart_items:       CartItem[],
    status:           'pending'
  }
     │
     ▼
Show: "Transaksi disimpan. Akan dikirim saat terhubung kembali."
Update local product stock (optimistic update from cached data)
Reset cart as normal
     │
     ▼
When back online:
  For each queued transaction (in order by timestamp):
    → Call complete_transaction RPC
    → If SUCCESS: mark as 'synced', remove from queue
    → If FAIL (e.g., stock conflict): mark as 'failed', alert admin
  Show sync summary toast: "X transaksi berhasil disinkronkan."
```

### 10.4 What Doesn't Work Offline

| Feature | Offline Behavior |
|---|---|
| Login / Logout | ❌ Not possible (requires auth server) |
| Add new products (Admin) | ❌ Not possible |
| Close session (Admin) | ❌ Not possible |
| View revenue dashboard | ❌ Not possible (requires live DB) |
| Process transactions (Cashier) | ✅ Queued and synced on reconnect |
| View product grid | ✅ Shows cached data from last fetch |
| Cart management | ✅ Fully functional locally |
