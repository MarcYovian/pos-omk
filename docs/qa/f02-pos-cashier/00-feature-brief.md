# Feature Brief: Real-time POS Cashier Screen (F-02)

> **Dokumen Tahap 1/9 — Ringkasan Pemahaman Fitur**  
> *Fungsi: Memastikan pemahaman bisnis, alur pengguna, batasan teknis, dan ruang lingkup telah disepakati sebelum menyusun skenario pengujian.*

---

## 1. Metadata Fitur

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-02` |
| **Nama Fitur** | `Real-time POS Cashier Screen` |
| **Kategori / Modul** | `Core OMK POS Platform` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer / Pembuat** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |
| **Tech Lead / Reviewer** | `Product Owner & Tech Lead OMK POS` |
| **Tanggal Pembuatan** | `2026-10-10` |
| **Rujukan Dokumen** | [PRD.md](../../PRD.md), [FEATURES.md](../../FEATURES.md), [USER_FLOWS.md](../../USER_FLOWS.md) |

---

## 2. Ringkasan & Tujuan Bisnis

### 2.1 Tujuan Utama (Problem & Value Statement)
- **Tujuan:** Sebagai kasir, saya ingin memilih produk yang tersedia, memvalidasi sisa stok secara real-time, menggunakan numpad virtual untuk pembayaran tunai/QRIS, dan menyelesaikan transaksi dalam hitungan detik, agar saya dapat melayani jemaat dengan cepat tanpa antrean panjang.
- **Target Hasil:** Menyediakan antarmuka yang cepat, minim kesalahan, serta memiliki integritas data yang terjamin untuk operasional mingguan paroki.

### 2.2 Peran Pengguna (Roles Involved)
- [x] **Kasir:** Mengakses fitur Real-time POS Cashier Screen sesuai otorisasi.
- [ ] **Admin Paroki:** Mengakses fitur Real-time POS Cashier Screen sesuai otorisasi.
- [ ] **Super Admin:** Mengakses fitur Real-time POS Cashier Screen sesuai otorisasi.
- [ ] **UMKM:** Mengakses fitur Real-time POS Cashier Screen sesuai otorisasi.
- [ ] **Guest:** Mengakses fitur Real-time POS Cashier Screen sesuai otorisasi.

---

## 3. Alur Pengguna Ringkas (Happy Path Journey)

```
[Langkah 1: Masuk Halaman (/pos)] 
        ↓
[Langkah 2: Interaksi Input / Pemilihan Item] 
        ↓
[Langkah 3: Validasi Form & Keranjang] 
        ↓
[Langkah 4: Proses Transaksi Atomik (RPC)] 
        ↓
[Langkah 5: Notifikasi Sukses & State Update]
```

**Penjelasan Tahapan:**
1. **Langkah 1:** Pengguna membuka rute `/pos` dengan tenant context aktif (`X-Company-Id`).
2. **Langkah 2:** Memilih atau memasukkan data yang diperlukan melalui form / grid produk.
3. **Langkah 3:** Sistem melakukan validasi client-side (reaktifitas Pinia store).
4. **Langkah 4:** Pengguna mengonfirmasi aksi, memicu panggilan backend/RPC ke Supabase.
5. **Langkah 5:** Notifikasi sukses muncul dan tampilan data otomatis dimutakhirkan.

---

## 4. Keputusan Bisnis & Aturan Konsinyasi yang Relevan

> [!IMPORTANT]
> Seluruh alur pengujian wajib mematuhi aturan baku konsinyasi dan operasional:

1. **Aturan Harga & Finansial:**
   - Kasir **DILARANG KERAS** melihat harga modal (`harga_asli`). Hanya `harga_jual` yang ditampilkan.
   - Format mata uang Rupiah integer murni tanpa desimal via `useCurrencyFormat()`.
2. **Isolasi Multi-Tenant:**
   - Seluruh mutasi dan query wajib terikat pada `company_id` paroki aktif.
3. **Zona Waktu WIB:**
   - Sesi dan tanggal transaksi wajib menggunakan waktu Jakarta (WIB / UTC+7) via `getTodayJakarta()`.
4. **Mutasi Stok Atomik:**
   - Perubahan stok dilakukan melalui RPC atomik (`complete_transaction`) untuk mencegah inkonsistensi konkurensi.

---

## 5. Jejak Arsitektur & Dependensi Teknis

| Komponen | Identitas / Path | Deskripsi & Peran |
|---|---|---|
| **Rute Frontend** | `/pos` | Halaman antarmuka utama |
| **File Sumber UI** | `app/pages/pos.vue` | Komponen Vue 3 SFC (`<script setup>`) |
| **Pinia Store** | `app/stores/cart.ts, app/stores/products.ts` | State management reaktif |
| **Supabase RPC / API** | `complete_transaction` | Prosedur database atomik |
| **Header Multi-Tenant** | `X-Company-Id` | Isolasi data antar paroki |

---

## 6. Batasan Ruang Lingkup (Scope Boundaries)

### 6.1 Dalam Cakupan (In-Scope)
- Pengujian fungsionalitas UI pada rute `/pos` (Desktop & Mobile PWA 375px).
- Validasi form, feedback toast, dan pencegahan double-submit.
- Verifikasi mutasi state Pinia store dan respon RPC database.

### 6.2 Di Luar Cakupan (Out-of-Scope)
- Pengujian beban (*load testing*) skala ribuan transaksi bersamaan.
- Pembayaran payment gateway pihak ketiga (QRIS dinamis eksternal).

---

## 7. Kriteria Penerimaan Inti (Acceptance Criteria Rujukan)

- [ ] **AC-01:** Skenario 2.1: Pencarian Produk & Keranjang Belanja
- [ ] **AC-02:** Skenario 2.2: Isolasi Kerahasiaan Harga Modal (`harga_asli`)
- [ ] **AC-03:** Skenario 2.3: Numpad Virtual & Hitungan Kembalian
- [ ] **AC-04:** Skenario 2.4: Transaksi Atomik Database (RPC)
- [ ] **AC-05:** Skenario 2.5: Sinkronisasi Stok Real-Time Antar Kasir

---

## 8. Status Review & Persetujuan

- [ ] **Feature Brief Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)
