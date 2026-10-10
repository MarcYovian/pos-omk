# Test Scenarios (Test Plan): UMKM Partner Master Data Management (F-04)

> **Dokumen Tahap 3/9 — Rencana Pengujian & Daftar Skenario**  
> *Fungsi: Memetakan seluruh skenario pengujian dengan format Given-When-Then, menetapkan prioritas risiko (P0-P3), serta mengelompokkan skenario positif, negatif, edge-case, dan integritas sebelum penulisan test case terperinci.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-04` |
| **Nama Fitur** | `UMKM Partner Master Data Management` |
| **Total Skenario** | `12 Skenario` |
| **Rasio Prioritas** | `P0: 5 | P1: 5 | P2: 2 | P3: 0` |
| **Target Cakupan** | `UI E2E + Pinia Store State + Supabase RLS & FK Constraints` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |

---

## 2. Definisi Skala Prioritas & Tipe Uji

| Prioritas | Kriteria | Toleransi Rilis |
|---|---|---|
| **P0 (Critical)** | Registrasi mitra & produk master valid, soft-deactivation (keberlanjutan data), proteksi route guard kasir, isolasi harga modal. | Zero tolerance; blokir rilis jika gagal. |
| **P1 (High)** | Validasi format WhatsApp (`62...`), penanganan duplikasi nama produk, penolakan foreign key hard delete, clipboard link, tab performa. | Harus lulus sebelum staging rilis. |
| **P2 (Medium)** | Filter pencarian instan klien, responsivitas mobile PWA 375px, ergonomi sentuh form & modal. | Dapat diperbaiki pada patch minor. |
| **P3 (Low)** | Animasi transisi hover kartu, mikro-tipografi non-kritis. | Tidak menghambat rilis. |

---

## 3. Daftar Skenario Pengujian (Given-When-Then)

| ID | Skenario Pengujian (Given-When-Then) | Tipe | Prioritas | Sumber / Rujukan | Status Automasi |
|---|---|---|---|---|---|
| **S-01** | **Given** Admin paroki terautentikasi berada di halaman `/admin/umkm`<br>**When** Menekan tombol "Tambah UMKM", mengisi nama mitra valid dan nomor WhatsApp diawali `62` (misal: `628123456789`), lalu menekan tombol "Simpan"<br>**Then** Data mitra tersimpan di tabel `umkm` dengan `is_active: true` dan `company_id` paroki aktif, modal tertutup, toast sukses muncul, dan kartu mitra baru tampil di grid secara alfabetis | Positif | P0 | PRD Skenario 4.1 | Candidate (Playwright) |
| **S-02** | **Given** Admin berada di halaman detail mitra `/admin/umkm/[umkm_id]` pada tab "Katalog Master"<br>**When** Menekan "Tambah Produk", memasukkan nama produk valid dan `harga_asli` (> 0), lalu menekan "Simpan"<br>**Then** Data tersimpan di tabel `master_products` dengan `is_active: true`, toast sukses muncul, modal tertutup, dan kartu produk master muncul di katalog menampilkan harga modal terformat Rupiah | Positif | P0 | PRD Skenario 4.1 | Candidate (Playwright) |
| **S-03** | **Given** Admin berada di `/admin/umkm` dan memilih salah satu mitra aktif<br>**When** Menekan tombol ikon pensil (edit), menonaktifkan toggle "Status Kemitraan" (`is_active = false`), lalu menekan "Simpan Perubahan"<br>**Then** Kolom `is_active` pada tabel `umkm` menjadi `false`, badge status kartu berubah menjadi "Nonaktif" berwarna abu-abu, dan data transaksi masa lalu tetap utuh | Keamanan / Bisnis | P0 | PRD Skenario 4.2 | Candidate (Playwright) |
| **S-04** | **Given** Admin berada di `/admin/umkm/[umkm_id]` pada tab "Katalog Master"<br>**When** Menekan tombol edit pada produk master tertentu, menonaktifkan toggle "Status Produk" (`is_active = false`), lalu menekan "Simpan Perubahan"<br>**Then** Kolom `is_active` pada tabel `master_products` menjadi `false`, badge produk berubah menjadi "Nonaktif", dan produk otomatis disaring dari alokasi sesi baru di F-05 | Keamanan / Bisnis | P0 | PRD F-04 / Soft Delete | Candidate (Playwright) |
| **S-05** | **Given** Pengguna login sebagai `cashier` dan sedang berada di layar kasir `/pos`<br>**When** Kasir mencoba mengakses URL `/admin/umkm` atau `/admin/umkm/[umkm_id]` secara langsung di address bar browser<br>**Then** Route guard `admin.ts` mencegat navigasi, memblokir rendering antarmuka admin, dan mengarahkan kembali kasir ke `/pos` | Keamanan / RBAC | P0 | PRD F-01 / Guard Rule | Candidate (Playwright) |
| **S-06** | **Given** Admin membuka modal "Daftarkan UMKM Baru" atau "Edit Mitra UMKM"<br>**When** Memasukkan nomor WhatsApp yang tidak diawali `62` (misal diawali `0812...` atau teks bukan angka) lalu menekan "Simpan"<br>**Then** Sistem menolak submit di sisi klien, menampilkan toast peringatan "Nomor WhatsApp harus diawali dengan kode negara 62", dan modal tetap terbuka | Negatif / Validasi | P1 | DEC-01 / Form Guard | Candidate (Playwright) |
| **S-07** | **Given** Mitra UMKM sudah memiliki produk bernama "Kue Nastar Keju"<br>**When** Admin mencoba menambahkan produk master baru untuk mitra tersebut dengan nama yang sama persis "Kue Nastar Keju"<br>**Then** Database menolak karena constraint unik `(company_id, umkm_id, nama_produk)`, UI menangkap error dan memunculkan toast bahaya "Gagal: Produk dengan nama tersebut sudah terdaftar untuk mitra ini" | Negatif / Validasi | P1 | DEC-03 / DB Constraint | Candidate (Playwright) |
| **S-08** | **Given** Produk master sudah pernah dialokasikan ke tabel `session_products` pada sesi penjualan masa lalu<br>**When** Admin menekan tombol ikon tempat sampah (hapus) pada kartu produk dan menyetujui dialog konfirmasi browser<br>**Then** Database menolak penghapusan karena foreign key `ON DELETE RESTRICT`, UI menangkap error dan memunculkan toast bahaya instruksi ganti status nonaktif, serta produk tidak terhapus | Negatif / Integritas | P1 | DEC-02 / FK Constraint | Candidate (Playwright) |
| **S-09** | **Given** Admin berada di `/admin/umkm` melihat kartu-kartu mitra<br>**When** Admin mengklik tombol ikon salin tautan (clipboard) pada kartu mitra tertentu<br>**Then** Tautan dashboard publik `${origin}/umkm/performance/${id}` disalin ke clipboard dan toast konfirmasi "Link performa UMKM berhasil disalin!" muncul di layar | Positif | P1 | PRD F-04 / Public Link | Candidate (Playwright) |
| **S-10** | **Given** Admin berada di `/admin/umkm/[umkm_id]`<br>**When** Admin mengklik tab "Statistik Performa"<br>**Then** Sistem memanggil RPC `get_umkm_product_performance` dan `get_umkm_session_history`, merender ringkasan total terjual (pcs), total setoran bersih (Rp), tabel performa tiap produk, dan tabel riwayat keikutsertaan sesi | Positif | P1 | PRD F-04 / RPC Analytics | Candidate (Playwright) |
| **S-11** | **Given** Direktori memuat banyak mitra UMKM dengan nama dan nomor WhatsApp berbeda<br>**When** Admin mengetikkan nama atau nomor WA pada kolom input pencarian<br>**Then** Daftar mitra tersaring secara instan (<100ms) secara reaktif pada state Pinia tanpa memicu request jaringan ulang | UI / Performa | P2 | Reactive Filter | Candidate (Playwright) |
| **S-12** | **Given** Viewport pengujian diatur pada ukuran mobile 375×667px (iPhone SE)<br>**When** Admin membuka `/admin/umkm` dan berinteraksi dengan tombol aksi serta modal formulir<br>**Then** Grid kartu beralih ke 1 kolom vertikal, seluruh target sentuh tombol memenuhi standar ergonomi sentuh minimal 48×48px, dan dialog modal tampil proporsional tanpa horizontal scrollbar | Ergonomi & Responsivitas | P2 | UI/UX Spec 4.1 | Visual Check (Playwright) |

---

## 4. Matriks Cakupan Pengujian (Coverage Matrix)

### 4.1 Cakupan Berdasarkan Peran (Role Coverage)
| Peran (Role) | Target Skenario | Skenario Terkait |
|---|---|---|
| **Admin Paroki (`admin`)** | Operasional master data, pendaftaran, edit, penonaktifan, katalog produk, salin link | S-01, S-02, S-03, S-04, S-06, S-07, S-08, S-09, S-10, S-11, S-12 |
| **Super Admin (`super_admin`)** | Pengelolaan master data lintas paroki/company | S-01, S-02, S-03, S-04 |
| **Kasir (`cashier`)** | Verifikasi pencegahan akses ke rute admin & proteksi harga modal | S-05 |
| **Publik / Tamu (`guest`)** | Proteksi route guard (harus redirect ke login) | S-05 |

### 4.2 Cakupan Berdasarkan Viewport & Jaringan
| Kondisi / Viewport | Perilaku yang Divalidasi | Skenario Terkait |
|---|---|---|
| **Desktop (1280×800)** | Tampilan grid multi-kolom (2-4 kolom), interaksi modal terpusat, aksi cepat kartu | S-01, S-02, S-03, S-07, S-08, S-10 |
| **Mobile PWA (375×667)** | Tampilan 1 kolom vertikal, target sentuh 48×48px, form modal nyaman di layar kecil | S-11, S-12 |
| **Realtime PubSub Multi-User** | Pemutakhiran otomatis daftar saat browser admin lain menambah/mengedit mitra | S-01, S-03 |

---

## 5. Keterlacakan ke Acceptance Criteria (Traceability Matrix)

| Rujukan Kriteria (PRD & Spesifikasi) | Skenario Teruji | Status Keterpenuhan |
|---|---|---|
| `PRD Skenario 4.1: Pembuatan Mitra & Produk Master` | `S-01`, `S-02` | `Tercakup Lengkap (P0)` |
| `PRD Skenario 4.2: Soft-Deactivation (Keamanan Relasi)` | `S-03`, `S-04` | `Tercakup Lengkap (P0)` |
| `PRD F-01 & AGENTS.md: Route Guard & Kerahasiaan Harga Modal` | `S-05` | `Tercakup Lengkap (P0)` |
| `DEC-01 & Form Guard: Validasi Nomor WhatsApp 62` | `S-06` | `Tercakup Lengkap (P1)` |
| `DEC-03 & Database Constraint: Keunikan Nama Produk` | `S-07` | `Tercakup Lengkap (P1)` |
| `DEC-02 & PostgreSQL FK: Proteksi Foreign Key Restriction` | `S-08` | `Tercakup Lengkap (P1)` |
| `PRD F-04: Penyalinan Link Portal Publik` | `S-09` | `Tercakup Lengkap (P1)` |
| `PRD F-04: Analitik Historis Vendor (RPC)` | `S-10` | `Tercakup Lengkap (P1)` |
| `UI Filter: Pencarian Instan Klien` | `S-11` | `Tercakup Lengkap (P2)` |
| `UI/UX Spec 4.1: Ergonomi Sentuh & Responsivitas Mobile 375px` | `S-12` | `Tercakup Lengkap (P2)` |

---

## 6. Status Review & Persetujuan (Review Gate 1-3)

- [x] **Semua Skenario Kritis (P0) Terpetakan:** `YA (5 Skenario)`
- [x] **Distribusi Prioritas & Tipe Uji Seimbang:** `YA (P0: 5, P1: 5, P2: 2)`
- [ ] **Diberikan Izin Lanjut ke 03-screen-flow.md:** `(Menunggu Review Gate 1-3 User)`
