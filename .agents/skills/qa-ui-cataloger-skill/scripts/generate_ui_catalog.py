#!/usr/bin/env python3
"""
generate_ui_catalog.py — Generates QA Documents 03, 04, and 05
Produces 03-screen-flow.md, 04-test-data-spec.md, and 05-element-catalog.md
with Dual-Strategy Locators (Semantic Fallbacks + Developer Patch Recommendations).
"""

import os
import sys
import json
import argparse
from datetime import datetime

# Import local analyzer
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from feature_analyzer import analyze_feature, normalize_feature_key, FEATURE_MAP
except ImportError:
    FEATURE_MAP = {}
    def normalize_feature_key(k): return "f02"
    def analyze_feature(k, r="."): return {}


def generate_doc03(data: dict) -> str:
    code = data.get("feature_code", "F-XX")
    name = data.get("feature_name", "Feature")
    route = data.get("target_route", "/")
    today = datetime.now().strftime("%Y-%m-%d")

    components = data.get("components", [])
    files = data.get("files", [])

    doc = f"""# Peta Alur UI (Screen Flow): {name} ({code})

> **Dokumen Tahap 4/9 — Urutan Layar & Transisi Antarmuka Pengguna**  
> *Fungsi: Memetakan secara detail setiap halaman, modal dialog, elemen antarmuka, interaksi sentuh/klik, kondisi prasyarat, serta hasil yang diharapkan pada tiap langkah sebelum perumusan data uji dan lokator.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `{code}` |
| **Nama Fitur** | `{name}` |
| **Rute Utama** | `{route}` |
| **File Sumber UI** | `{", ".join(files)}` |
| **Viewport Target** | `Mobile PWA (375×667) & Desktop Admin (1280×800)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-ui-cataloger-skill)` |

---

## 2. Diagram Alur Transisi Layar (Screen State Diagram)

```mermaid
flowchart TD
    Start(["Mulai"]) --> PageMain["Halaman Utama: {route}"]
    PageMain -->|"Pencarian / Filter Kategori"| GridUpdate["Katalog Produk & Data Terupdate"]
    GridUpdate -->|"Pilih Item / Tambah Keranjang"| CartUpdated["Keranjang Belanja Reaktif Bertambah"]
    CartUpdated -->|"Klik Buka Checkout"| CheckoutModal["Modal Pembayaran (Tunai / QRIS)"]
    CheckoutModal -->|"Pilih Preset Numpad / Masukkan Nominal"| ChangeCalc["Hitungan Kembalian Instan (JetBrains Mono)"]
    ChangeCalc -->|"Submit Bayar (Tombol disabled + spinner)"| AtomicRPC{{"Proses RPC complete_transaction"}}
    AtomicRPC -->|"Sukses (200 OK)"| SuccessOverlay["Overlay / Toast Sukses & Cetak Struk"]
    AtomicRPC -->|"Gagal / Stok Habis"| ErrorToast["Toast Gagal / Rollback Keranjang"]
    SuccessOverlay -->|"Tutup Transaksi"| PageMain
```

---

## 3. Rincian Alur Layar Per Halaman (Screen-by-Screen Breakdown)

### 3.1 Layar 1: Halaman Katalog & Input Kasir
- **Rute URL:** `{route}`
- **Kondisi Akses:** Pengguna terautentikasi, sesi hari ini berstatus `OPEN`, dan tenant paroki aktif.
- **Tampilan Awal:** Header status sesi, input pencarian cepat, filter pill mitra UMKM, dan grid kartu produk.

#### Elemen & Aksi:
```
Halaman: {route}
  Elemen: Input Pencarian Produk (data-testid="{data.get('feature_key', 'f02')}-searchQuery-input")
  Aksi: Ketik nama produk (misal: "Puding")
  Hasil yang diharapkan: Grid produk menyaring secara instan (<300ms) tanpa reload
  Kondisi: Input string tidak sensitif huruf besar/kecil (case-insensitive)

Halaman: {route}
  Elemen: Kartu Produk Aktif
  Aksi: Klik kartu produk dengan stok > 0
  Hasil yang diharapkan: Item masuk ke keranjang Pinia, counter kuantitas bertambah, subtotal terhitung
  Kondisi: Produk dengan stok 0 dinonaktifkan (disabled) dan berlabel "Habis"
```

---

### 3.2 Layar 2: Drawer / Modal Pembayaran (Checkout)
- **Nama Komponen:** Modal Checkout & Numpad Virtual
- **Kondisi Muncul:** Dipicu saat kasir menekan tombol bayar / FAB keranjang belanja saat `itemCount > 0`.

#### Elemen & Aksi:
```
Halaman: Modal Checkout
  Elemen: Tab Pilihan Metode Pembayaran (Cash / QRIS)
  Aksi: Klik tab metode bayar
  Hasil yang diharapkan: Tampilan berpindah antara Numpad Tunai atau QR Code QRIS statis
  Kondisi: Default metode adalah 'Cash'

Halaman: Modal Checkout
  Elemen: Numpad Virtual & Tombol Preset Cepat (Uang Pas, 5k, 10k, 20k, 50k, 100k)
  Aksi: Klik tombol preset atau ketik nominal
  Hasil yang diharapkan: Field nominal bayar terisi, kalkulasi kembalian muncul otomatis dengan tipografi tebal (text-pos-change)
  Kondisi: Tombol proses bayar hanya aktif jika nominal bayar >= total tagihan
```

---

### 3.3 Layar 3: Overlay Konfirmasi Sukses Transaksi
- **Perubahan State:** Transaksi tersimpan atomik, keranjang Pinia di-reset ke kosong, stok produk berkurang.

#### Elemen & Aksi:
```
Halaman: Overlay Sukses
  Elemen: Banner / Modal Notifikasi Sukses
  Aksi: Otomatis muncul menampilkan nomor transaksi, total bayar, dan nominal kembalian
  Hasil yang diharapkan: Kasir dapat langsung menekan tombol 'Tutup' atau tekan Enter untuk transaksi berikutnya
  Kondisi: Muncul hanya jika RPC database mengembalikan status sukses
```

---

## 4. Keadaan Tampilan Antarmuka (UI States Matrix)

| State UI | Pemicu (Trigger) | Visual Representation | Tindakan Pengguna |
|---|---|---|---|
| **Loading / Fetching** | Masuk ke halaman atau ganti paroki | Skeleton shimmer abu-abu pada grid kartu | Tunggu hingga data selesai dimuat |
| **Empty State** | Belum ada produk sesi dibuka | Banner informasi: "Belum ada produk aktif untuk sesi hari ini" | Hubungi Admin untuk setup sesi |
| **Keranjang Terisi** | Item produk ditambahkan | Counter badge bertambah, total harga terhitung instan | Lanjut memilih item atau klik Bayar |
| **Validation Error** | Nominal uang tunai kurang dari tagihan | Teks kembalian merah / tombol submit disabled | Tambah nominal hingga mencukupi |
| **Offline Mode (PWA)** | Jaringan terputus (`navigator.onLine = false`) | Banner offline kuning muncul di bagian paling atas | Transaksi tetap berjalan via IndexedDB |

---

## 5. Pertimbangan Ergonomi Sentuh & Responsivitas

- [ ] **Area Sentuh (Touch Target):** Seluruh tombol interaktif, numpad, dan kartu produk memiliki ukuran minimal **48×48px** (`min-h-touch min-w-touch`).
- [ ] **Ergonomi Ibu Jari (Thumb Zone):** Tombol checkout dan numpad berada di area bawah layar pada mode mobile.
- [ ] **Pola Responsif Table-to-Card:** Tampilan tabular beralih menjadi kartu vertikal pada lebar layar `< 640px` (`block sm:hidden`).
- [ ] **Tipografi Finansial Monospace:** Nominal harga dan kembalian menggunakan font monospace (`JetBrains Mono`) untuk kejelasan angka nol.

---

## 6. Status Review & Persetujuan

- [ ] **Screen Flow Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)
"""
    return doc


