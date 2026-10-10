# UI_UX_SPECIFICATION.md — Master UI/UX Design System & Layout Blueprint

> **Status:** LIVING DOCUMENT — Single Source of Truth for Design Tokens, Ergonomics, UI Primitives & Screen Layouts  
> **Audience:** Frontend Engineers, UI/UX Designers, AI Coding Agents  
> **Last Updated:** October 2026 (Unified Edition)

---

## 1. Design Philosophy & Field Operational Context

Aplikasi **OMK POS** dirancang untuk lingkungan kerja lapangan yang dinamis:
1. **Pencahayaan Luar Ruangan (High Ambient Light / Direct Sunlight):** Meja kasir sering berada di tenda semi-terbuka di halaman gereja seusai misa siang. Kontras elemen teks, harga, dan tombol dirancang tinggi (*high contrast*) agar tetap terbaca jelas di bawah terik matahari.
2. **Kecepatan Sentuh Ekstrem (Speed-First & Thumb-Zone Ergonomics):** Kasir melayani jemaat yang bergegas pulang. Semua tombol aksi primer, kartu produk, dan tombol numpad kembalian berada dalam jangkauan ibu jari (*thumb zone*) dengan area sentuh minimal **48×48px**.
3. **Keterbacaan Finansial Tanpa Ambiguitas:** Seluruh nominal uang rupiah dan hitungan kembalian menggunakan tipografi monospace yang besar dan tegas, mencegah kasir salah membaca angka nol.
4. **Resiliensi Visual Koneksi:** Setiap perubahan status koneksi (online/offline) direspons dengan indikator visual yang tidak mengganggu alur input kasir.

---

## 2. Color Tokens & Semantic System

Sistem warna dibangun menggunakan Tailwind CSS dengan palet baku:

### 2.1. Brand Palette (Navy Blue)
Palet utama mencerminkan identitas korporat dan kewibawaan organisasi Katolik:
- `brand-900` (`#1e3a5f`): Warna primer utama (Navbar, tombol primer, header).
- `brand-800` (`#172e4c`): Hover state untuk tombol primer.
- `brand-700` (`#1e40af`): Warna aksen interaktif.
- `brand-100` (`#dbeafe`): Background badge aktif & filter pill terpilih.
- `brand-50` (`#eff6ff`): Highlight background tabel dan card focus.

### 2.2. Semantic Colors
- **Success (`#16a34a` / `emerald-600`):** Transaksi sukses, pembayaran pas/lunas, rekonsiliasi stok cocok (`selisih = 0`), status aktif.
- **Warning (`#d97706` / `amber-600`):** Sisa stok menipis (<5), selisih fisik lebih banyak, status sesi belum ditutup, peringatan offline.
- **Danger (`#dc2626` / `red-600`):** Sisa stok habis (`0`), selisih fisik minus (barang hilang/rusak), tombol hapus, error server.
- **Info (`#2563eb` / `blue-600`):** Informasi sistem, status sinkronisasi, link detail.

### 2.3. Surface & Neutral Colors
- **Background Utama:** `#f8fafc` (`slate-50`)
- **Card & Modal Surface:** `#ffffff` (`white`) dengan border `#e2e8f0` (`slate-200`)
- **Teks Primer:** `#0f172a` (`slate-900`)
- **Teks Sekunder (Muted):** `#64748b` (`slate-500`)

---

## 3. Typography & Monospace Financial Presets

| Peruntukan | Font Family | Kelas CSS Tailwind | Ukuran / Weight | Contoh Tampilan |
|---|---|---|---|---|
| **Body & UI Labels** | `Inter`, sans-serif | `font-sans text-sm text-slate-700` | 14px / Regular (400) | "Puding Cokelat", "Metode Bayar" |
| **Section Header** | `Inter`, sans-serif | `font-sans text-lg font-bold text-slate-900` | 18px / Bold (700) | "Ringkasan Finansial Sesi" |
| **POS Price Display** | `JetBrains Mono`, mono | `font-mono text-pos-price font-bold text-brand-900` | 24px (1.5rem) / Bold (700) | `Rp 15.000` |
| **POS Change Display**| `JetBrains Mono`, mono | `font-mono text-pos-change font-extrabold text-emerald-600` | 32px (2.0rem) / Extra-Bold (800) | `Rp 35.000` |
| **Table Numeric Data**| `JetBrains Mono`, mono | `font-mono text-xs tabular-nums text-right` | 12px / Medium (500) | `1.250.000` |

---

## 4. Touch Ergonomics & Form Factors

