# Katalog Elemen (Locator Inventory): UMKM Partner Master Data Management (F-04)

> **Dokumen Tahap 6/9 — Inventaris Lokator & Selektor Elemen UI**  
> *Fungsi: Sumber kebenaran tunggal (*Single Source of Truth*) untuk lokator elemen antarmuka yang stabil dan tahan terhadap perubahan styling CSS/DOM. Mengimplementasikan strategi Dual-Strategy Locator (Resilient Semantic Fallback + Rekomendasi Patch Developer).*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-04` |
| **Nama Fitur** | `UMKM Partner Master Data Management` |
| **Prefix Selektor Baku** | `f04-` |
| **Strategi Lokator** | `Dual-Strategy (Resilient Semantic Fallback + Developer Patch)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-ui-cataloger-skill)` |

---

## 2. Strategi Selektor & Penanganan Ketiadaan `data-testid`

Untuk menghindari ketergantungan rapuh pada styling Tailwind CSS dan class dinamis, pengujian mengadopsi pendekatan dua lapis (*Dual-Strategy*):

### 2.1 Hierarki Selektor Segera (Fallback Siap Pakai)
1. **Prioritas 1 (Resilient ARIA / Role):** `page.getByRole('button', { name: 'Tambah UMKM' })`
2. **Prioritas 2 (Label / Placeholder):** `page.getByPlaceholder('Cari nama mitra atau WA...')` atau `page.getByLabel('Nama UMKM / Pemilik')`
3. **Prioritas 3 (Title / Text Content):** `page.locator('button[title="Edit UMKM"]')`, `page.getByText('Katalog Master')`
4. **Dilarang Keras:** Menggunakan full XPath (`/html/body/div[1]/...`) atau class Tailwind dinamis (`.bg-emerald-500.p-2`).

### 2.2 Standar Konvensi Nama `data-testid`
Format Baku: `f04-[komponen]-[deskripsi]-[tipe]`
- `[data-testid="f04-search-umkm-input"]`
- `[data-testid="f04-add-umkm-btn"]`
- `[data-testid="f04-modal-umkm-name-input"]`
- `[data-testid="f04-modal-umkm-wa-input"]`
- `[data-testid="f04-modal-umkm-submit-btn"]`
- `[data-testid="f04-add-product-btn"]`
- `[data-testid="f04-modal-product-name-input"]`
- `[data-testid="f04-modal-product-cost-input"]`
- `[data-testid="f04-modal-product-submit-btn"]`

---

## 3. Inventaris Lokator Elemen (Element Catalog Table)

### 3.1 Layar Direktori Master UMKM (`/admin/umkm`)

| Komponen / Bagian | Nama Elemen | Rekomendasi Selector (`data-testid`) | Fallback Selector Siap Pakai | Tipe | Status di UI | Aksi yang Didukung |
|---|---|---|---|---|---|---|
| **Top Action Bar** | Input Pencarian Mitra | `[data-testid="f04-search-umkm-input"]` | `input[placeholder*="Cari nama mitra"]` | input | `Rekomendasi Patch` | `fill()`, `clear()` |
| **Top Action Bar** | Tombol "Tambah UMKM" | `[data-testid="f04-add-umkm-btn"]` | `button:has-text("Tambah UMKM")` | button | `Rekomendasi Patch` | `click()` |
| **Grid Kartu Mitra** | Kartu Mitra UMKM | `[data-testid="f04-umkm-card"]` | `div.group:has(h3)` | card | `Rekomendasi Patch` | `toBeVisible()` |
| **Kartu Mitra** | Badge Status Aktif/Nonaktif | `[data-testid="f04-umkm-status-badge"]` | `div.group span.uppercase` | badge | `Rekomendasi Patch` | `toHaveText()` |
| **Kartu Mitra** | Link Tautan WhatsApp | `[data-testid="f04-umkm-wa-link"]` | `a[href^="https://wa.me/"]` | link | `Rekomendasi Patch` | `toHaveAttribute()` |
| **Kartu Mitra** | Tombol Edit Mitra (Ikon Pensil) | `[data-testid="f04-edit-umkm-btn"]` | `button[title="Edit UMKM"]` | button | `Rekomendasi Patch` | `click()` |
| **Kartu Mitra** | Tombol Salin Link (Ikon Clipboard) | `[data-testid="f04-copy-link-btn"]` | `button[title="Salin Link Performa"]` | button | `Rekomendasi Patch` | `click()` |
| **Kartu Mitra** | Tombol "Katalog Master" | `[data-testid="f04-goto-catalog-btn"]` | `a:has-text("Katalog Master")` | button/link | `Rekomendasi Patch` | `click()` |
| **Modal Tambah UMKM** | Field Nama UMKM | `[data-testid="f04-add-name-input"]` | `label:has-text("Nama UMKM") ~ div input` | input | `Rekomendasi Patch` | `fill()`, `clear()` |
| **Modal Tambah UMKM** | Field Nomor WhatsApp | `[data-testid="f04-add-wa-input"]` | `label:has-text("Nomor WhatsApp") ~ div input` | input | `Rekomendasi Patch` | `fill()`, `clear()` |
| **Modal Tambah UMKM** | Tombol Batal | `[data-testid="f04-add-cancel-btn"]` | `button:has-text("Batal")` | button | `Rekomendasi Patch` | `click()` |
| **Modal Tambah UMKM** | Tombol Simpan | `[data-testid="f04-add-submit-btn"]` | `button:has-text("Simpan")` | button | `Rekomendasi Patch` | `click()` |
| **Modal Edit Mitra** | Field Edit Nama UMKM | `[data-testid="f04-edit-name-input"]` | `form input[placeholder="Contoh: Ibu Sari"]` | input | `Rekomendasi Patch` | `fill()`, `clear()` |
| **Modal Edit Mitra** | Field Edit Nomor WhatsApp | `[data-testid="f04-edit-wa-input"]` | `form input[placeholder="Contoh: 628123456789"]` | input | `Rekomendasi Patch` | `fill()`, `clear()` |
| **Modal Edit Mitra** | Switch Status Kemitraan | `[data-testid="f04-edit-active-toggle"]` | `button:has(span.transform)` | toggle | `Rekomendasi Patch` | `click()` |
| **Modal Edit Mitra** | Tombol Simpan Perubahan | `[data-testid="f04-edit-submit-btn"]` | `button:has-text("Simpan Perubahan")` | button | `Rekomendasi Patch` | `click()` |

---

### 3.2 Layar Detail Katalog Master & Performa (`/admin/umkm/[umkm_id]`)

| Komponen / Bagian | Nama Elemen | Rekomendasi Selector (`data-testid`) | Fallback Selector Siap Pakai | Tipe | Status di UI | Aksi yang Didukung |
|---|---|---|---|---|---|---|
| **Header Halaman** | Tombol Panah Kembali | `[data-testid="f04-back-btn"]` | `a[href="/admin/umkm"]` | link | `Rekomendasi Patch` | `click()` |
| **Tab Switcher** | Tab "Katalog Master" | `[data-testid="f04-tab-catalog-btn"]` | `button:has-text("Katalog Master")` | tab | `Rekomendasi Patch` | `click()` |
| **Tab Switcher** | Tab "Statistik Performa" | `[data-testid="f04-tab-performance-btn"]`| `button:has-text("Statistik Performa")` | tab | `Rekomendasi Patch` | `click()` |
| **Katalog Master** | Tombol "Tambah Produk" | `[data-testid="f04-add-product-btn"]` | `button:has-text("Tambah Produk")` | button | `Rekomendasi Patch` | `click()` |
| **Katalog Master** | Kartu Produk Master | `[data-testid="f04-product-card"]` | `div.group:has(span:has-text("Harga Default"))`| card | `Rekomendasi Patch` | `toBeVisible()` |
| **Kartu Produk** | Teks Harga Asli Modal | `[data-testid="f04-product-cost-text"]` | `span.font-mono.tabular-nums` | text | `Rekomendasi Patch` | `toHaveText()` |
| **Kartu Produk** | Tombol Edit Produk (Pensil) | `[data-testid="f04-edit-product-btn"]` | `button[title="Edit Produk"]` | button | `Rekomendasi Patch` | `click()` |
| **Kartu Produk** | Tombol Hapus Produk (Sampah) | `[data-testid="f04-delete-product-btn"]` | `button[title="Hapus Produk"]` | button | `Rekomendasi Patch` | `click()` |
| **Modal Tambah Produk**| Field Nama Produk | `[data-testid="f04-add-prod-name-input"]` | `label:has-text("Nama Produk") ~ div input` | input | `Rekomendasi Patch` | `fill()`, `clear()` |
| **Modal Tambah Produk**| Field Harga Dasar (Rp) | `[data-testid="f04-add-prod-cost-input"]` | `label:has-text("Harga Dasar") ~ div input` | input | `Rekomendasi Patch` | `fill()`, `clear()` |
| **Modal Tambah Produk**| Tombol Simpan Produk | `[data-testid="f04-add-prod-submit-btn"]` | `button:has-text("Simpan")` | button | `Rekomendasi Patch` | `click()` |
| **Modal Edit Produk** | Field Edit Nama Produk | `[data-testid="f04-edit-prod-name-input"]` | `label:has-text("Nama Produk") ~ div input` | input | `Rekomendasi Patch` | `fill()`, `clear()` |
| **Modal Edit Produk** | Field Edit Harga Dasar (Rp) | `[data-testid="f04-edit-prod-cost-input"]` | `label:has-text("Harga Dasar") ~ div input` | input | `Rekomendasi Patch` | `fill()`, `clear()` |
| **Modal Edit Produk** | Switch Status Produk | `[data-testid="f04-edit-prod-active-toggle"]`| `button:has(span.transform)` | toggle | `Rekomendasi Patch` | `click()` |
| **Modal Edit Produk** | Tombol Simpan Perubahan | `[data-testid="f04-edit-prod-submit-btn"]` | `button:has-text("Simpan Perubahan")` | button | `Rekomendasi Patch` | `click()` |
| **Tab Performa** | Metrik Total Terjual | `[data-testid="f04-perf-sold-metric"]` | `h3.font-mono:has-text("pcs")` | metric | `Rekomendasi Patch` | `toHaveText()` |
| **Tab Performa** | Metrik Total Setoran Bersih | `[data-testid="f04-perf-remit-metric"]` | `h3.font-mono.text-brand-950` | metric | `Rekomendasi Patch` | `toHaveText()` |
| **Tab Performa** | Tabel Performa Produk | `[data-testid="f04-perf-products-table"]` | `table:has(th:has-text("Harga Setor"))` | table | `Rekomendasi Patch` | `toBeVisible()` |
| **Tab Performa** | Tabel Riwayat Sesi | `[data-testid="f04-perf-sessions-table"]` | `table:has(th:has-text("Tanggal Sesi"))` | table | `Rekomendasi Patch` | `toBeVisible()` |
| **Sistem Global** | Toast Notifikasi Feedback | `[data-testid="app-toast"]` | `.fixed.bottom-4.right-4` | toast | `Siap Pakai (AppToast)` | `toBeVisible()` |

---

## 4. Rekomendasi Patch `data-testid` untuk Developer

Guna memastikan kestabilan uji otomatis Playwright E2E 100% tahan uji terhadap pembaruan styling CSS di masa mendatang, berikut adalah cuplikan patch atribut `data-testid` yang disarankan untuk ditambahkan ke kode komponen:

### 4.1 Patch untuk `app/pages/admin/umkm/index.vue`
```diff
@@ -147,6 +147,7 @@
           <input
             v-model="searchQuery"
             type="text"
