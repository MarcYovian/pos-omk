# Feature Brief: UMKM Partner Master Data Management (F-04)

> **Dokumen Tahap 1/9 — Ringkasan Pemahaman Fitur**  
> *Fungsi: Memastikan pemahaman bisnis, alur pengguna, batasan teknis, dan ruang lingkup telah disepakati sebelum menyusun skenario pengujian.*

---

## 1. Metadata Fitur

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-04` |
| **Nama Fitur** | `UMKM Partner Master Data Management` |
| **Kategori / Modul** | `Katalog Produk & Kemitraan UMKM (Admin)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer / Pembuat** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |
| **Tech Lead / Reviewer** | `Product Owner & Tech Lead OMK POS` |
| **Tanggal Pembuatan** | `2026-10-10` |
| **Rujukan Dokumen** | [PRD.md](../../PRD.md), [FEATURES.md](../../FEATURES.md), [USER_FLOWS.md](../../USER_FLOWS.md), [DB_SCHEMA.md](../../DB_SCHEMA.md) |

---

## 2. Ringkasan & Tujuan Bisnis

### 2.1 Tujuan Utama (Problem & Value Statement)
- **Tujuan:** Sebagai admin paroki, saya ingin mendaftarkan mitra UMKM paroki dan mengelola katalog produk master mereka beserta harga modal (`harga_asli`), agar barang yang dijual tercatat rapi, terstandarisasi, dan berkesinambungan lintas sesi mingguan.
- **Target Hasil:**
  1. Tersedianya direktori master UMKM paroki yang terisolasi per tenant (`company_id`).
  2. Terkelolanya katalog master produk per vendor dengan kepastian harga dasar UMKM (`harga_asli`) yang akurat sebelum sesi mingguan dibuka.
  3. Terjaminnya integritas data historis konsinyasi melalui mekanisme penonaktifan lunak (*soft-deactivation*) alih-alih penghapusan keras (*hard delete*).
  4. Kemudahan berbagi tautan dashboard performa publik bagi mitra melalui integrasi tautan WhatsApp instan.

### 2.2 Peran Pengguna (Roles Involved)
- [x] **Admin Paroki (`admin`):** Memiliki akses penuh mendaftarkan mitra, mengedit profil/kontak, menambah dan mengedit produk master, mengubah status keaktifan, dan melihat performa historis vendor.
- [x] **Super Admin (`super_admin`):** Memiliki hak akses penuh pada semua modul termasuk katalog UMKM di seluruh tenant paroki.
- [ ] **Kasir (`cashier`):** **DILARANG KERAS** mengakses rute administratif `/admin/umkm`. Kasir dilarang melihat harga dasar modal UMKM (`harga_asli`). Jika kasir mencoba membuka URL ini, route guard wajib mengembalikan kasir ke `/pos`.
- [ ] **Partner UMKM (`partner`):** Tidak memiliki akun login ke dashboard admin. Vendor mengakses performa penjualan mereka melalui tautan portal publik unik `/umkm/performance/[id]` (fitur F-13) yang tautannya disalin oleh admin di halaman ini.
- [ ] **Publik / Tamu (`guest`):** Akses ditolak dan diarahkan ke `/login`.

---

## 3. Alur Pengguna Ringkas (Happy Path Journey)

```
[Langkah 1: Masuk Halaman Direktori UMKM (/admin/umkm)] 
        ↓
[Langkah 2: Registrasi Mitra UMKM Baru (Nama & Kontak WA 62...)] 
        ↓
[Langkah 3: Buka Halaman Detail Katalog Master (/admin/umkm/[id])] 
        ↓
[Langkah 4: Tambah Produk Master (Nama Produk & Harga Modal UMKM)] 
        ↓
[Langkah 5: Verifikasi Status Aktif & Siap Dialokasikan ke Sesi (F-05)]
```

