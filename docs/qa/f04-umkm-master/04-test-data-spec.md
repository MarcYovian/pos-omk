# Spesifikasi Data Test (Test Data Spec): UMKM Partner Master Data Management (F-04)

> **Dokumen Tahap 5/9 — Perencanaan & Manajemen Data Uji**  
> *Fungsi: Mendefinisikan dataset awal, kondisi prasyarat database, akun pengujian per peran, metode pembuatan data (setup), dan pembersihan data (cleanup) guna menjamin pengujian bersifat deterministik dan terisolasi.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-04` |
| **Nama Fitur** | `UMKM Partner Master Data Management` |
| **Lingkup Tenant (`company_id`)**| `Test Parish St. Yohanes (UUID: d0000000-0000-0000-0000-000000000001)` |
| **Zona Waktu Uji** | `Asia/Jakarta (WIB / UTC+7)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-ui-cataloger-skill)` |

---

## 2. Matriks Akun Pengguna Uji (Test User Accounts)

| Peran (Role) | Email Pengujian | Password Default | Akses Tenant (`company_id`) | Izin Granular (`permissions`) | Status Akun |
|---|---|---|---|---|---|
| **Super Admin** | `superadmin.test@omkpos.local` | `TestPass123!` | Seluruh Paroki (`*`) | Full Platform Admin Bypass | Aktif |
| **Admin Paroki** | `admin.paroki.test@omkpos.local` | `TestPass123!` | `d0000000-0000-0000-0000-000000000001` | `products:manage`, `session_stock:manage`, `reports:view` | Aktif |
| **Kasir (Cashier)** | `kasir1.test@omkpos.local` | `TestPass123!` | `d0000000-0000-0000-0000-000000000001` | `pos:access`, `pos:checkout` | Aktif |
| **Publik / Tamu** | *(Tanpa Autentikasi)* | *(N/A)* | *(Berdasarkan token / UUID)* | Hanya rute publik `/umkm/performance/[id]` | Tamu |

> [!CAUTION]
> Jangan pernah menggunakan kredensial produksi atau membocorkan `SUPABASE_SECRET_KEY` pada repositori dan script pengujian otomatis!

---

## 3. Spesifikasi Data Uji Per Entitas (Entity Dataset Specification)

| Entitas / Data | Nilai / Dataset | Role Pemilik | Kondisi Awal | Cara Setup | Cara Cleanup | Keterangan & Batasan |
|---|---|---|---|---|---|---|
| **Tenant Paroki** | `Paroki Santo Yohanes Bosco` (`id: d0000000-0000-0000-0000-000000000001`) | Super Admin | Terdaftar di `companies` | Seed database | Reusable (tidak dihapus) | Master tenant isolasi pengujian |
| **Mitra A (Ada Riwayat)** | `Ibu Maria Snack`<br>Kontak WA: `6281234567890`<br>`id: u0000000-0000-0000-0000-000000000001` | Admin Paroki | Aktif (`is_active = true`), memiliki riwayat sesi | Fixture Seed | Soft-deactivate (`is_active = false`) | Mitra utama untuk pengujian FK & analitik |
| **Mitra B (Mitra Baru)** | `Dapur Santo Yosef`<br>Kontak WA: `6281987654321`<br>`id: u0000000-0000-0000-0000-000000000002` | Admin Paroki | Aktif (`is_active = true`), belum ada transaksi | Fixture Seed | Hapus via script API test | Mitra untuk pengujian CRUD normal |
| **Mitra C (Nonaktif)** | `Berkah Kue Basah`<br>Kontak WA: `6281122334455`<br>`id: u0000000-0000-0000-0000-000000000003` | Admin Paroki | Nonaktif (`is_active = false`) | Fixture Seed | Pertahankan status nonaktif | Untuk uji badge nonaktif & filter sesi F-05 |
| **Produk A1 (Terikat Sesi)**| `Pastel Ayam Telur`<br>`harga_asli: 4000`<br>`id: p0000000-0000-0000-0000-000000000001` | Admin Paroki | Terikat di `session_products` pada sesi masa lalu | Fixture Seed | Dilindungi FK RESTRICT | Untuk uji penolakan hard-delete S-08 |
| **Produk A2 (Bebas Sesi)** | `Kroket Daging Sapi`<br>`harga_asli: 5000`<br>`id: p0000000-0000-0000-0000-000000000002` | Admin Paroki | Aktif, belum pernah masuk ke `session_products` | Fixture Seed | Delete via UI test S-08 | Untuk uji sukses delete produk bersih |
| **Produk A3 (Nonaktif)** | `Lemper Ayam Bakar`<br>`harga_asli: 3500`<br>`is_active: false` | Admin Paroki | Nonaktif di katalog master | Fixture Seed | Pertahankan status nonaktif | Untuk uji badge produk nonaktif |
| **Produk B1 (Mitra B)** | `Brownies Kukus Cokelat`<br>`harga_asli: 25000`<br>`is_active: true` | Admin Paroki | Aktif pada Mitra B | Fixture Seed | Reset fixture | Untuk uji isolasi produk antar mitra |

---

## 4. Dataset Nilai Ekstrem & Batas (Edge Case & Boundary Data)

| Skenario / Field | Nilai Masukan (Input Value) | Hasil yang Diharapkan |
|---|---|---|
| **Nomor WA Tanpa 62 (Awalan 08)** | `081234567890` | Ditolak; Toast: *"Nomor WhatsApp harus diawali dengan kode negara 62"* |
| **Nomor WA dengan Tanda Plus (+)** | `+6281234567890` | Ditolak; sanitasi regex membuang tanda `+`, string menjadi `628...` jika lolos atau diprotes jika karakter salah |
| **Nomor WA String Huruf** | `62812-ABC-DEF` | Karakter huruf dibersihkan otomatis oleh `.replace(/[^0-9]/g, '')`, menyisakan `628` |
| **Nama Produk Duplikat per Mitra** | Nama: `Pastel Ayam Telur` pada Mitra A | Ditolak oleh PostgreSQL UNIQUE constraint; Toast error duplikasi muncul |
| **Nama Produk Sama Beda Mitra** | Nama: `Pastel Ayam Telur` pada Mitra B | Berhasil disimpan (diizinkan karena beda `umkm_id`) |
| **Harga Asli Bernilai Nol (0)** | `0` | Ditolak oleh check constraint database `CHECK (harga_asli > 0)` |
| **Harga Asli Bernilai Negatif** | `-5000` | Input form number memblokir tanda minus / database constraint menolak |
| **Harga Asli String Kosong** | `""` | Validasi form memblokir submit; Toast: *"Semua kolom harus diisi"* |
| **Kueri Pencarian Khusus (XSS/SQLi)**| `Maria <script>alert(1)</script> ' OR '1'='1` | String disanitasi oleh binding Vue 3; pencarian tidak error dan menghasilkan daftar kosong jika tidak cocok |

---

## 5. Prosedur Setup & Cleanup (Automation Hooks)

### 5.1 Prosedur Seed Data Sebelum Eksekusi Test (BeforeAll Hook)
```typescript
// fixtures/umkm.fixture.ts
import { createClient } from '@supabase/supabase-js'

