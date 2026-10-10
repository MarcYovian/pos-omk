# PRD.md — Living Master Product Requirements Document for OMK POS

> **Status:** LIVING DOCUMENT — Single Source of Truth for Product, Business & Feature Requirements  
> **Audience:** Product Owners, Software Engineers, AI Coding Agents, Parish Stakeholders  
> **Last Updated:** October 2026 (Unified Edition)

---

## 1. Executive Summary & Core Purpose

**OMK POS** adalah platform Point of Sale (POS), Manajemen Inventaris Konsinyasi, dan Tata Kelola Keuangan Usaha Mikro Kecil Menengah (UMKM) berbasis Web & Progressive Web App (PWA) yang dioperasikan oleh OMK (Orang Muda Katolik / Catholic Youth Ministry) untuk mengelola bazar/market pasar mingguan pasca ibadah misa Minggu di paroki.

### Visi & Misi
1. **Pemberdayaan Ekonomi Paroki:** Membuka akses pasar bagi wirausaha mikro warga paroki melalui model konsinyasi titip-jual yang adil, transparan, dan profesional.
2. **Kemandirian Dana Kepemudaan:** Menghasilkan margin laba bersih yang sehat dan terkelola rapi untuk mendanai kegiatan operasional, sosial, dan pembinaan iman kaum muda paroki secara mandiri tanpa membebani kas dewan paroki.
3. **Efisiensi & Resiliensi Operasional:** Menyediakan sistem kasir berkecepatan tinggi yang tahan terhadap gangguan sinyal internet gereja (*offline-first*), mencegah kesalahan hitung uang/stok, dan memangkas waktu tutup buku dari 1,5 jam menjadi hitungan menit.
4. **Skalabilitas Multi-Paroki:** Mendukung pengelolaan banyak paroki/organisasi secara terisolasi (*multi-tenant*) dalam satu infrastruktur terpadu.

---

## 2. Problem Statement & Root Cause Analysis

Sebelum sistem OMK POS diimplementasikan, operasional bazar mingguan OMK menghadapi 5 kendala utama:

| No | Gejala / Masalah Lapangan | Akar Penyebab (Root Cause) | Dampak Negatif |
|---|---|---|---|
| **1** | **Antrean Kasir Lambat & Menumpuk** | Kasir mencari dan menghafal harga dari selembar kertas/catatan chat WhatsApp, menghitung kembalian manual dengan kalkulator fisik saat jemaat serentak keluar misa. | Jemaat batal membeli karena antre terlalu lama; kasir kelelahan; resiko salah hitung kembalian tinggi. |
| **2** | **Rekonsiliasi Akhir Hari Melelahkan (60–90 Menit)** | Stok sisa fisik dihitung manual dan dicocokkan dengan uang di kotak kasir menggunakan kertas coret-coretan tanpa riwayat digital. | Relawan OMK pulang larut; rawan terjadi selisih kas (*cash discrepancy*) tanpa jejak audit transaksi. |
| **3** | **Kerumitan Konsinyasi & Ketidakpercayaan Vendor** | Pencatatan modal vendor (`harga_asli`) dan laba OMK (`harga_jual - harga_asli`) tercampur. Rekap sisa barang dan bagi hasil lambat dibuat dan tidak rapi. | Mitra UMKM ragu menitipkan barang; pembayaran modal vendor sering tertunda; pencatatan utang organisasi berantakan. |
| **4** | **Koneksi Internet Gereja Padam / Flaky** | Sinyal seluler 4G/5G sering *congested* di area gereja saat dihadiri ribuan jemaat, sementara Wi-Fi paroki tidak menjangkau tenda bazar luar ruangan. | Aplikasi web kasir konvensional macet total (*blank screen* / transaksi *timeout*), melumpuhkan penjualan. |
| **5** | **Race Condition Multi-Kasir** | Menggunakan 2–3 ponsel kasir bersamaan tanpa sinkronisasi stok terpusat. | Dua kasir menjual barang terakhir yang sama kepada pembeli berbeda, memicu komplain stok habis saat barang sudah dibayar. |

---

## 3. Target User Personas & Stakeholder Profiles

Sistem OMK POS melayani 5 kelompok pengguna dengan tanggung jawab dan batasan hak akses yang jelas:

