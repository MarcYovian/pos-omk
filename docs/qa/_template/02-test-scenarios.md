# Test Scenarios (Test Plan): [NAMA_FITUR] ([KODE_FITUR])

> **Dokumen Tahap 3/9 — Rencana Pengujian & Daftar Skenario**  
> *Fungsi: Memetakan seluruh skenario pengujian dengan format Given-When-Then, menetapkan prioritas risiko (P0-P3), serta mengelompokkan skenario positif, negatif, edge-case, dan konkurensi sebelum penulisan test case terperinci.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `[F-XX / KODE_FITUR]` |
| **Nama Fitur** | `[Nama Fitur Lengkap]` |
| **Total Skenario** | `[Jumlah Total Skenario]` |
| **Rasio Prioritas** | `P0: [X] | P1: [Y] | P2: [Z] | P3: [W]` |
| **Target Cakupan** | `UI E2E + State Store + Database Integrity` |
| **Status Dokumen** | `DRAFT / IN REVIEW / APPROVED` |
| **QA Engineer** | `[Nama QA / Agent]` |

---

## 2. Definisi Skala Prioritas & Tipe Uji

| Prioritas | Kriteria | Toleransi Rilis |
|---|---|---|
| **P0 (Critical)** | Alur utama bisnis (happy path inti), transaksi finansial, mutasi stok, auth & pemisahan tenant. | Zero tolerance; blokir rilis jika gagal. |
| **P1 (High)** | Alur negatif penting, validasi input formulir kritis, kalkulasi kembalian, error handling jaringan. | Harus lulus sebelum staging rilis. |
| **P2 (Medium)** | Filter data, pencarian teks, sorting, navigasi sekunder, tampilan responsive mobile. | Dapat diperbaiki pada patch minor. |
| **P3 (Low)** | Perilaku kosmetik, tooltip, micro-animation, estetika visual minor. | Tidak menghambat rilis. |

---

## 3. Daftar Skenario Pengujian (Given-When-Then)

| ID | Skenario Pengujian (Given-When-Then) | Tipe | Prioritas | Sumber / Rujukan | Status Automasi |
|---|---|---|---|---|---|
| **S-01** | **Given** `[kondisi awal: contoh, kasir terautentikasi dan sesi hari ini OPEN]`<br>**When** `[aksi: kasir memilih produk dan menekan tombol checkout]`<br>**Then** `[ekspektasi: modal pembayaran muncul dan nominal tagihan sesuai]` | Positif | P0 | AC-01 / PRD | Candidate (Playwright) |
| **S-02** | **Given** `[kondisi awal: contoh, kasir berada di layar pembayaran]`<br>**When** `[aksi: kasir memasukkan uang tunai kurang dari total belanjaan]`<br>**Then** `[ekspektasi: tombol proses bayar disabled dan muncul peringatan uang kurang]` | Negatif | P0 | AC-02 / PRD | Candidate (Playwright) |
| **S-03** | **Given** `[kondisi awal: stok produk di server tersisa 1]`<br>**When** `[aksi: dua kasir secara bersamaan checkout produk yang sama]`<br>**Then** `[ekspektasi: transaksi pertama berhasil, transaksi kedua ditolak dengan notifikasi stok habis]` | Konkurensi | P0 | Aturan Transaksi Atomik | E2E Concurrency |
| **S-04** | **Given** `[kondisi awal: formulir dalam keadaan kosong]`<br>**When** `[aksi: pengguna langsung menekan tombol simpan]`<br>**Then** `[ekspektasi: validasi HTML5/vuelidate muncul dan form tidak ter-submit]` | Negatif | P1 | Validasi Form | Candidate (Playwright) |
| **S-05** | **Given** `[kondisi awal: koneksi internet terputus (offline mode)]`<br>**When** `[aksi: kasir melakukan transaksi checkout tunai]`<br>**Then** `[ekspektasi: transaksi tersimpan ke IndexedDB dan OfflineBanner menampilkan antrean]` | Edge Case / PWA | P1 | F-03 PWA Queue | Candidate (Playwright/Mock) |
| **S-06** | **Given** `[kondisi awal: pengguna login sebagai kasir tanpa izin admin]`<br>**When** `[aksi: pengguna mencoba mengakses rute via URL langsung /admin/...]`<br>**Then** `[ekspektasi: route guard middleware menolak dan redirect ke /pos atau /login]` | Keamanan / RBAC | P0 | F-01 RBAC Guard | Candidate (Playwright) |
| **S-07** | **Given** `[kondisi awal: daftar produk berisi 100+ item]`<br>**When** `[aksi: kasir mengetikkan nama produk di search box]`<br>**Then** `[ekspektasi: katalog menyaring secara instan (<300ms) tanpa lag visual]` | Performa / UI | P2 | UX Spec | Candidate (Playwright) |
| **S-08** | **Given** `[kondisi awal: tampilan dibuka pada layar mobile 375px]`<br>**When** `[aksi: pengguna melihat layout tabel]`<br>**Then** `[ekspektasi: tabel otomatis bertransformasi menjadi card vertikal sesuai pola table-to-card]` | Responsivitas | P2 | UI/UX Spec 4.2 | Visual Check |

---

## 4. Matriks Cakupan Pengujian (Coverage Matrix)

### 4.1 Cakupan Berdasarkan Peran (Role Coverage)
| Peran (Role) | Target Skenario | Skenario Terkait |
|---|---|---|
| **Cashier** | Checkout, pencarian, keranjang, bayar tunai/QRIS | S-01, S-02, S-03, S-05, S-07 |
| **Admin Paroki** | Manajemen data, pengaturan sesi, rekonsiliasi, laporan | S-04, S-06 |
| **Super Admin** | Konfigurasi platform, akses lintas tenant | S-06 |
| **Tamu / Publik** | Dashboard publik (jika ada), halaman login | S-06 |

### 4.2 Cakupan Berdasarkan Kondisi Jaringan & Perangkat
| Kondisi / Viewport | Perilaku yang Divalidasi | Skenario Terkait |
|---|---|---|
| **Online (Desktop 1280px)** | Happy path penuh, tabel admin lengkap | S-01, S-02, S-04, S-06 |
| **Online (Mobile 375px)** | POS thumb-zone, tap target 48px, table-to-card | S-01, S-07, S-08 |
| **Offline Mode (PWA)** | Banner offline, antrean IndexedDB, sinkronisasi otomatis | S-05 |

---

## 5. Keterlacakan ke Acceptance Criteria (Traceability Matrix)

| Acceptance Criteria (PRD) | Skenario Teruji | Status Keterpenuhan |
|---|---|---|
| `AC-01` | `S-01, S-07` | `Tercakup Lengkap` |
| `AC-02` | `S-02` | `Tercakup Lengkap` |
| `AC-03` | `S-03` | `Tercakup Lengkap` |
| `AC-04` | `S-05` | `Tercakup Lengkap` |

---

## 6. Status Review & Persetujuan

- [ ] **Semua Skenario Kritis (P0) Disetujui:** `YA / BELUM`
- [ ] **Distribusi Prioritas & Tipe Uji Seimbang:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 03-screen-flow.md:** `(Tanda Tangan / Persetujuan User: ________)`