def generate_doc04(data: dict) -> str:
    code = data.get("feature_code", "F-XX")
    name = data.get("feature_name", "Feature")
    today = datetime.now().strftime("%Y-%m-%d")

    doc = f"""# Spesifikasi Data Test (Test Data Spec): {name} ({code})

> **Dokumen Tahap 5/9 — Perencanaan & Manajemen Data Uji**  
> *Fungsi: Mendefinisikan dataset awal, kondisi prasyarat database, akun pengujian per peran, metode pembuatan data (setup), dan pembersihan data (cleanup) guna menjamin pengujian bersifat deterministik dan terisolasi.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `{code}` |
| **Nama Fitur** | `{name}` |
| **Lingkup Tenant (`company_id`)**| `Test Parish St. Yohanes (ID: test-parish-st-yohanes)` |
| **Zona Waktu Uji** | `Asia/Jakarta (WIB / UTC+7)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-ui-cataloger-skill)` |

---

## 2. Matriks Akun Pengguna Uji (Test User Accounts)

| Peran (Role) | Email Pengujian | Password Default | Akses Tenant (`company_id`) | Izin Granular (`permissions`) | Status Akun |
|---|---|---|---|---|---|
| **Super Admin** | `superadmin.test@omkpos.local` | `TestPass123!` | Semua Paroki (`*`) | Full Platform Admin | Aktif |
| **Admin Paroki** | `admin.paroki.test@omkpos.local` | `TestPass123!` | `test-parish-st-yohanes` | `catalog.*`, `session.*`, `finance.*`, `users.*` | Aktif |
| **Kasir (Cashier)** | `kasir1.test@omkpos.local` | `TestPass123!` | `test-parish-st-yohanes` | `pos.access`, `pos.checkout` | Aktif |
| **Kasir Nonaktif** | `kasir.deactive@omkpos.local` | `TestPass123!` | `test-parish-st-yohanes` | `pos.access` (`is_active = false`) | Nonaktif |
| **Publik / Tamu** | *(Tanpa Autentikasi)* | *(N/A)* | Sesuai token URL | Hanya rute publik `/umkm/performance/...` | Tamu |

> [!CAUTION]
> Jangan pernah menggunakan akun riil produksi atau membocorkan `SUPABASE_SECRET_KEY` pada repositori dan script pengujian!

---

## 3. Spesifikasi Data Uji Per Entitas (Entity Dataset Specification)

| Entitas / Data | Nilai / Dataset | Role Pemilik | Kondisi Awal | Cara Setup | Cara Cleanup | Keterangan & Batasan |
|---|---|---|---|---|---|---|
| **Tenant Paroki** | `Paroki Test St. Yohanes` | Super Admin | Terdaftar di `companies` | Seed database | Reusable (tidak dihapus) | Master company uji |
| **Mitra UMKM** | `UMKM Snack Berkah (ID: test-umkm-01)` | Admin Paroki | Aktif (`is_active = true`), HP: `08123456789` | Script API / Seed | Soft-delete (`is_active = false`) | Partner uji konsinyasi |
| **Master Produk A**| `Puding Cokelat (harga_asli: 8.000)` | Admin Paroki | Terikat ke UMKM di atas | API POST `/master_products` | Fixture Teardown | Base cost rahasia |
| **Master Produk B**| `Risoles Mayo (harga_asli: 5.000)` | Admin Paroki | Terikat ke UMKM di atas | API POST `/master_products` | Fixture Teardown | Base cost rahasia |
| **Sesi Mingguan** | `Sesi Hari Ini (status: 'open')` | Admin Paroki | Tanggal sesi hari ini WIB (`getTodayJakarta()`) | RPC `open_session` | RPC `reset_session` | Wajib status OPEN |
| **Produk Sesi A** | `stok_awal: 20, stok_sekarang: 20, harga_jual: 10.000` | Admin Paroki | Terdaftar di `session_products` | Setup Sesi RPC | Reset Sesi RPC | Markup OMK: 2.000/unit |
| **Produk Sesi Habis**| `stok_awal: 10, stok_sekarang: 0, harga_jual: 12.000` | Admin Paroki | `stok_sekarang = 0` | Force update via RPC | Reset Sesi RPC | Uji out-of-stock guard |
| **Transaksi Test** | `Total: 20.000, Bayar: 50.000, Kembalian: 30.000` | Kasir | Metode Tunai | RPC `complete_transaction` | RPC `reset_session` | Mutasi stok atomik (-2) |

---

## 4. Dataset Nilai Ekstrem & Batas (Edge Case & Boundary Data)

| Kategori Edge Case | Nilai Masukan (Input Value) | Perilaku yang Diharapkan |
|---|---|---|
| **Karakter Khusus Search**| Query: `Puding <script>alert(1)</script> % & '` | Disanitasi aman, tidak terjadi XSS, pencarian tetap berfungsi |
| **Nominal Uang Sangat Besar**| Pembayaran: `Rp 50.000.000` | Format Rupiah rapi (`Rp 50.000.000`), kembalian dihitung akurat |
| **Uang Tunai Kurang** | Total Tagihan `Rp 35.000`, Bayar `Rp 20.000` | Tombol submit pembayaran disabled, muncul teks selisih kurang |
| **Stok Habis Saat Checkout**| Stok sisa 1, dibeli 2 kasir bersamaan | Transaksi pertama sukses, transaksi kedua ditolak dengan pesan stok habis |

---

## 5. Prosedur Setup & Cleanup (Automation Hooks)

### 5.1 Prosedur Setup
```typescript
export async function setupSessionData(apiContext: any, companyId: string) {{
  // 1. Pastikan company aktif terdaftar
  // 2. Buka sesi hari ini dengan status OPEN
  // 3. Masukkan minimal 2 produk dengan stok terdefinisi
}}
```

### 5.2 Prosedur Cleanup
```typescript
export async function cleanupSessionData(apiContext: any, sessionId: string) {{
  // Panggil RPC reset_session untuk mengosongkan transaksi uji
}}
```

---

## 6. Aturan Isolasi Multi-Tenant

1. Seluruh panggilan API dan RPC wajib menyertakan header `X-Company-Id: test-parish-st-yohanes`.
2. Pengujian E2E tidak boleh mengakses atau mengubah data milik `company_id` paroki lain.

---

## 7. Status Review & Persetujuan

- [ ] **Spesifikasi Data Test Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)
"""
    return doc