### 3.1. Kasir / Relawan OMK (`cashier`)
- **Profil:** Anggota OMK usia 16–25 tahun yang bertugas secara bergantian setiap Minggu di meja kasir bazar.
- **Karakteristik Penggunaan:** Membuka antarmuka ponsel/tablet `/pos`. Mengutamakan kecepatan sentuh (*thumb ergonomics*), pencarian cepat nama produk, dan numpad kembalian instan.
- **Batasan Keamanan Kritis:** **DILARANG KERAS** melihat harga modal UMKM (`harga_asli`) untuk menjaga etika bisnis dan kerahasiaan kesepakatan margin dengan vendor.

### 3.2. Pengurus Usaha Dana OMK (`admin`)
- **Profil:** Koordinator seksi dana dan kewirausahaan OMK yang bertanggung jawab atas seluruh operasional bazar mingguan.
- **Karakteristik Penggunaan:** Mengakses laptop atau tablet pada modul `/admin/*`. Mengatur pendaftaran vendor UMKM, setup sesi Minggu, input stok awal dan harga jual, rekonsiliasi akhir hari, pengiriman laporan WhatsApp, pelunasan utang, dan monitoring buku kas.
- **Kebutuhan Utama:** Kepastian angka finansial, otomatisasi hitungan bagi hasil, dan kemudahan audit riwayat transaksi.

### 3.3. Super Admin / Koordinator Paroki (`super_admin`)
- **Profil:** Administrator teknis atau pembina dewan paroki.
- **Karakteristik Penggunaan:** Mengelola pendaftaran gereja/paroki baru (*multi-tenant*), mengelola akun kasir/admin, mengatur *Dynamic Roles & Permissions*, dan memastikan kelancaran teknis lintas paroki.

### 3.4. Mitra UMKM Paroki (Vendor Eksternal / Non-Login)
- **Profil:** Ibu rumah tangga atau pelaku usaha mikro warga paroki yang memproduksi makanan ringan, minuman, atau kerajinan tangan.
- **Karakteristik Penggunaan:** Tidak memiliki akun login sistem. Menerima laporan rekap via chat WhatsApp pribadi setiap Minggu sore. Memantau performa penjualan secara transparan melalui portal tautan publik aman (`/umkm/performance/:id`).
- **Kebutuhan Utama:** Transparansi sisa stok yang dikembalikan dan ketepatan pencairan dana modal barang yang terjual.

### 3.5. Jemaat Paroki (Konsumen Akhir)
- **Profil:** Umat Katolik dari berbagai kalangan usia yang berbelanja makanan/minuman seusai perayaan ekaristi.
- **Karakteristik Penggunaan:** Menikmati layanan kasir cepat (<10 detik), harga transparan, menerima kembalian uang pas, atau memindai QRIS dinamis/statis.

---

## 4. Expected Business Outcomes & Key Performance Indicators (KPI)

Implementasi OMK POS ditargetkan memenuhi metrik keberhasilan berikut:

| Kategori KPI | Metrik Target | Baseline Sebelum POS | Metode Pengukuran |
|---|---|---|---|
| **Kecepatan Layanan** | **< 10 detik per transaksi** | 45–75 detik per transaksi | Waktu mulai klik produk pertama hingga tombol bayar selesai di `/pos`. |
| **Waktu Tutup Buku** | **< 2 menit per sesi** | 60–90 menit per sesi | Durasi input stok fisik hingga penutupan sesi resmi dan terbitnya laporan finansial. |
| **Akurasi Finansial** | **0% Kesalahan Hitung (100% Akurat)** | Rata-rata 3–5% selisih kalkulasi manual | Validasi matematis otomatis oleh Supabase RPC `get_session_financial_summary`. |
| **Transparansi UMKM** | **100% Laporan Terbit di Hari H** | Laporan sering tertunda 2–3 hari | Laporan teks WhatsApp dihasilkan seketika lewat 1-klik tombol copy di `/admin/reports`. |
| **Kehandalan Jaringan** | **0% Transaksi Hilang saat Offline** | Penjualan terhenti saat sinyal mati | Antrean transaksi tersimpan aman di IndexedDB (`idb`) dan auto-sync saat online. |
| **Akuntabilitas Kas** | **100% Arus Kas Terekam di Ledger** | Arus kas tercatat acak di buku tulis | Trigger otomatis mencatat transaksi kasir ke `cash_flows` dan pembayaran vendor sebagai beban. |

---

## 5. Consignment Business Logic & Financial Ledger Flow

Sistem mengadopsi model konsinyasi murni (*pure consignment retail*):