**Penjelasan Tahapan:**
1. **Langkah 1 (Direktori Mitra):** Admin membuka menu `/admin/umkm`. Sistem memuat daftar mitra paroki aktif via `useUmkmStore().fetchAll()` dan mengaktifkan listener Supabase Realtime channel `umkm-changes`.
2. **Langkah 2 (Pendaftaran Mitra):** Admin menekan tombol "Tambah UMKM", mengisi nama pemilik/usaha dan nomor WhatsApp valid diawali kode negara `62` (misal: `628123456789`). Setelah submit, data tersimpan di tabel `umkm` dan kartu mitra muncul di grid secara alfabetis.
3. **Langkah 3 (Navigasi Katalog):** Dari kartu mitra, admin menekan tombol "Katalog Master" untuk membuka rute dinamis `/admin/umkm/[umkm_id]`.
4. **Langkah 4 (Input Produk Master):** Admin menekan "Tambah Produk", memasukkan nama barang (misal: "Kue Nastar Keju") dan harga modal UMKM `harga_asli` (misal: `25000`). Sistem memvalidasi duplikasi nama sebelum menyimpan ke tabel `master_products`.
5. **Langkah 5 (Kesiapan Sesi):** Produk berstatus aktif (`is_active = true`) otomatis siap dipanggil pada modul setup sesi mingguan (`/admin/setup/[umkm_id]` - F-05) untuk ditentukan harga jual eceran (`harga_jual`) dan stok fisiknya.

---

## 4. Keputusan Bisnis & Aturan Konsinyasi yang Relevan

> [!IMPORTANT]
> Seluruh alur pengujian wajib mematuhi aturan baku konsinyasi dan integritas data OMK POS:

1. **Kerahasiaan Harga Modal (`harga_asli`):**
   - Nilai `harga_asli` adalah nilai setoran 100% yang wajib dibayarkan kembali ke UMKM untuk setiap unit barang yang terjual.
   - Nilai ini hanya boleh diakses dan diatur oleh Administrator di konsol master UMKM.
   - Layar kasir `/pos` dan safe view `products_cashier_view` **TIDAK PERNAH** memuat atribut `harga_asli`.
2. **Prinsip Soft-Deactivation (Keamanan Relasi Finansial):**
   - Mitra UMKM yang telah memiliki riwayat penjualan di sesi masa lalu **DILARANG DIHAPUS KERAS (*hard delete*)**.
   - Admin hanya dapat menonaktifkan mitra via toggle `is_active = false`.
   - Mitra dan produk yang nonaktif disembunyikan dari dropdown pemilihan sesi baru (F-05), namun seluruh rekam jejak penjualan di laporan keuangan (F-06), buku kas (F-11), dan penyelesaian utang (F-12) tetap utuh.
3. **Integritas Foreign Key Produk Master:**
   - Produk master yang sudah pernah terdaftar di tabel `session_products` dilindungi oleh constraint PostgreSQL `ON DELETE RESTRICT`.
   - Jika admin mencoba menekan tombol hapus (*trash icon*), sistem menangkap pesan pelanggaran foreign key dan memberikan notifikasi edukatif kepada admin untuk menonaktifkan produk alih-alih menghapusnya.
4. **Format Kontak WhatsApp Terstandarisasi:**
   - Kontak WhatsApp dibersihkan dari karakter non-numerik dan divalidasi wajib diawali angka `62`.
   - Standar ini memastikan tombol klik chat `https://wa.me/{kontak_wa}` dan generator laporan WhatsApp (F-08) dapat beroperasi tanpa kegagalan formatting URL.
5. **Keunikan Data (Unique Constraints):**
   - Nama mitra UMKM unik per paroki (`CONSTRAINT umkm_company_nama_unique UNIQUE (company_id, nama_umkm)`).
   - Nama produk master unik per mitra dan paroki (`CONSTRAINT master_products_company_umkm_nama_unique UNIQUE (company_id, umkm_id, nama_produk)`).

---

## 5. Jejak Arsitektur & Dependensi Teknis