def generate_doc05(data: dict) -> str:
    code = data.get("feature_code", "F-XX")
    name = data.get("feature_name", "Feature")
    prefix = data.get("feature_key", "f02")
    today = datetime.now().strftime("%Y-%m-%d")

    components = data.get("components", [])
    recommended = data.get("recommended_testids", [])

    # Catalog rows
    catalog_rows = []
    developer_patch_items = []

    # Default common rows for POS / generic pages
    catalog_rows.append(f"| **Katalog / Grid** | Input Pencarian | `[data-testid=\"{prefix}-searchQuery-input\"]` | `input[type=\"search\"], input[placeholder*=\"Cari\"]` | input | `Perlu Ditambahkan` | `fill(), clear()` |")
    catalog_rows.append(f"| **Katalog / Grid** | Tombol Filter Kategori | `[data-testid=\"{prefix}-filter-all-btn\"]` | `button:has-text(\"Semua\")` | button | `Perlu Ditambahkan` | `click()` |")
    catalog_rows.append(f"| **Katalog / Grid** | Kartu Produk Item | `[data-testid=\"{prefix}-product-card-1\"]` | `.pos-product-card, .cursor-pointer` | card | `Perlu Ditambahkan` | `click()` |")
    catalog_rows.append(f"| **Keranjang / Drawer**| Tombol Buka Checkout | `[data-testid=\"{prefix}-cart-checkout-btn\"]` | `button.pos-pay-btn, button:has-text(\"Bayar\")` | button | `Perlu Ditambahkan` | `click()` |")
    catalog_rows.append(f"| **Modal Checkout** | Tab Metode Bayar Tunai | `[data-testid=\"{prefix}-payment-cash-tab\"]` | `button:has-text(\"Tunai\"), button:has-text(\"Cash\")` | tab | `Perlu Ditambahkan` | `click()` |")
    catalog_rows.append(f"| **Modal Checkout** | Tab Metode Bayar QRIS | `[data-testid=\"{prefix}-payment-qris-tab\"]` | `button:has-text(\"QRIS\")` | tab | `Perlu Ditambahkan` | `click()` |")
    catalog_rows.append(f"| **Modal Checkout** | Tombol Preset 50.000 | `[data-testid=\"{prefix}-numpad-btn-50k\"]` | `button:has-text(\"50.000\")` | button | `Perlu Ditambahkan` | `click()` |")
    catalog_rows.append(f"| **Modal Checkout** | Tombol Proses Bayar | `[data-testid=\"{prefix}-checkout-submit-btn\"]` | `button:has-text(\"Selesaikan\"), button:has-text(\"Bayar\")` | button | `Perlu Ditambahkan` | `click()` |")
    catalog_rows.append(f"| **Status Sistem** | Banner Offline | `[data-testid=\"offline-banner\"]` | `#offline-banner, .offline-banner` | banner | `Sudah Ada (OfflineBanner)` | `toBeVisible()` |")
    catalog_rows.append(f"| **Feedback Global** | Toast Notifikasi | `[data-testid=\"app-toast\"]` | `.fixed.bottom-4.right-4, .toast` | toast | `Sudah Ada (AppToast)` | `toBeVisible()` |")

    # Developer action items
    for item in recommended[:6]:
        elem_name = item.get("element") or "Aksi"
        target_file = item.get("file", "app/pages/pos.vue")
        target_testid = item.get("recommended", f"{prefix}-element")
        developer_patch_items.append(f"""#### Tambah `data-testid="{target_testid}"` pada `{elem_name}`
- **File Target:** `{target_file}`
- **Elemen:** `<{item.get('type', 'button')}>`
- **Tujuan:** Menjamin kestabilan locator automation Playwright E2E.
- **Contoh Penambahan:**
  ```html
  <{item.get('type', 'button')} data-testid="{target_testid}" class="...">
  ```
""")

    doc = f"""# Katalog Elemen (Locator Inventory): {name} ({code})

> **Dokumen Tahap 6/9 — Inventaris Lokator & Selektor Elemen UI**  
> *Fungsi: Sumber kebenaran tunggal (*Single Source of Truth*) untuk lokator elemen antarmuka yang stabil dan tahan terhadap perubahan styling CSS/DOM. Mengimplementasikan strategi Dual-Strategy Locator (Resilient Semantic Fallback + Rekomendasi Patch Developer).*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `{code}` |
| **Nama Fitur** | `{name}` |
| **Prefix Selektor Baku** | `{prefix}-` |
| **Strategi Lokator** | `Dual-Strategy (Semantic Fallback Ready + Developer Patch)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-ui-cataloger-skill)` |

---

## 2. Strategi Selektor & Penanganan Ketiadaan `data-testid`

Karena sebagian besar elemen Vue saat ini belum memiliki atribut `data-testid`, pengujian **TIDAK DIBLOKIR**. Kita menerapkan strategi dua lapis:

### 2.1 Hierarki Selektor Segera (Fallback Siap Pakai)
1. **Prioritas 1 (Resilient ARIA):** `page.getByRole('button', {{ name: 'Bayar' }})`
2. **Prioritas 2 (Label / Placeholder):** `page.getByPlaceholder('Cari...')` atau `page.getByLabel('...')`
3. **Prioritas 3 (Text Content):** `page.getByText('Rp 15.000')` (Hanya untuk asersi konten)
4. **Dilarang Keras:** Menggunakan XPath absolut atau class Tailwind yang dinamis.

### 2.2 Standar Konvensi Nama `data-testid`
Format Baku: `[{prefix}]-[nama-komponen]-[opsional-aksi]`
- `[data-testid="{prefix}-searchQuery-input"]`
- `[data-testid="{prefix}-product-card-1"]`
- `[data-testid="{prefix}-cart-checkout-btn"]`
- `[data-testid="{prefix}-checkout-submit-btn"]`

---

## 3. Inventaris Lokator Elemen (Element Catalog Table)

| Halaman / Komponen | Nama Elemen | Rekomendasi Selector (`data-testid`) | Fallback Selector | Tipe | Status di UI | Aksi yang Didukung |
|---|---|---|---|---|---|---|
{chr(10).join(catalog_rows)}

---

## 4. Rekomendasi Patch `data-testid` untuk Developer (Action Items)

Daftar rekomendasi atribut `data-testid` yang disarankan untuk ditambahkan ke kode sumber Vue oleh developer guna meningkatkan ketahanan uji otomatis:

{chr(10).join(developer_patch_items)}

---

## 5. Status Review & Persetujuan

- [ ] **Katalog Elemen & Fallback Disetujui:** `YA / BELUM`
- [ ] **Rekomendasi Patch Terkirim ke Tim Dev:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 06-test-cases.md:** `(Tanda Tangan / Persetujuan User: ________)`
"""
    return doc


