# Spesifikasi Data Test (Test Data Spec): Real-time POS Cashier Screen (F-02)

> **Dokumen Tahap 5/9 — Perencanaan & Manajemen Data Uji**  
> *Fungsi: Mendefinisikan dataset awal, kondisi prasyarat database, akun pengujian per peran, metode pembuatan data (setup), dan pembersihan data (cleanup) guna menjamin pengujian bersifat deterministik dan terisolasi.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-02` |
| **Nama Fitur** | `Real-time POS Cashier Screen` |
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
export async function setupSessionData(apiContext: any, companyId: string) {
  // 1. Pastikan company aktif terdaftar
  // 2. Buka sesi hari ini dengan status OPEN
  // 3. Masukkan minimal 2 produk dengan stok terdefinisi
}
```

### 5.2 Prosedur Cleanup
```typescript
export async function cleanupSessionData(apiContext: any, sessionId: string) {
  // Panggil RPC reset_session untuk mengosongkan transaksi uji
}
```

---

## 6. Aturan Isolasi Multi-Tenant

1. Seluruh panggilan API dan RPC wajib menyertakan header `X-Company-Id: test-parish-st-yohanes`.
2. Pengujian E2E tidak boleh mengakses atau mengubah data milik `company_id` paroki lain.

---

## 7. Status Review & Persetujuan

- [ ] **Spesifikasi Data Test Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)