```mermaid
flowchart TD
    Vendor["Mitra UMKM (Vendor)"] -->|1. Titip Barang & Setor Stok Awal| Setup["Setup Sesi Mingguan (Admin)"]
    Setup -->|Catat harga_asli & Tentukan harga_jual| POS["Katalog Aktif POS (/pos)"]
    POS -->|2. Transaksi Terjual (Cash / QRIS)| Cashier["Kasir Melayani Jemaat"]
    Cashier -->|Atomic RPC complete_transaction| SalesRecord["Pencatatan Penjualan & Trigger Buku Kas"]
    
    SalesRecord --> Reconcile["Rekonsiliasi Akhir Hari (Admin)"]
    Reconcile -->|3. Hitung Sisa Fisik & Tutup Sesi| Split["Pemisahan Finansial Otomatis"]
    
    Split -->|100% Modal Terjual (harga_asli × terjual)| Due["Utang Konsinyasi ke UMKM"]
    Split -->|Laba Bersih ((harga_jual - harga_asli) × terjual)| Profit["Kas Laba Bersih OMK"]
    Split -->|Sisa Fisik Tak Terjual (Zero Cost)| Return["Dikembalikan Utuh ke UMKM"]
    
    Due --> Settlement["Pelunasan Pembayaran (/admin/payments)"]
    Settlement -->|Trigger Pengeluaran Buku Kas| Ledger["Buku Kas Organisasi (cash_flows)"]
```

### Formula Finansial Baku (Single Source of Truth)
1. **Harga Modal (`harga_asli`):** Nominal rupiah murni per unit yang disepakati dengan vendor UMKM. Menjadi hak penuh vendor untuk setiap unit yang laku terjual.
2. **Harga Retail (`harga_jual`):** Harga jual ke pembeli jemaat (`harga_jual >= harga_asli`).
3. **Margin / Profit OMK per Unit:**  
   $$\text{Margin OMK} = \text{harga\_jual} - \text{harga\_asli}$$
4. **Total Omzet Kotor Sesi:**  
   $$\text{Total Gross} = \sum (\text{harga\_jual} \times \text{terjual})$$
5. **Total Utang Konsinyasi Sesi (Hak Vendor):**  
   $$\text{Total Remittance Due} = \sum (\text{harga\_asli} \times \text{terjual})$$
6. **Total Laba Bersih OMK Sesi:**  
   $$\text{Total OMK Profit} = \sum ((\text{harga\_jual} - \text{harga\_asli}) \times \text{terjual})$$
7. **Barang Tidak Terjual (*Unsold Stock*):**  
   $$\text{Sisa Fisik} = \text{stok\_awal} - \text{terjual}$$  
   *Barang sisa dikembalikan utuh secara fisik kepada mitra UMKM tanpa menimbulkan kewajiban biaya apapun bagi pihak OMK (zero liability).*

---

## 6. Master Feature Catalog (F-01 s/d F-16)

Berikut adalah daftar 16 modul fitur utama yang telah beroperasi secara stabil:

| Kode Fitur | Nama Modul | Rute / Komponen | Peran Pengguna Utama |
|---|---|---|---|
| **F-01** | Autentikasi & RBAC Dasar | `/login`, `/change-password`, `/reset-password` | Semua Pengguna |
| **F-02** | Layar Kasir POS Real-Time | `/pos` | `cashier`, `admin` |
| **F-03** | PWA & Antrean Transaksi Offline | `OfflineBanner.vue`, `useOfflineQueue.ts` | `cashier` |
| **F-04** | Master Data Mitra UMKM | `/admin/umkm`, `/admin/umkm/[id]` | `admin`, `super_admin` |
| **F-05** | Setup Sesi Mingguan & Rekomendasi Stok | `/admin/setup`, `/admin/setup/[umkm_id]` | `admin` |
| **F-06** | Dashboard Finansial Sesi | `/admin/dashboard` | `admin`, `super_admin` |
| **F-07** | Rekonsiliasi Stok Akhir Hari | `/admin/reconciliation` | `admin` |
| **F-08** | Generator Laporan WhatsApp | `/admin/reports` | `admin` |
| **F-09** | Riwayat Sesi & Log Transaksi Struk | `/admin/history` | `admin`, `super_admin` |
| **F-10** | Visualisasi Analitik Penjualan | `/admin/analytics` | `admin`, `super_admin` |
| **F-11** | Buku Kas Keuangan (Cash Flow Ledger) | `/admin/cash-flow` | `admin`, `super_admin` |
| **F-12** | Pelunasan Utang & Pembayaran UMKM | `/admin/payments` | `admin`, `super_admin` |
| **F-13** | Portal Performa UMKM Publik Aman | `/umkm/performance/[id]` | Mitra UMKM (Publik) |
| **F-14** | Manajemen Akun Kasir & User Overrides | `/admin/users` | `admin`, `super_admin` |
| **F-15** | Multi-Parish / Multi-Company Tenancy | `CompanySwitcher.vue`, `/admin/settings/company` | `super_admin`, `admin` |
| **F-16** | Dynamic Roles & Permissions Catalog | `/admin/roles`, `/admin/permissions` | `super_admin` |