| Komponen | Identitas / Path | Deskripsi & Peran |
|---|---|---|
| **Rute Direktori** | `/admin/umkm` | Antarmuka daftar mitra, pencarian instan, modal tambah/edit mitra, dan salin link publik |
| **Rute Detail Katalog** | `/admin/umkm/[umkm_id]` | Antarmuka katalog master produk, tab statistik performa all-time, modal tambah/edit produk |
| **Komponen UI SFC** | `app/pages/admin/umkm/index.vue`<br>`app/pages/admin/umkm/[umkm_id].vue` | Vue 3 Composition API `<script setup lang="ts">` dengan Tailwind CSS |
| **Pinia Store** | `app/stores/umkm.ts` | State reaktif `umkmList`, actions `fetchAll`, `addUmkm`, `updateUmkm`, dan listener realtime |
| **Tabel Database** | `public.umkm`<br>`public.master_products` | Tabel master penyimpan entitas vendor dan spesifikasi produk |
| **Stored Procedures (RPC)** | `get_umkm_product_performance`<br>`get_umkm_session_history` | Menghitung agregat performa produk all-time dan riwayat keikutsertaan sesi mingguan |
| **Realtime PubSub** | Supabase Channel `umkm-changes` | Sinkronisasi multi-admin otomatis saat ada penambahan/perubahan data mitra |
| **Header Multi-Tenant** | `X-Company-Id` | Isolasi data berdasarkan paroki aktif (`useCompanyStore`) |

---

## 6. Batasan Ruang Lingkup (Scope Boundaries)

### 6.1 Dalam Cakupan (In-Scope)
- Pengujian CRUD Master Data UMKM (tambah mitra baru, ubah nama/nomor WA, toggle aktif/nonaktif).
- Pengujian validasi format nomor WhatsApp (wajib angka diawali `62`).
- Pengujian pencegahan duplikasi nama UMKM dan nama produk master per mitra.
- Pengujian manajemen produk master (tambah produk, edit nama, edit `harga_asli`, toggle aktif/nonaktif).
- Pengujian penolakan penghapusan produk yang terikat ke sesi penjualan (foreign key protection).
- Pengujian penyalinan link dashboard performa publik ke clipboard.
- Pengujian tab statistik performa all-time produk dan riwayat keikutsertaan sesi.
- Pengujian proteksi RBAC (penolakan akses kasir/guest ke `/admin/umkm`).
- Pengujian responsivitas UI dan ergonomi sentuh (Desktop 1280px dan Mobile PWA 375px).

### 6.2 Di Luar Cakupan (Out-of-Scope)
- Alokasi stok awal dan penentuan harga jual sesi mingguan (masuk dalam ruang lingkup F-05: Setup Sesi).
- Pembayaran pelunasan bagi hasil konsinyasi kepada UMKM (masuk dalam ruang lingkup F-12: UMKM Settlements).
- Pengujian rendering antarmuka halaman publik tanpa login `/umkm/performance/[id]` (masuk dalam ruang lingkup F-13: Public UMKM Portal).

---

## 7. Kriteria Keberhasilan QA (Acceptance Checklist)

- [ ] Admin dapat mendaftarkan mitra UMKM baru dan data langsung muncul di grid.
- [ ] Admin dapat menambahkan produk master lengkap dengan nilai `harga_asli` (> 0).
- [ ] Nomor WhatsApp tanpa awalan `62` ditolak dengan feedback toast peringatan yang informatif.
- [ ] Produk duplikat ditolak dengan feedback error yang jelas.
- [ ] Produk master yang telah terikat ke sesi terlindungi dari hard delete.
- [ ] Soft-deactivation berhasil mengubah status tampilan menjadi Nonaktif tanpa menghapus data database.
- [ ] Kasir dilarang mengakses `/admin/umkm` dan otomatis di-redirect ke `/pos`.
- [ ] Fitur salin link publik menyalin URL yang valid ke clipboard pengguna.
- [ ] Seluruh tombol aksi pada mobile viewport 375px memenuhi standar minimum 48×48px.
