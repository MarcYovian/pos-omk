# Test Cases Detail: [NAMA_FITUR] ([KODE_FITUR])

> **Dokumen Tahap 7/9 — Prosedur Uji Terperinci & Spesifikasi Audit**  
> *Fungsi: Menjabarkan langkah demi langkah pengujian (*step-by-step*), data masukan, verifikasi visual, mutasi state, serta respons jaringan/database untuk tiap skenario. Dokumen ini menjadi rujukan utama bagi tester manual maupun engineer automation.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `[F-XX / KODE_FITUR]` |
| **Nama Fitur** | `[Nama Fitur Lengkap]` |
| **Total Test Case** | `[Jumlah TC]` |
| **Cakupan Pengujian** | `Fungsional UI, Validasi Data, State Pinia, Integritas Database` |
| **Status Dokumen** | `DRAFT / IN REVIEW / APPROVED` |
| **QA Engineer** | `[Nama QA / Agent]` |

---

## 2. Rincian Test Case (Detailed Test Cases)

---

### TC-01: [Judul Test Case Positif Utama]
- **ID Skenario Terkait:** `S-01`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Positif / Happy Path`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Pengguna login sebagai `[Peran: contoh, cashier / admin]`.
2. Tenant aktif berada pada `[Paroki Yohanes / company_id aktif]`.
3. Sesi hari ini dalam status `OPEN`.
4. Tersedia minimal satu data uji `[contoh: Produk Puding Cokelat dengan stok = 20]`.

#### Data Uji yang Digunakan:
- User: `kasir1.test@omkpos.local`
- Produk: `Puding Cokelat (SKU-TEST-01)`
- Nominal Bayar: `Rp 20.000`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Buka halaman fitur | `page.goto('/...')` | Navigasi ke URL target |
| 2 | Cari atau pilih item uji | `[data-testid="[fitur]-search-input"]` | Ketik `"Puding"` |
| 3 | Tambahkan item ke keranjang/form | `[data-testid="[fitur]-item-card-1"]` | Klik elemen |
| 4 | Buka modal konfirmasi / checkout | `[data-testid="[fitur]-checkout-btn"]` | Klik tombol |
| 5 | Masukkan nominal pembayaran | `[data-testid="[fitur]-numpad-20k"]` | Klik preset nominal |
| 6 | Konfirmasi transaksi akhir | `[data-testid="[fitur]-submit-btn"]` | Klik tombol bayar |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Modal pembayaran tertutup secara halus.
  - Toast notifikasi sukses muncul: `"Transaksi berhasil disimpan"`.
  - Keranjang belanja kembali kosong.
  - Sisa stok produk di layar berkurang dari 20 menjadi 19.
- **State Store (Pinia):**
  - `cartStore.items` bernilai array kosong `[]`.
  - `cartStore.totalAmount` bernilai `0`.
- **Jaringan / API:**
  - Request RPC `complete_transaction` mengirim payload yang valid dengan header `X-Company-Id`.
  - Response status `200 OK` dengan nomor struk / transaksi.
- **Integritas Database:**
  - Record baru masuk ke tabel `transactions` dan `transaction_items`.
  - Record `session_products.stok_sekarang` berkurang 1.

#### Pasca-Kondisi & Pembersihan (Postconditions & Cleanup):
- Sesi transaksi di-reset atau dicatat untuk laporan rekonsiliasi.

---

### TC-02: [Judul Test Case Negatif / Validasi Input]
- **ID Skenario Terkait:** `S-02`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Negatif / Input Validation`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Pengguna berada di halaman formulir / modal input.
2. Form dalam kondisi awal (kosong atau default).

#### Data Uji yang Digunakan:
- Input Tidak Valid: `[contoh: nominal Rp 0, teks kosong, atau string huruf pada input angka]`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Kosongkan field input wajib | `[data-testid="[fitur]-input-amount"]` | Hapus isi field |
| 2 | Coba tekan tombol simpan / lanjut | `[data-testid="[fitur]-submit-btn"]` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Tombol submit tetap disabled atau memicu pesan error inline: `"Nominal wajib diisi dan lebih dari 0"`.
  - Input field memiliki highlight border merah (`border-red-500`).
  - Modal dialog TIDAK tertutup.
- **Jaringan / API:**
  - Tidak ada panggilan network request (RPC/API) yang dikirim ke server (*client-side validation guard*).

#### Pasca-Kondisi & Pembersihan:
- Tutup modal tanpa menyimpan perubahan.

---

### TC-03: [Judul Test Case Edge Case / Multi-Tenant / Konkurensi]
- **ID Skenario Terkait:** `S-03`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Edge Case / Concurrency / Multi-Tenant`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. `[Prasyarat kondisi batas atau dua sesi browser terpisah]`

#### Data Uji yang Digunakan:
- `[Dataset kondisi batas]`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | `[Langkah 1]` | `[Locator]` | `[Interaksi]` |
| 2 | `[Langkah 2]` | `[Locator]` | `[Interaksi]` |

#### Hasil yang Diharapkan (Expected Result):
- `[Hasil validasi visual, state, dan error toast]`

---

## 3. Matriks Keterlacakan Skenario ke Test Case

| ID Skenario | ID Test Case | Judul Ringkas Test Case | Prioritas | Tipe Otomasi |
|---|---|---|---|---|
| `S-01` | `TC-01` | Transaksi Pembayaran Tunai Normal (Happy Path) | P0 | Playwright E2E |
| `S-02` | `TC-02` | Validasi Nominal Pembayaran Kurang dari Total | P0 | Playwright E2E |
| `S-03` | `TC-03` | Konkurensi Pembelian Stok Terakhir Bersamaan | P0 | Playwright Concurrency |
| `S-04` | `TC-04` | Validasi Input Formulir Kosong | P1 | Playwright E2E |
| `S-05` | `TC-05` | Penanganan Transaksi Saat Jaringan Terputus (Offline PWA)| P1 | Playwright Mock Offline |

---

## 4. Status Review & Persetujuan

- [ ] **Semua Test Case Detail Lengkap & Tervalidasi:** `YA / BELUM`
- [ ] **Langkah Pengujian Deterministik & Jelas:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 07-automation-architecture.md:** `(Tanda Tangan / Persetujuan User: ________)`