---

## 7. Master User Stories & Acceptance Criteria

Berikut adalah spesifikasi lengkap User Story dan Kriteria Penerimaan (*Acceptance Criteria*) berbasis BDD (*Given - When - Then*) untuk seluruh 16 fitur:

### F-01: Autentikasi & Role-Based Access Control (RBAC)
- **User Story:**
  - *Sebagai pengguna (Kasir / Admin / Super Admin), saya ingin masuk ke dalam sistem menggunakan email dan password terdaftar serta dapat mengganti sandi secara mandiri, sehingga saya dapat mengakses fungsi sistem sesuai wewenang saya dengan aman.*
- **Acceptance Criteria:**
  - **Skenario 1.1: Login Berhasil & Redirect Sesuai Role**
    - **Given:** Pengguna berada di halaman `/login` dengan status akun aktif (`is_active: true`).
    - **When:** Pengguna memasukkan email dan password yang valid lalu menekan tombol "Masuk".
    - **Then:** Sistem melakukan autentikasi via Supabase Auth, memuat role dan permission aktif, menyetel context tenant paroki, lalu mengarahkan kasir ke `/pos` atau administrator ke `/admin/dashboard`.
  - **Skenario 1.2: Force Password Change**
    - **Given:** Akun pengguna baru dibuat dengan password sementara dan bendera `force_password_change = true`.
    - **When:** Pengguna berhasil login.
    - **Then:** Route guard `auth.ts` secara otomatis mencegat akses dan mengarahkan pengguna ke halaman `/change-password`, memblokir akses ke halaman lain hingga sandi baru disimpan.
  - **Skenario 1.3: Pencegahan Akses Tak Berhak (Route Guard)**
    - **Given:** Pengguna dengan role `cashier` mencoba mengetik URL rute administratif `/admin/dashboard` secara langsung di browser.
    - **When:** Navigasi dijalankan.
    - **Then:** Route guard `admin.ts` / `permission.ts` memblokir akses dan mengembalikan pengguna ke `/pos` dengan pesan kesalahan hak akses.

---

### F-02: Layar Kasir POS Real-Time
- **User Story:**
  - *Sebagai kasir, saya ingin memilih produk yang tersedia, memvalidasi sisa stok secara real-time, menggunakan numpad virtual untuk pembayaran tunai/QRIS, dan menyelesaikan transaksi dalam hitungan detik, agar saya dapat melayani jemaat dengan cepat tanpa antrean panjang.*
- **Acceptance Criteria:**
  - **Skenario 2.1: Pencarian Produk & Keranjang Belanja**
    - **Given:** Sesi hari ini berstatus aktif (`status = 'open'`) dan terdapat produk dengan `stok_sekarang > 0`.
    - **When:** Kasir mengetik nama produk di kolom pencarian atau mengklik kartu produk.
    - **Then:** Produk masuk ke keranjang Pinia in-memory; jumlah kuantitas bertambah; dan subtotal terhitung instan.
  - **Skenario 2.2: Isolasi Kerahasiaan Harga Modal (`harga_asli`)**
    - **Given:** Kasir membuka antarmuka `/pos` dan memeriksa katalog produk maupun DOM browser.
    - **Then:** Seluruh data yang ditampilkan hanya bersumber dari `products_cashier_view`, tidak ada eksposur field `harga_asli` sama sekali di frontend kasir.
  - **Skenario 2.3: Numpad Virtual & Hitungan Kembalian**
    - **Given:** Keranjang berisi total belanja Rp 35.000.
    - **When:** Kasir memilih metode tunai (*Cash*) dan menekan tombol preset `50.000`.
    - **Then:** Kolom kembalian seketika menampilkan `Rp 15.000` dengan tipografi kontras `text-pos-change`. Tombol "Selesaikan Pembayaran" menjadi aktif.
  - **Skenario 2.4: Transaksi Atomik Database (RPC)**
    - **Given:** Kasir menekan tombol "Selesaikan Pembayaran".
    - **When:** Permintaan dikirim ke server.
    - **Then:** Sistem mengeksekusi RPC `complete_transaction` yang mengunci baris stok, memvalidasi ketersediaan stok, mengurangi `stok_sekarang`, mencatat record transaksi dan item, serta men-trigger entri kas masuk ke `cash_flows` dalam satu transaksi database ACID.
  - **Skenario 2.5: Sinkronisasi Stok Real-Time Antar Kasir**
    - **Given:** Dua kasir (Kasir A dan Kasir B) membuka antarmuka `/pos`.
    - **When:** Kasir A menyelesaikan penjualan 2 unit "Puding Cokelat".
    - **Then:** Melalui Supabase Realtime channel, layar Kasir B otomatis memperbarui sisa stok "Puding Cokelat" tanpa perlu reload halaman.