### 4.1. Minimum Tap Target (48×48px)
Sesuai standar WCAG 2.1 AAA dan panduan mobile PWA:
- Seluruh elemen interaktif kasir memiliki kelas `min-h-touch` (`min-height: 48px`) dan `min-w-touch` (`min-width: 48px`).
- Tombol numpad kasir memiliki tinggi minimal **56px** dengan sudut tumpul (`rounded-xl`) untuk kenyamanan ketukan cepat.

### 4.2. Mobile Breakpoint Table-to-Card Pattern
Untuk menjamin kenyamanan pengurus paroki yang membuka dashboard admin di ponsel:
- **Layar Mobile (`< 640px`):** Tabel data otomatis beralih menjadi format kartu vertikal (`block sm:hidden`).
- **Layar Desktop / Tablet (`>= 640px`):** Ditampilkan sebagai tabel tabular standar (`hidden sm:table`).

---

## 5. Atomic UI Primitives Catalog (`app/components/ui/`)

Tujuh komponen UI mandiri tanpa dependensi pustaka pihak ketiga:

### 5.1. `AppButton.vue`
- **Props:** `variant` ('primary' | 'secondary' | 'danger' | 'ghost' | 'outline'), `size` ('sm' | 'md' | 'lg'), `loading` (boolean), `disabled` (boolean), `block` (boolean).
- **Perilaku:** Saat `loading: true`, otomatis menampilkan ikon spinner SVG memutar dan menonaktifkan klik ganda (*prevent double-submit*).

### 5.2. `AppInput.vue`
- **Props:** `modelValue`, `label`, `type`, `placeholder`, `error`, `disabled`, `prefixIcon`, `required`.
- **Fitur Khusus:** Jika `type="password"`, otomatis menyediakan tombol ikon mata (*eye toggle*) di sisi kanan untuk memperlihatkan/menyembunyikan kata sandi.

### 5.3. `AppModal.vue`
- **Props:** `isOpen` (boolean), `title` (string), `size` ('sm' | 'md' | 'lg' | 'xl').
- **Fitur Khusus:** Dilengkapi animasi fade backdrop, tombol escape keyboard handler, pengunci scroll latar (*body scroll lock*), dan slot footer tombol aksi.

### 5.4. `AppToast.vue`
- **Fungsi:** Komponen notifikasi pop-up melayang di sudut layar atas/bawah. Auto-dismiss setelah 3.000 milidetik dengan progress bar halus.

### 5.5. `CompanySwitcher.vue`
- **Peruntukan:** Komponen dropdown pemilih paroki di navbar atas admin dan sidebar mobile. Menampilkan nama paroki aktif, badge role pengguna, dan daftar paroki lain yang dapat dipilih.

### 5.6. `ProfileDropdown.vue`
- **Peruntukan:** Menampilkan inisial avatar pengguna, alamat email aktif, badge role, tombol navigasi `/change-password`, dan tombol Keluar (Logout).

### 5.7. `OfflineBanner.vue`
- **Peruntukan:** Spanduk peringatan kuning/merah yang menempel (*sticky*) di bagian paling atas layar kasir `/pos`. Menampilkan status "Offline" dan jumlah transaksi antrean lokal yang menunggu koneksi internet.

---

## 6. Screen Layout Blueprints & Wireframes (ASCII)

### 6.1. Layar Kasir POS — Mode Mobile Smartphone (`/pos`)

```
+-------------------------------------------------------------+
| [⚡ Offline Banner (muncul hanya jika internet terputus)]     |
+-------------------------------------------------------------+
| [⛪ Paroki St. Antonius]                      [User Avatar] |
| 🔍 [Cari nama makanan / minuman...]                         |
| [ Semua ] [ Bu Agnes ] [ Dapur Maria ] [ Snack OMK ]        |
+-------------------------------------------------------------+
| +-------------------------+     +-------------------------+ |
| | Risol Mayo              |     | Lemper Ayam             | |
| | Rp 3.500                |     | Rp 4.000                | |
| | [Stok: 12]    [ + TAMBAH] |     | [Stok: 5]     [ + TAMBAH] | |
| +-------------------------+     +-------------------------+ |
| +-------------------------+     +-------------------------+ |
| | Es Teh Manis            |     | Pastel Sayur            | |
| | Rp 5.000                |     | Rp 3.000                | |
| | [Stok: 20]    [ + TAMBAH] |     | [HABIS]       [ TIDAK ] | |
| +-------------------------+     +-------------------------+ |
+-------------------------------------------------------------+
| [ 🛒 Keranjang: 3 Item | Total: Rp 12.000       [ BAYAR ➔ ] ]|
+-------------------------------------------------------------+
```

---

### 6.2. Layar Kasir POS — Mode Tablet / Desktop Split Screen (`/pos`)

