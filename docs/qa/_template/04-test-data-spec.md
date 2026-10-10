# Spesifikasi Data Test (Test Data Spec): [NAMA_FITUR] ([KODE_FITUR])

> **Dokumen Tahap 5/9 — Perencanaan & Manajemen Data Uji**  
> *Fungsi: Mendefinisikan dataset awal, kondisi prasyarat database, akun pengujian per peran, metode pembuatan data (setup), dan pembersihan data (cleanup) guna menjamin pengujian bersifat deterministik dan terisolasi.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `[F-XX / KODE_FITUR]` |
| **Nama Fitur** | `[Nama Fitur Lengkap]` |
| **Lingkup Tenant (`company_id`)**| `Test Parish St. Yohanes (UUID: e9b7... atau variabel ENV)` |
| **Zona Waktu Uji** | `Asia/Jakarta (WIB / UTC+7)` |
| **Status Dokumen** | `DRAFT / IN REVIEW / APPROVED` |
| **QA Engineer** | `[Nama QA / Agent]` |

---

## 2. Matriks Akun Pengguna Uji (Test User Accounts)

| Peran (Role) | Email Pengujian | Password Default | Akses Tenant (`company_id`) | Izin Granular (`permissions`) | Status Akun |
|---|---|---|---|---|---|
| **Super Admin** | `superadmin.test@omkpos.local` | `TestPass123!` | Semua Tenant (`*`) | `*` (Full Platform Access) | Aktif |
| **Admin Paroki** | `admin.paroki.test@omkpos.local` | `TestPass123!` | Tenant A (Paroki Yohanes) | `catalog.*`, `session.*`, `finance.*`, `users.*` | Aktif |
| **Kasir (Cashier)** | `kasir1.test@omkpos.local` | `TestPass123!` | Tenant A (Paroki Yohanes) | `pos.access`, `pos.checkout` (No admin access) | Aktif |
| **Kasir Nonaktif** | `kasir.deactive@omkpos.local` | `TestPass123!` | Tenant A (Paroki Yohanes) | `pos.access` (Tapi `is_active = false`) | Nonaktif |
| **Tamu / Publik** | *(Tanpa Login)* | *(N/A)* | Sesuai token URL publik | Hanya akses route publik (`/umkm/performance/...`) | Publik |

> [!CAUTION]
> Jangan pernah menggunakan kredensial akun riil (produksi) atau membocorkan `SUPABASE_SECRET_KEY` pada repositori publik!

---

## 3. Spesifikasi Data Uji Per Entitas (Entity Dataset Specification)

| Entitas / Data | Nilai / Dataset | Role Pemilik | Kondisi Awal | Cara Setup | Cara Cleanup | Keterangan & Batasan |
|---|---|---|---|---|---|---|
| **Tenant / Paroki** | `Paroki Test Yohanes (ID: test-parish-01)` | Super Admin | Terdaftar di tabel `companies` | Seed script database | Tidak dihapus (Reusable) | Master company uji |
| **Vendor UMKM** | `UMKM Snack Berkah (ID: test-umkm-01)` | Admin Paroki | Aktif (`is_active = true`), HP: `08123456789` | Script API / Seed | Soft-delete (`is_active = false`) | Partner uji konsinyasi |
| **Master Produk** | `Puding Cokelat (harga_asli: 8.000)` | Admin Paroki | Terikat ke UMKM di atas | API POST `/master_products` | Hapus via test fixture API | Base cost wajib integer |
| **Sesi Mingguan** | `Sesi Hari Ini (status: 'open')` | Admin Paroki | Tanggal sesi hari ini WIB (`getTodayJakarta()`) | RPC `open_session` | RPC `reset_session` / Delete | Sesi wajib OPEN untuk kasir |
| **Produk Sesi** | `stok_awal: 20, stok_sekarang: 20, harga_jual: 10.000` | Admin Paroki | Terdaftar di `session_products` | API POST / RPC | Reset sesi / Tear down | Markup OMK: 2.000/unit |
| **Produk Habis** | `stok_awal: 10, stok_sekarang: 0, harga_jual: 15.000` | Admin Paroki | `stok_sekarang = 0` | Force update via RPC | Reset sesi | Untuk uji skenario out-of-stock |
| **Transaksi Test**| `ID: trx-test-01, bayar: 20.000, metode: 'cash'` | Kasir | Menghasilkan kembalian Rp 0 | RPC `complete_transaction` | RPC `reset_session` | Mengurangi stok secara atomik |

---

## 4. Dataset Nilai Ekstrem & Batas (Edge Case & Boundary Data)

| Kategori Edge Case | Nilai Masukan (Input Value) | Perilaku yang Diharapkan |
|---|---|---|
| **Karakter Khusus** | Nama produk: `Kue Sus <script>alert(1)</script> & "Enak" 'Pol'` | Disanitasi dengan benar, tidak terjadi XSS, tersimpan aman |
| **Nominal Sangat Besar** | Pembayaran: `Rp 100.000.000` | Format Rupiah rapi (`Rp 100.000.000`), tidak overflow |
| **Nominal Nol / Minus** | `harga_jual: 0` atau `-5.000` | Ditolak oleh validasi form dan database constraint |
| **Harga Jual < Harga Asli**| `harga_jual: 5.000` (saat `harga_asli: 8.000`) | Ditolak; OMK tidak boleh menjual di bawah modal UMKM |
| **Pencarian String Kosong**| Search query: `"   "` (spasi doang) | Menampilkan seluruh katalog tanpa error |
| **Nama UMKM Duplikat** | Nama partner persis sama dalam satu paroki | Menampilkan validasi nama sudah terdaftar |

---

## 5. Prosedur Setup & Cleanup (Automation Hooks)

### 5.1 Prosedur Setup (Before All / Before Each)
```typescript
// Contoh implementasi setup data pada Playwright / Test Fixture
export async function setupTestData(apiContext: APIRequestContext, companyId: string) {
  // 1. Pastikan company aktif terdaftar
  // 2. Buat / aktifkan sesi untuk tanggal hari ini (WIB)
  // 3. Masukkan minimal 2 produk uji dengan stok terdefinisi
}
```

### 5.2 Prosedur Cleanup (After All / After Each)
```typescript
// Contoh pembersihan data uji agar tidak mengotori environment pengujian
export async function cleanupTestData(apiContext: APIRequestContext, sessionId: string) {
  // 1. Panggil RPC reset_session untuk menghapus transaksi uji
  // 2. Kembalikan stok ke nilai awal atau hapus produk dummy
}
```

---

## 6. Aturan Isolasi Multi-Tenant

1. Seluruh request API dan RPC pengujian wajib menyertakan header `X-Company-Id: [COMPANY_ID_UJI]`.
2. Pengujian E2E tidak boleh memodifikasi data dari `company_id` lain.
3. Setiap test suite harus menggunakan identifier unik (misal: prefix `[TEST-AUTO-...]`) pada entitas yang dibuat agar mudah dilacak dan dibersihkan jika terjadi kegagalan tak terduga (*flaky/crash*).

---

## 7. Status Review & Persetujuan

- [ ] **Spesifikasi Data Test Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)  
*Catatan: Setelah data test disetujui, lanjut ke perumusan 05-element-catalog.md.*