---

### F-03: PWA & Antrean Transaksi Offline
- **User Story:**
  - *Sebagai kasir, saya ingin tetap dapat memproses transaksi ketika koneksi internet gereja tiba-tiba terputus, dan transaksi tersebut otomatis disinkronkan ke server saat internet kembali terhubung, sehingga operasional kasir tidak pernah macet.*
- **Acceptance Criteria:**
  - **Skenario 3.1: Deteksi Koneksi Terputus & Banner Indikator**
    - **Given:** Kasir sedang berada di halaman `/pos`.
    - **When:** Jaringan internet perangkat terputus (`navigator.onLine = false`).
    - **Then:** `OfflineBanner` muncul di bagian atas layar memberitahukan mode offline aktif, aplikasi tetap responsif melayani penjualan.
  - **Skenario 3.2: Penyimpanan Transaksi ke IndexedDB**
    - **Given:** Kasir dalam status offline menyelesaikan transaksi tunai.
    - **When:** Tombol bayar ditekan.
    - **Then:** Transaksi disimpan secara terenkripsi ke IndexedDB (`idb`) antrean offline lokal, nomor struk sementara digenerate, dan jumlah antrean tertunda pada banner bertambah (+1).
  - **Skenario 3.3: Sinkronisasi Otomatis saat Online**
    - **Given:** Terdapat 3 transaksi pending di IndexedDB.
    - **When:** Perangkat kembali terhubung ke jaringan internet.
    - **Then:** Composable `useOfflineQueue` secara otomatis mengeksekusi antrean secara berurutan ke RPC `complete_transaction`, mengosongkan IndexedDB, dan menampilkan notifikasi sukses sinkronisasi.

---

### F-04: Master Data Mitra UMKM
- **User Story:**
  - *Sebagai admin, saya ingin mendaftarkan mitra UMKM paroki dan mengelola katalog produk master mereka beserta harga modal, agar barang yang dijual tercatat rapi dan berkesinambungan lintas minggu.*
- **Acceptance Criteria:**
  - **Skenario 4.1: Pembuatan Mitra & Produk Master**
    - **Given:** Admin berada di `/admin/umkm`.
    - **When:** Admin mengisi nama UMKM, nomor WhatsApp, dan menambahkan daftar produk master beserta `harga_asli`.
    - **Then:** Data tersimpan di tabel `umkm` dan `master_products` dengan relasi `company_id` paroki aktif.
  - **Skenario 4.2: Soft-Deactivation (Keamanan Relasi)**
    - **Given:** Mitra UMKM memiliki riwayat transaksi di masa lalu.
    - **When:** Admin memilih opsi nonaktifkan mitra.
    - **Then:** Sistem melakukan soft-deactivate (`is_active = false`), mencegah mitra dipilih pada setup sesi baru tanpa merusak data historis penjualan.

---

### F-05: Setup Sesi Mingguan & Rekomendasi Stok
- **User Story:**
  - *Sebagai admin, saya ingin membuka sesi penjualan hari Minggu, memilih produk dari master catalog, menetapkan harga jual dan stok awal, serta melihat rekomendasi stok berdasarkan penjualan 3 minggu terakhir, agar estimasi stok optimal dan tidak banyak sisa mubazir.*
