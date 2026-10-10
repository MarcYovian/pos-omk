# Katalog Elemen (Locator Inventory): [NAMA_FITUR] ([KODE_FITUR])

> **Dokumen Tahap 6/9 — Inventaris Lokator & Selektor Elemen UI**  
> *Fungsi: Sumber kebenaran tunggal (*Single Source of Truth*) untuk lokator elemen antarmuka yang stabil dan tahan terhadap perubahan styling CSS/DOM. Menghindari test automation yang rapuh (*flaky tests*).*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `[F-XX / KODE_FITUR]` |
| **Nama Fitur** | `[Nama Fitur Lengkap]` |
| **Halaman / Komponen** | `[app/pages/... & app/components/...]` |
| **Total Elemen Terpetakan**| `[Jumlah elemen]` |
| **Status Dokumen** | `DRAFT / IN REVIEW / APPROVED` |
| **QA Engineer** | `[Nama QA / Agent]` |

---

## 2. Standar Konvensi Selektor (Locator Convention)

Untuk menjaga konsistensi pada seluruh suite automation OMK POS, hierarki selektor wajib mengikuti aturan berikut:

### 2.1 Hierarki Prioritas Selektor
1. **Prioritas 1 (Resilient):** Atribut khusus `[data-testid="<fitur>-<komponen>-<aksi>"]`
2. **Prioritas 2 (Semantik Aksesibilitas):** Role ARIA + nama terlihat (`page.getByRole('button', { name: 'Bayar' })`)
3. **Prioritas 3 (Form Label / Placeholder):** `page.getByLabel('Email')` atau `page.getByPlaceholder('Cari...')`
4. **Prioritas 4 (Teks UI):** `page.getByText('Rp 15.000')` (Hanya untuk validasi konten, bukan tombol klik)
5. **Dilarang Keras:** Selektor XPath absolut (`/html/body/div[1]/...`) atau class Tailwind yang dinamis (`.bg-brand-900.p-4.rounded-xl`).

### 2.2 Format Baku Penamaan `data-testid`
Format: `[prefix-fitur]-[nama-komponen]-[opsional-aksi]`
Contoh:
- `pos-search-input` (Input pencarian produk POS)
- `pos-product-card-1` (Kartu produk dengan ID 1)
- `pos-cart-checkout-btn` (Tombol buka dialog pembayaran)
- `pos-numpad-btn-50k` (Tombol nominal cepat 50.000)
- `company-switcher-trigger` (Tombol dropdown ganti paroki)
- `admin-umkm-add-btn` (Tombol buka form tambah UMKM)

---

## 3. Inventaris Lokator Elemen (Element Catalog Table)

| Halaman / Komponen | Nama Elemen | Rekomendasi Selector (`data-testid`) | Fallback Selector | Tipe | Status di UI | Aksi yang Didukung |
|---|---|---|---|---|---|---|
| **Halaman Utama** | Input Pencarian | `[data-testid="[fitur]-search-input"]` | `input[type="search"]` / `placeholder` | Input text | `Sudah Ada` | `fill()`, `clear()`, `press('Enter')` |
| **Halaman Utama** | Filter Kategori / Tab | `[data-testid="[fitur]-filter-tab-[id]"]` | `button:has-text("Kategori")` | Button pill | `Sudah Ada` | `click()` |
| **Halaman Utama** | Tombol Tambah Data | `[data-testid="[fitur]-add-btn"]` | `button:has-text("Tambah")` | Button | `Sudah Ada` | `click()` |
| **Tabel / Daftar** | Baris Data Item | `[data-testid="[fitur]-item-row-[id]"]` | `tr:has-text("Item")` | Table row | `Perlu Ditambahkan` | `click()`, `toBeVisible()` |
| **Tabel / Daftar** | Tombol Aksi Edit | `[data-testid="[fitur]-edit-btn-[id]"]` | `button[aria-label="Edit"]` | Icon button | `Perlu Ditambahkan` | `click()` |
| **Tabel / Daftar** | Tombol Aksi Hapus | `[data-testid="[fitur]-delete-btn-[id]"]`| `button[aria-label="Hapus"]`| Icon button | `Perlu Ditambahkan` | `click()` |
| **Modal Dialog** | Kontainer Modal | `[data-testid="[fitur]-modal-dialog"]` | `.fixed.inset-0` / `dialog` | Modal | `Sudah Ada (AppModal)` | `toBeVisible()`, `press('Escape')` |
| **Modal Dialog** | Form Input Utama | `[data-testid="[fitur]-modal-input-name"]`| `input[name="name"]` | Input text | `Sudah Ada (AppInput)` | `fill()` |
| **Modal Dialog** | Tombol Konfirmasi | `[data-testid="[fitur]-modal-submit-btn"]`| `button:has-text("Simpan")` | Button | `Sudah Ada (AppButton)`| `click()` |
| **Modal Dialog** | Tombol Batal | `[data-testid="[fitur]-modal-cancel-btn"]`| `button:has-text("Batal")` | Button | `Sudah Ada` | `click()` |
| **Feedback Global**| Toast Notifikasi | `[data-testid="app-toast"]` | `.fixed.bottom-4.right-4` | Toast alert | `Sudah Ada (AppToast)` | `toBeVisible()`, `toHaveText()` |
| **Status Sistem** | Banner Offline | `[data-testid="offline-banner"]` | `#offline-banner` | Banner alert | `Sudah Ada (OfflineBanner)`| `toBeVisible()` |

---

## 4. Daftar Permintaan Tambahan Lokator ke Developer (Action Items)

Jika selector `data-testid` belum tersedia pada kode sumber Vue, catat kebutuhan perubahan pada tabel di bawah ini:

| File Target Vue | Komponen / Tag | Lokator yang Diusulkan | Alasan Kebutuhan | Status Implementasi |
|---|---|---|---|---|
| `[app/pages/...]` | `<button class="p-2 ...">` | `data-testid="[fitur]-action-btn"` | Mencegah selector pecah saat Tailwind di-refactor | `Menunggu PR` |
| `[app/pages/...]` | `<tr v-for="item in ...">` | `data-testid="[fitur]-row-${item.id}"` | Mengidentifikasi baris unik secara deterministik | `Menunggu PR` |

---

## 5. Status Review & Persetujuan

- [ ] **Katalog Elemen Lengkap & Stabil:** `YA / BELUM`
- [ ] **Selektor Fallback Terverifikasi:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 06-test-cases.md:** `(Tanda Tangan / Persetujuan User: ________)`