export async function setupUmkmTestData(supabaseUrl: string, serviceRoleKey: string) {
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const testCompanyId = 'd0000000-0000-0000-0000-000000000001'

  // 1. Pastikan Perusahaan Terdaftar
  await adminClient.from('companies').upsert({
    id: testCompanyId,
    name: 'Paroki Santo Yohanes Bosco',
    slug: 'st-yohanes-bosco'
  })

  // 2. Insert Mitra UMKM Uji
  await adminClient.from('umkm').upsert([
    {
      id: 'u0000000-0000-0000-0000-000000000001',
      company_id: testCompanyId,
      nama_umkm: 'Ibu Maria Snack',
      kontak_wa: '6281234567890',
      is_active: true
    },
    {
      id: 'u0000000-0000-0000-0000-000000000002',
      company_id: testCompanyId,
      nama_umkm: 'Dapur Santo Yosef',
      kontak_wa: '6281987654321',
      is_active: true
    }
  ])

  // 3. Insert Produk Master Uji
  await adminClient.from('master_products').upsert([
    {
      id: 'p0000000-0000-0000-0000-000000000001',
      company_id: testCompanyId,
      umkm_id: 'u0000000-0000-0000-0000-000000000001',
      nama_produk: 'Pastel Ayam Telur',
      harga_asli: 4000,
      is_active: true
    },
    {
      id: 'p0000000-0000-0000-0000-000000000002',
      company_id: testCompanyId,
      umkm_id: 'u0000000-0000-0000-0000-000000000001',
      nama_produk: 'Kroket Daging Sapi',
      harga_asli: 5000,
      is_active: true
    }
  ])
}
```

### 5.2 Prosedur Pembersihan Data Setelah Eksekusi Test (AfterAll Hook)
```typescript
export async function cleanupUmkmTestData(supabaseUrl: string, serviceRoleKey: string) {
  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  
  // Hapus produk sementara dan mitra sementara yang dibuat selama test run otomatis
  await adminClient.from('master_products')
    .delete()
    .like('nama_produk', 'AutoTest_%')
  
  await adminClient.from('umkm')
    .delete()
    .like('nama_umkm', 'AutoTest_%')
}
```

---

## 6. Status Kesiapan Lingkungan Uji

- [x] **Akun Uji Tersedia:** Admin Paroki (`admin.paroki.test@omkpos.local`) & Kasir (`kasir1.test@omkpos.local`)
- [x] **Tenant Isolasi:** Data dikunci pada `company_id = d0000000-0000-0000-0000-000000000001`
- [x] **Constraint Integritas Terdefinisi:** Unique name constraint & Foreign Key Restriction