- **Acceptance Criteria:**
  - **Skenario 5.1: Inisialisasi Sesi & Validasi Harga**
    - **Given:** Admin berada di `/admin/setup` untuk tanggal hari ini (`getTodayJakarta()`).
    - **When:** Admin memilih produk master dan memasukkan `harga_jual` lebih rendah dari `harga_asli`.
    - **Then:** Form menampilkan validasi error "Harga jual tidak boleh lebih rendah dari harga modal".
  - **Skenario 5.2: Algoritma Rekomendasi Stok 3 Sesi**
    - **Given:** Produk memiliki data penjualan pada 3 sesi tertutup sebelumnya ($S_1=10, S_2=15, S_3=20$).
    - **When:** Admin membuka formulir setup produk tersebut.
    - **Then:** RPC `get_product_stock_recommendation` menghitung bobot rata-rata tertimbang ($0.5 \times S_3 + 0.3 \times S_2 + 0.2 \times S_1$) dan menampilkan angka rekomendasi stok sebagai acuan admin.

---

### F-06: Dashboard Finansial Sesi
- **User Story:**
  - *Sebagai admin atau pengurus, saya ingin melihat ringkasan omzet kotor, total utang ke vendor UMKM, dan laba bersih OMK secara real-time, agar kondisi keuangan sesi terpantau akurat.*
- **Acceptance Criteria:**
  - **Skenario 6.1: Kartu Metrik Finansial**
    - **Given:** Terdapat transaksi yang berjalan pada sesi aktif.
    - **When:** Admin membuka `/admin/dashboard`.
    - **Then:** Nilai Gross Revenue, Remittance Due, dan OMK Net Profit ditampilkan dengan format Rupiah presisi bersumber dari RPC `get_session_financial_summary`.
  - **Skenario 6.2: Rincian Akordion per UMKM**
    - **When:** Admin mengklik salah satu baris UMKM pada tabel dashboard.
    - **Then:** Tabel akordion membuka rincian per produk (stok awal, terjual, sisa, omzet, modal, dan laba OMK).

---

### F-07: Rekonsiliasi Stok Akhir Hari
- **User Story:**
  - *Sebagai admin, saya ingin menginput sisa fisik barang dagangan saat pasar selesai, mendeteksi selisih antara stok sistem vs fisik, dan menutup sesi secara resmi, agar tidak ada transaksi baru dan buku kas terkunci rapi.*
- **Acceptance Criteria:**
  - **Skenario 7.1: Deteksi Selisih Stok (Selisih)**
    - **Given:** Sistem mencatat sisa stok produk "Lemper" adalah 5 buah.
    - **When:** Admin menginput stok fisik = 4 buah pada `/admin/reconciliation`.
    - **Then:** Kolom selisih menampilkan `-1` dengan badge warna merah (*Warning: Kurang 1 pcs*).
  - **Skenario 7.2: Penutupan Sesi Resmi (Close Session)**
    - **When:** Admin mengonfirmasi tombol "Tutup Sesi".
    - **Then:** RPC `close_session` mencatat baris rekonsiliasi ke tabel `reconciliation`, mengubah status sesi menjadi `'closed'`, dan otomatis memblokir kasir `/pos` untuk sesi tersebut.

---

### F-08: Generator Laporan WhatsApp
- **User Story:**
  - *Sebagai admin, saya ingin menyalin format pesan laporan penjualan per UMKM dengan 1 klik untuk dikirimkan melalui WhatsApp, agar mitra segera mengetahui sisa barang dan hak pembayarannya.*
- **Acceptance Criteria:**
  - **Skenario 8.1: Format Teks Terstandar**
    - **Given:** Sesi telah ditutup.
    - **When:** Admin membuka `/admin/reports` dan memilih salah satu UMKM.
    - **Then:** Sistem menghasilkan format teks WhatsApp yang memuat: Tanggal Sesi, Rincian Produk (Terjual / Sisa Kembali), Total Hak Pembayaran Modal, dan nomor rekening/catatan transfer.
  - **Skenario 8.2: 1-Click Copy ke Clipboard**
    - **When:** Admin menekan tombol "Salin Laporan WhatsApp".
    - **Then:** Teks tersalin ke clipboard sistem perangkat dan muncul toast sukses "Laporan berhasil disalin!".

---

### F-09: Riwayat Sesi & Log Transaksi Struk
- **User Story:**
  - *Sebagai admin, saya ingin meninjau kembali riwayat sesi-sesi terdahulu beserta log struk belanja individu kasir, agar dapat melakukan audit jika ada pertanyaan dari vendor atau pengurus.*