```
+-----------------------------------------------------------------------------------+
| [⛪ Paroki St. Antonius] | POS Kasir                     [Admin] [Profile Dropdown] |
+---------------------------------------------------+-------------------------------+
| KATALOG PRODUK (60%)                              | KERANJANG & PEMBAYARAN (40%)  |
| 🔍 [Cari produk...]     [Filter UMKM v]           |                               |
|                                                   | 1. Risol Mayo     x2  Rp  7.000 |
| +-------------------+ +-------------------+       | 2. Es Teh Manis   x1  Rp  5.000 |
| | Risol Mayo        | | Lemper Ayam       |       +-------------------------------+
| | Rp 3.500 (Stok:12)| | Rp 4.000 (Stok:5) |       | TOTAL BELANJA:    Rp 12.000   |
| +-------------------+ +-------------------+       +-------------------------------+
| +-------------------+ +-------------------+       | METODE:  [● TUNAI]   [○ QRIS]  |
| | Es Teh Manis      | | Pastel Sayur      |       |                               |
| | Rp 5.000 (Stok:20)| | Rp 3.000 (HABIS)  |       | UANG DITERIMA:    [Rp 20.000] |
| +-------------------+ +-------------------+       | PRESET: [Uang Pas] [20k] [50k]|
| +-------------------+ +-------------------+       +-------------------------------+
| | Puding Cokelat    | | Brownies Potong   |       | KEMBALIAN:                    |
| | Rp 6.000 (Stok:8) | | Rp 7.500 (Stok:15)|       | Rp 8.000                      |
| +-------------------+ +-------------------+       +-------------------------------+
|                                                   | [    SELESAIKAN TRANSAKSI    ]|
+---------------------------------------------------+-------------------------------+
```

---

### 6.3. Layar Setup Sesi Mingguan (`/admin/setup`)

```
+-----------------------------------------------------------------------------------+
| [Sidebar Admin] | SETUP SESI MINGGUAN — Tanggal: 12 Oktober 2026   [ STATUS: OPEN ]|
+-----------------------------------------------------------------------------------+
| [+ Tambah Produk ke Sesi Ini]                                                     |
|                                                                                   |
| DAFTAR PRODUK SESI AKTIF:                                                         |
| +-------------------+---------------+-----------+-----------+---------+-----------+
| | Nama Produk       | Mitra UMKM    | Modal     | Jual      | Rekom.  | Stok Awal |
| +-------------------+---------------+-----------+-----------+---------+-----------+
| | Risol Mayo        | Dapur Agnes   | Rp 2.500  | Rp 3.500  | [ 30 ]  | [  35  ]  |
| | Lemper Ayam       | Ibu Maria     | Rp 3.000  | Rp 4.000  | [ 20 ]  | [  20  ]  |
| | Es Kopi Susu      | Kopi Pemuda   | Rp 8.000  | Rp 12.000 | [ 15 ]  | [  15  ]  |
| +-------------------+---------------+-----------+-----------+---------+-----------+
|                                                                                   |
| [ Simpan Pengaturan Sesi ]                            [ Buka Kasir Penjualan ➔ ]  |
+-----------------------------------------------------------------------------------+
```

---

### 6.4. Layar Rekonsiliasi Akhir Hari (`/admin/reconciliation`)

```
+-----------------------------------------------------------------------------------+
| [Sidebar Admin] | REKONSILIASI STOK & TUTUP BUKU SESI             [ Tgl: Hari Ini ]|
+-----------------------------------------------------------------------------------+
| PANDUAN: Hitung fisik barang yang tersisa di meja, masukkan ke kolom 'Stok Fisik'.|
|                                                                                   |
| +-------------------+-----------+---------+------------+------------+-------------+
| | Produk & Vendor   | Stok Awal | Terjual | Sistem Sisa| Stok Fisik | Selisih     |
| +-------------------+-----------+---------+------------+------------+-------------+
| | Risol Mayo        |    35     |   32    |     3      |   [  3  ]  | (✓ Cocok)   |
| | Lemper Ayam       |    20     |   18    |     2      |   [  1  ]  | (-1 Kurang) |
| | Es Kopi Susu      |    15     |   15    |     0      |   [  0  ]  | (✓ Cocok)   |
| +-------------------+-----------+---------+------------+------------+-------------+
|                                                                                   |
| RINGKASAN: 2 Produk Cocok | 1 Produk Selisih Fisik (-1 pcs)                       |
|                                                                                   |
| [ ⚠️ KUNCI & TUTUP SESI MINGGUAN (CLOSE SESSION) ]                               |
+-----------------------------------------------------------------------------------+
```

---

### 6.5. Layar Dashboard Finansial Sesi (`/admin/dashboard`)

