# Katalog Elemen (Locator Inventory): Real-time POS Cashier Screen (F-02)

> **Dokumen Tahap 6/9 — Inventaris Lokator & Selektor Elemen UI**  
> *Fungsi: Sumber kebenaran tunggal (*Single Source of Truth*) untuk lokator elemen antarmuka yang stabil dan tahan terhadap perubahan styling CSS/DOM. Mengimplementasikan strategi Dual-Strategy Locator (Resilient Semantic Fallback + Rekomendasi Patch Developer).*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-02` |
| **Nama Fitur** | `Real-time POS Cashier Screen` |
| **Prefix Selektor Baku** | `f02-` |
| **Strategi Lokator** | `Dual-Strategy (Semantic Fallback Ready + Developer Patch)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-ui-cataloger-skill)` |

---

## 2. Strategi Selektor & Penanganan Ketiadaan `data-testid`

Karena sebagian besar elemen Vue saat ini belum memiliki atribut `data-testid`, pengujian **TIDAK DIBLOKIR**. Kita menerapkan strategi dua lapis:

### 2.1 Hierarki Selektor Segera (Fallback Siap Pakai)
1. **Prioritas 1 (Resilient ARIA):** `page.getByRole('button', { name: 'Bayar' })`
2. **Prioritas 2 (Label / Placeholder):** `page.getByPlaceholder('Cari...')` atau `page.getByLabel('...')`
3. **Prioritas 3 (Text Content):** `page.getByText('Rp 15.000')` (Hanya untuk asersi konten)
4. **Dilarang Keras:** Menggunakan XPath absolut atau class Tailwind yang dinamis.

### 2.2 Standar Konvensi Nama `data-testid`
Format Baku: `[f02]-[nama-komponen]-[opsional-aksi]`
- `[data-testid="f02-searchQuery-input"]`
- `[data-testid="f02-product-card-1"]`
- `[data-testid="f02-cart-checkout-btn"]`
- `[data-testid="f02-checkout-submit-btn"]`

---

## 3. Inventaris Lokator Elemen (Element Catalog Table)

| Halaman / Komponen | Nama Elemen | Rekomendasi Selector (`data-testid`) | Fallback Selector | Tipe | Status di UI | Aksi yang Didukung |
|---|---|---|---|---|---|---|
| **Katalog / Grid** | Input Pencarian | `[data-testid="f02-searchQuery-input"]` | `input[type="search"], input[placeholder*="Cari"]` | input | `Perlu Ditambahkan` | `fill(), clear()` |
| **Katalog / Grid** | Tombol Filter Kategori | `[data-testid="f02-filter-all-btn"]` | `button:has-text("Semua")` | button | `Perlu Ditambahkan` | `click()` |
| **Katalog / Grid** | Kartu Produk Item | `[data-testid="f02-product-card-1"]` | `.pos-product-card, .cursor-pointer` | card | `Perlu Ditambahkan` | `click()` |
| **Keranjang / Drawer**| Tombol Buka Checkout | `[data-testid="f02-cart-checkout-btn"]` | `button.pos-pay-btn, button:has-text("Bayar")` | button | `Perlu Ditambahkan` | `click()` |
| **Modal Checkout** | Tab Metode Bayar Tunai | `[data-testid="f02-payment-cash-tab"]` | `button:has-text("Tunai"), button:has-text("Cash")` | tab | `Perlu Ditambahkan` | `click()` |
| **Modal Checkout** | Tab Metode Bayar QRIS | `[data-testid="f02-payment-qris-tab"]` | `button:has-text("QRIS")` | tab | `Perlu Ditambahkan` | `click()` |
| **Modal Checkout** | Tombol Preset 50.000 | `[data-testid="f02-numpad-btn-50k"]` | `button:has-text("50.000")` | button | `Perlu Ditambahkan` | `click()` |
| **Modal Checkout** | Tombol Proses Bayar | `[data-testid="f02-checkout-submit-btn"]` | `button:has-text("Selesaikan"), button:has-text("Bayar")` | button | `Perlu Ditambahkan` | `click()` |
| **Status Sistem** | Banner Offline | `[data-testid="offline-banner"]` | `#offline-banner, .offline-banner` | banner | `Sudah Ada (OfflineBanner)` | `toBeVisible()` |
| **Feedback Global** | Toast Notifikasi | `[data-testid="app-toast"]` | `.fixed.bottom-4.right-4, .toast` | toast | `Sudah Ada (AppToast)` | `toBeVisible()` |

---

## 4. Rekomendasi Patch `data-testid` untuk Developer (Action Items)

Daftar rekomendasi atribut `data-testid` yang disarankan untuk ditambahkan ke kode sumber Vue oleh developer guna meningkatkan ketahanan uji otomatis:

#### Tambah `data-testid="f02-searchQuery-input"` pada `searchQuery`
- **File Target:** `app/pages/pos.vue`
- **Elemen:** `<input>`
- **Tujuan:** Menjamin kestabilan locator automation Playwright E2E.
- **Contoh Penambahan:**
  ```html
  <input data-testid="f02-searchQuery-input" class="...">
  ```

#### Tambah `data-testid="f02-buka-sesi-sekarang-btn"` pada `Buka Sesi Sekarang`
- **File Target:** `app/pages/pos.vue`
- **Elemen:** `<button>`
- **Tujuan:** Menjamin kestabilan locator automation Playwright E2E.
- **Contoh Penambahan:**
  ```html
  <button data-testid="f02-buka-sesi-sekarang-btn" class="...">
  ```

#### Tambah `data-testid="f02-semua-btn"` pada `Semua`
- **File Target:** `app/pages/pos.vue`
- **Elemen:** `<button>`
- **Tujuan:** Menjamin kestabilan locator automation Playwright E2E.
- **Contoh Penambahan:**
  ```html
  <button data-testid="f02-semua-btn" class="...">
  ```

#### Tambah `data-testid="f02-u-nama-umkm-btn"` pada `{{ u.nama_umkm }}`
- **File Target:** `app/pages/pos.vue`
- **Elemen:** `<button>`
- **Tujuan:** Menjamin kestabilan locator automation Playwright E2E.
- **Contoh Penambahan:**
  ```html
  <button data-testid="f02-u-nama-umkm-btn" class="...">
  ```

#### Tambah `data-testid="f02-0-btn"` pada `0 }"
            >`
- **File Target:** `app/pages/pos.vue`
- **Elemen:** `<button>`
- **Tujuan:** Menjamin kestabilan locator automation Playwright E2E.
- **Contoh Penambahan:**
  ```html
  <button data-testid="f02-0-btn" class="...">
  ```

#### Tambah `data-testid="f02-action-btn"` pada `Aksi`
- **File Target:** `app/pages/pos.vue`
- **Elemen:** `<button>`
- **Tujuan:** Menjamin kestabilan locator automation Playwright E2E.
- **Contoh Penambahan:**
  ```html
  <button data-testid="f02-action-btn" class="...">
  ```


---

## 5. Status Review & Persetujuan

- [ ] **Katalog Elemen & Fallback Disetujui:** `YA / BELUM`
- [ ] **Rekomendasi Patch Terkirim ke Tim Dev:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 06-test-cases.md:** `(Tanda Tangan / Persetujuan User: ________)`