- **Acceptance Criteria:**
  - **Skenario 9.1: Direktori Riwayat Sesi**
    - **When:** Admin mengakses `/admin/history`.
    - **Then:** Menampilkan daftar sesi masa lalu lengkap dengan tanggal (format WIB), total omzet, laba OMK, dan status penutupan.
  - **Skenario 9.2: Detail Keranjang Transaksi Kasir**
    - **When:** Admin memilih sesi tertentu dan membuka tab "Log Transaksi Kasir".
    - **Then:** Menampilkan nomor invoice/transaksi, jam transaksi, kasir yang bertugas, metode pembayaran (Cash/QRIS), dan daftar item yang dibeli.

---

### F-10: Visualisasi Analitik Penjualan
- **User Story:**
  - *Sebagai admin, saya ingin melihat tren omzet mingguan, kontribusi laba per UMKM, dan produk paling laris dalam bentuk grafik interaktif, agar dapat mengambil keputusan bisnis yang tepat untuk minggu berikutnya.*
- **Acceptance Criteria:**
  - **Skenario 10.1: Grafik Tren Mingguan (Line Chart)**
    - **When:** Admin membuka `/admin/analytics`.
    - **Then:** Chart.js me-render tren 10 sesi terakhir yang membandingkan garis Gross Revenue, Modal Vendor, dan Laba OMK.
  - **Skenario 10.2: Distribusi Profit UMKM (Doughnut Chart)**
    - **Then:** Menampilkan persentase kontribusi laba dari masing-masing UMKM terhadap total profit OMK.

---

### F-11: Buku Kas Keuangan (Cash Flow Ledger)
- **User Story:**
  - *Sebagai pengurus, saya ingin seluruh uang masuk dari kasir otomatis tercatat di buku kas dan dapat mencatat pengeluaran operasional manual, agar saldo kas OMK transparan dan selalu seimbang.*
- **Acceptance Criteria:**
  - **Skenario 11.1: Entri Otomatis Penjualan POS**
    - **Given:** Kasir menyelesaikan transaksi di `/pos`.
    - **Then:** Database trigger secara otomatis menyisipkan entri kas masuk bertipe `'income'` kategori `'sales'` ke dalam tabel `cash_flows`.
  - **Skenario 11.2: Pencatatan Beban Manual & Saldo Berjalan**
    - **When:** Admin menginput pengeluaran manual (misal: beli plastik kresek Rp 25.000) di `/admin/cash-flow`.
    - **Then:** Entri kas keluar tercatat, dan total saldo berjalan (*running balance*) otomatis berkurang sesuai nominal.

---

### F-12: Pelunasan Utang & Pembayaran UMKM
- **User Story:**
  - *Sebagai admin, saya ingin melihat akumulasi utang modal ke setiap UMKM dan mencatat bukti pelunasan transfer, yang secara otomatis mengurangi saldo buku kas, agar kewajiban organisasi lunas tepat waktu.*
- **Acceptance Criteria:**
  - **Skenario 12.1: Agregasi Utang Konsinyasi**
    - **When:** Admin membuka `/admin/payments`.
    - **Then:** Menampilkan daftar UMKM dengan kolom: Total Hak Modal (All-Time), Total Telah Dibayar, dan Sisa Utang Belum Lunas (*Outstanding Due*).
  - **Skenario 12.2: Pencatatan Pembayaran & Trigger Ledger**
    - **When:** Admin menekan "Bayar", mengisi nominal transfer pelunasan, dan menekan submit via RPC `mark_umkm_as_paid`.
    - **Then:** Sisa utang UMKM berkurang dan sistem otomatis membuat baris pengeluaran kas (`expense`, kategori `umkm_payout`) di `cash_flows`.

---

### F-13: Portal Performa UMKM Publik Aman
- **User Story:**
  - *Sebagai pemilik UMKM, saya ingin dapat membuka link web performa penjualan saya tanpa perlu repot login dengan akun/password, agar saya dapat melihat rekap barang laku saya kapan saja secara mandiri.*