+            data-testid="f04-search-umkm-input"
             placeholder="Cari nama mitra atau WA..."
             class="w-full text-xs font-semibold pl-8 pr-3 py-2 border border-slate-200 rounded-xl"
           />
@@ -156,6 +157,7 @@
         <AppButton
           @click="openAddModal"
           variant="primary"
+          data-testid="f04-add-umkm-btn"
           size="sm"
           class="font-bold text-xs shadow-sm shrink-0"
         >
@@ -224,6 +226,7 @@
           <button
             @click="openEditModal(u)"
+            data-testid="f04-edit-umkm-btn"
             class="p-2 text-slate-400 hover:text-brand-900..."
             title="Edit UMKM"
           >
@@ -232,6 +235,7 @@
           <button
             @click="copyPublicLink(u.id)"
+            data-testid="f04-copy-link-btn"
             class="p-2 text-slate-400 hover:text-brand-900..."
             title="Salin Link Performa"
           >
@@ -242,6 +246,7 @@
             <AppButton 
               variant="primary" 
               size="sm" 
+              data-testid="f04-goto-catalog-btn"
               class="w-full font-bold text-xs..."
             >
```

### 4.2 Patch untuk `app/pages/admin/umkm/[umkm_id].vue`
```diff
@@ -232,6 +232,7 @@
       <button
         @click="activeTab = 'catalog'"
+        data-testid="f04-tab-catalog-btn"
         :class="['px-4 py-2 border-b-2 font-bold...', activeTab === 'catalog' ? '...']"
       >
         Katalog Master
       </button>
@@ -239,6 +240,7 @@
       <button
         @click="activeTab = 'performance'"
+        data-testid="f04-tab-performance-btn"
         :class="['px-4 py-2 border-b-2 font-bold...', activeTab === 'performance' ? '...']"
       >
         Statistik Performa
       </button>
@@ -253,6 +255,7 @@
         <AppButton 
           @click="openAddModal" 
           variant="primary" 
+          data-testid="f04-add-product-btn"
           size="sm" 
           class="font-bold text-xs !rounded-xl"
         >
           Tambah Produk
         </AppButton>
@@ -303,6 +306,7 @@
             <button
               @click="openEditModal(p)"
+              data-testid="f04-edit-product-btn"
               class="p-2 text-slate-400..."
               title="Edit Produk"
             >
@@ -311,6 +315,7 @@
             <button
               @click="handleDeleteProduct(p.id)"
+              data-testid="f04-delete-product-btn"
               class="p-2 text-slate-400..."
               title="Hapus Produk"
             >
```