```
+-----------------------------------------------------------------------------------+
| [Sidebar Admin] | DASHBOARD KEUANGAN SESI AKTIF                     [ 🔄 Refresh ]|
+-----------------------------------------------------------------------------------+
| +------------------------+ +------------------------+ +------------------------+  |
| | GROSS OMZET PENJUALAN  | | TOTAL HAK MODAL UMKM   | | TOTAL LABA BERSIH OMK  |  |
| | Rp 1.450.000           | | Rp 1.050.000           | | Rp 400.000             |  |
| | 85 Transaksi Struk     | | 100% Hak Terlindungi   | | Margin Bersih 27,5%    |  |
| +------------------------+ +------------------------+ +------------------------+  |
|                                                                                   |
| RINCIAN PER-MITRA UMKM (Klik untuk buka rincian produk):                          |
| ▼ Dapur Bu Agnes  (Omzet: Rp 650.000 | Modal: Rp 480.000 | Laba OMK: Rp 170.000)  |
|   +-------------------+---------+---------+-----------+-----------+-------------+ |
|   | Produk            | Awal    | Terjual | Omzet     | Hak UMKM  | Laba OMK    | |
|   | Risol Mayo        | 35      | 32      | 112.000   | 80.000    | 32.000      | |
|   | Pastel Telur      | 30      | 28      | 140.000   | 100.000   | 40.000      | |
|   +-------------------+---------+---------+-----------+-----------+-------------+ |
| ▶ Ibu Maria       (Omzet: Rp 420.000 | Modal: Rp 310.000 | Laba OMK: Rp 110.000)  |
| ▶ Kopi Pemuda     (Omzet: Rp 380.000 | Modal: Rp 260.000 | Laba OMK: Rp 120.000)  |
+-----------------------------------------------------------------------------------+
```

---

### 6.6. Layar Generator Laporan WhatsApp (`/admin/reports`)

```
+-----------------------------------------------------------------------------------+
| [Sidebar Admin] | GENERATOR LAPORAN WHATSAPP MITRA UMKM                           |
+-----------------------------------------------------------------------------------+
| PILIH MITRA: [ Dapur Bu Agnes  v ]     SESI: [ Minggu, 12 Oktober 2026 v ]        |
|                                                                                   |
| PREVIEW PESAN WHATSAPP (Siap Kirim):                                              |
| +-------------------------------------------------------------------------------+ |
| | Shalom Ibu Agnes,                                                             | |
| | Berikut rekap penjualan bazar OMK Minggu, 12 Oktober 2026:                    | |
| |                                                                               | |
| | 📦 Rincian Barang:                                                            | |
| | • Risol Mayo: Terjual 32 pcs (Sisa kembali: 3 pcs)                            | |
| | • Pastel Telur: Terjual 28 pcs (Sisa kembali: 2 pcs)                          | |
| |                                                                               | |
| | 💰 Total Hak Modal (Setoran): Rp 180.000                                      | |
| | 🏦 Pembayaran via transfer BCA: Rekening terdaftar.                           | |
| |                                                                               | |
| | Terima kasih banyak atas kerja samanya. Berkah Dalem!                         | |
| +-------------------------------------------------------------------------------+ |
|                                                                                   |
| [ 📋 SALIN LAPORAN WHATSAPP (1-KLIK) ]        [ 💬 Buka Langsung di WhatsApp Web ]|
+-----------------------------------------------------------------------------------+
```

---

## 7. Interaction States & Visual Feedback

| State / Interaksi | Indikator Visual | Penanganan Error / Fallback |
|---|---|---|
| **Koneksi Terputus** | `OfflineBanner` kuning muncul di posisi sticky atas, teks berganti "Mode Offline Aktif". | Transaksi tetap diizinkan dan masuk antrean IndexedDB lokal. |
| **Koneksi Pulih** | Banner berubah hijau "Menyinkronkan...", badge counter berkurang hingga 0. | Jika ada transaksi gagal sync, muncul toast notifikasi merah rincian kegagalan. |
| **Klik Bayar Kasir** | Tombol menampilkan spinner, input terkunci untuk mencegah multi-klik. | Jika validasi stok server gagal (habis terjual oleh kasir lain), muncul dialog konfirmasi update stok otomatis. |
| **Kembalian Uang** | Digit kembalian dihitung secara reaktif per ketukan angka tanpa latency (<16ms). | Jika uang diterima kurang dari total belanja, tombol "Selesaikan" otomatis disabled dan kembalian bertuliskan "Uang Kurang". |
| **Beralih Paroki** | Overlay loading tipis dengan spinner; seluruh data sesi, katalog, dan keranjang di-reload dari Supabase. | Jika pengguna tidak memiliki wewenang pada paroki tujuan, sistem menolak dan mempertahankan paroki saat ini. |