- **Acceptance Criteria:**
  - **Skenario 13.1: Akses Tanpa Login (Auth-Free Safe Endpoint)**
    - **Given:** Mitra membuka link `/umkm/performance/[umkm_id]` yang diterima via WhatsApp.
    - **When:** Halaman dimuat.
    - **Then:** Nitro server endpoint `/api/public/umkm-performance/[id]` mengembalikan data penjualan vendor terkait secara aman menggunakan Service Role tanpa membocorkan data UMKM lain.
  - **Skenario 13.2: Informasi Transparan**
    - **Then:** Portal menampilkan: Total Unit Terjual Kumulatif, Total Hak Modal Diterima, Tabel Rincian per Produk, dan Riwayat Sesi Mingguan beserta catatan sisa barang fisik.

---

### F-14: Manajemen Akun Kasir & User Overrides
- **User Story:**
  - *Sebagai super admin/admin, saya ingin mendaftarkan akun kasir baru dengan kata sandi sementara, mengaktifkan/menonaktifkan akun, serta memberikan hak akses khusus (*override*) per pengguna jika diperlukan, agar keamanan akun terjaga.*
- **Acceptance Criteria:**
  - **Skenario 14.1: Pembuatan Kasir & Sandi Sementara**
    - **Given:** Admin berada di `/admin/users`.
    - **When:** Admin membuat akun kasir baru dengan email `kasir1@paroki.org`.
    - **Then:** Server Nitro membuat user di Supabase Auth, mengaitkannya ke company aktif via `company_users`, menetapkan password acak sementara, dan menandai `force_password_change = true`.
  - **Skenario 14.2: Granular User Permission Overrides Modal**
    - **Given:** Admin membuka modal hak akses untuk kasir tertentu.
    - **When:** Admin secara spesifik memberikan izin `reports.view` (*Grant*) meskipun role standar kasir tidak memilikinya.
    - **Then:** Data override tersimpan di tabel `user_permissions`, RBAC cache server di-invalidate, dan kasir tersebut langsung mendapatkan akses terkait.

---

### F-15: Multi-Parish / Multi-Company Tenancy
- **User Story:**
  - *Sebagai koordinator lintas paroki atau pengurus, saya ingin dapat berpindah konteks paroki secara instan melalui CompanySwitcher dan memastikan seluruh data transaksi terisolasi secara ketat antar paroki, sehingga satu sistem dapat melayani banyak gereja tanpa saling bercampur.*
- **Acceptance Criteria:**
  - **Skenario 15.1: Isolasi Data Row-Level Security (RLS)**
    - **Given:** User berada di Paroki Santo Antonius (`company_id: A`).
    - **Then:** Query Supabase dan API hanya mengembalikan UMKM, sesi, transaksi, dan produk milik Paroki A. Data milik Paroki B tidak dapat diakses sama sekali.
  - **Skenario 15.2: CompanySwitcher Komponen & Injeksi Header**
    - **When:** User beralih paroki melalui dropdown `CompanySwitcher`.
    - **Then:** Store Pinia `useCompanyStore` memperbarui state, menyimpan ID ke `localStorage` (`omk_active_company_id`), menginjeksi header `X-Company-Id` ke seluruh request, dan me-reload store produk serta sesi seketika.
  - **Skenario 15.3: Pengaturan Profil Paroki & Struk**
    - **When:** Admin membuka `/admin/settings/company`.
    - **Then:** Admin dapat memperbarui nama paroki, alamat, kontak WhatsApp, nama rekening bank, dan pesan footer struk kasir.

---

### F-16: Dynamic Roles & Permissions Catalog
- **User Story:**
  - *Sebagai super admin, saya ingin membuat role custom baru, memilih izin apa saja yang diizinkan per modul, dan memastikan evaluasi izin berjalan cepat tanpa membebani database, agar hak akses fleksibel sesuai struktur pengurus paroki.*
- **Acceptance Criteria:**
  - **Skenario 16.1: Manajemen Role & Modul Permissions**
    - **Given:** Super Admin berada di `/admin/roles`.
    - **When:** Super Admin membuat role baru "Koordinator Konsinyasi" dan mencentang izin modul `catalog` dan `finance`.
    - **Then:** Role tersimpan di tabel `roles` dan relasi permissions tercatat di `role_permissions`.
  - **Skenario 16.2: High-Performance In-Memory Caching & Guard Evaluation**
    - **Given:** Endpoint backend dilindungi dengan `requirePermission(event, 'finance.manage')`.
    - **When:** Request diterima dengan token JWT dan header `X-Company-Id`.
    - **Then:** Helper memeriksa cache memori Nitro (`rbacCache.ts`). Jika cache hit, otorisasi diproses <1ms tanpa roundtrip ke database Supabase.