def main():
    parser = argparse.ArgumentParser(description="Generate QA Documents 03, 04, and 05")
    parser.add_argument("--feature", required=True, help="Feature key or code (e.g. f02)")
    parser.add_argument("--output-dir", required=True, help="Directory to save docs (e.g. docs/qa/f02-pos-cashier)")
    parser.add_argument("--project-root", default=".", help="Project root directory")
    args = parser.parse_args()

    norm_key = normalize_feature_key(args.feature)
    data = analyze_feature(norm_key, args.project_root)

    os.makedirs(args.output_dir, exist_ok=True)

    doc03 = generate_doc03(data)
    doc04 = generate_doc04(data)
    doc05 = generate_doc05(data)

    p03 = os.path.join(args.output_dir, "03-screen-flow.md")
    p04 = os.path.join(args.output_dir, "04-test-data-spec.md")
    p05 = os.path.join(args.output_dir, "05-element-catalog.md")

    with open(p03, "w", encoding="utf-8") as f:
        f.write(doc03)
    with open(p04, "w", encoding="utf-8") as f:
        f.write(doc04)
    with open(p05, "w", encoding="utf-8") as f:
        f.write(doc05)

    print(f"Generated Docs 03, 04, 05 in {args.output_dir}")


if __name__ == "__main__":
    main()
