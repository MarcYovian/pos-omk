# Test Cases Detail: Real-time POS Cashier Screen (F-02)

> **Dokumen Tahap 7/9 — Prosedur Uji Terperinci & Spesifikasi Audit**  
> *Fungsi: Menjabarkan langkah demi langkah pengujian (*step-by-step*), data masukan, verifikasi visual, mutasi state, serta respons jaringan/database untuk tiap skenario. Dokumen ini menjadi rujukan utama bagi tester manual maupun engineer automation.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-02` |
| **Nama Fitur** | `Real-time POS Cashier Screen` |
| **Total Test Case** | `5 Test Case Terperinci` |
| **Cakupan Pengujian** | `Fungsional UI, Validasi Data, State Pinia, Integritas Database RPC` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-test-case-and-runner-skill)` |

---

## 2. Rincian Test Case (Detailed Test Cases)

---

### TC-01: Transaksi Pembayaran Tunai Normal (Happy Path)
- **ID Skenario Terkait:** `S-01`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Positif / Happy Path`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Pengguna login sebagai `kasir1.test@omkpos.local`.
2. Tenant aktif pada `test-parish-st-yohanes`.
3. Sesi hari ini dalam status `OPEN`.
4. Tersedia produk `Puding Cokelat` dengan `stok_sekarang = 20` dan harga jual `Rp 10.000`.

#### Data Uji yang Digunakan:
- Produk: `Puding Cokelat (SKU-TEST-01)`
- Kuantitas: `1 unit`
- Nominal Bayar Tunai: `Rp 20.000` (Menggunakan preset Numpad 20.000)

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Buka halaman kasir POS | `page.goto('/pos')` | Navigasi ke URL kasir |
| 2 | Cari produk uji | `[data-testid="f02-searchQuery-input"]` | Ketik `"Puding"` |
| 3 | Tambahkan produk ke keranjang | `[data-testid="f02-product-card-1"]` | Klik kartu produk |
| 4 | Buka drawer/modal checkout | `[data-testid="f02-cart-checkout-btn"]` | Klik tombol "Bayar" |
| 5 | Pilih metode bayar tunai | `[data-testid="f02-payment-cash-tab"]` | Klik tab Tunai |
| 6 | Pilih nominal uang tunai | `[data-testid="f02-numpad-btn-20k"]` | Klik preset 20.000 |
| 7 | Submit transaksi pembayaran | `[data-testid="f02-checkout-submit-btn"]` | Klik tombol selesaikan |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Modal pembayaran tertutup secara otomatis.
  - Overlay / Toast notifikasi sukses muncul menampilkan kembalian: `"Kembalian: Rp 10.000"`.
  - Keranjang belanja kembali kosong (`0 item`).
  - Sisa stok produk di kartu berkurang dari 20 menjadi 19.
- **State Store (Pinia):**
  - `cartStore.items` bernilai `[]`.
  - `cartStore.totalAmount` bernilai `0`.
- **Jaringan / API:**
  - Request RPC `complete_transaction` mengirim payload valid dengan header `X-Company-Id`.
  - Respons `200 OK` dengan nomor struk / transaksi UUID.
- **Integritas Database:**
  - Record baru masuk ke tabel `transactions` dan `transaction_items`.
  - Record `session_products.stok_sekarang` berkurang 1.

#### Pasca-Kondisi & Pembersihan:
- Transaksi uji dicatat untuk verifikasi rekonsiliasi atau di-reset via RPC `reset_session`.

---

### TC-02: Validasi Nominal Pembayaran Tunai Kurang dari Tagihan
- **ID Skenario Terkait:** `S-02`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Negatif / Validation Guard`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Pengguna berada di modal pembayaran checkout dengan total belanja Rp 25.000.

#### Data Uji yang Digunakan:
- Nominal Bayar: `Rp 10.000` (Kurang dari tagihan)

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Masukkan nominal bayar kurang | `[data-testid="f02-numpad-btn-10k"]` | Klik preset 10.000 |
| 2 | Periksa status tombol bayar | `[data-testid="f02-checkout-submit-btn"]` | Cek status `disabled` |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Tombol bayar berstatus `disabled` dan tidak dapat diklik.
  - Teks kembalian menampilkan peringatan nominal kurang (`text-red-500`).
- **Jaringan / API:**
  - Tidak ada request jaringan (RPC) yang dikirim ke server.

---

### TC-03: Isolasi Kerahasiaan Harga Modal UMKM (`harga_asli`)
- **ID Skenario Terkait:** `S-03`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Keamanan / Data Privacy`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Kasir terautentikasi membuka antarmuka `/pos`.

#### Langkah-langkah Pengujian:
| No | Aksi Pengguna | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Periksa seluruh kartu produk di layar | `.pos-product-card` | Inspeksi teks harga |
| 2 | Periksa network response JSON | Payload response `products_cashier_view` | Inspeksi field JSON |

#### Hasil yang Diharapkan:
- Seluruh harga yang ditampilkan adalah `harga_jual`.
- Field `harga_asli` TIDAK PERNAH dikirimkan dalam payload jaringan kasir.

---

### TC-04: Resiliensi Koneksi Terputus (Offline PWA Queue)
- **ID Skenario Terkait:** `S-04`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Edge Case / PWA Offline`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Kasir berada di `/pos` saat koneksi internet terputus (`offline`).

#### Langkah-langkah Pengujian:
| No | Aksi Pengguna | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Simulasikan offline | `page.context().setOffline(true)` | Putus jaringan |
| 2 | Verifikasi banner offline | `[data-testid="offline-banner"]` | Asersi visible |
| 3 | Lakukan transaksi tunai | `[data-testid="f02-checkout-submit-btn"]` | Selesaikan bayar |

#### Hasil yang Diharapkan:
- Transaksi tersimpan ke IndexedDB antrean lokal (`useOfflineQueue`).
- Banner offline menunjukkan counter antrean tertunda bertambah (+1).

---

### TC-05: Verifikasi Ergonomi Sentuh & Responsivitas Mobile 375px
- **ID Skenario Terkait:** `S-05`
- **Prioritas:** `P2 (Medium)`
- **Tipe Uji:** `Ergonomi & UI Layout`
- **Tingkat Otomasi:** `Playwright Mobile Emulation`

#### Prasyarat (Preconditions):
1. Viewport disetel ke resolusi ponsel: 375×667 (iPhone SE).

#### Langkah-langkah Pengujian:
| No | Aksi Pengguna | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Ukur dimensi bounding box tombol checkout | `[data-testid="f02-cart-checkout-btn"]` | `getBoundingClientRect()` |
| 2 | Ukur dimensi tombol numpad | `[data-testid="f02-numpad-btn-50k"]` | `getBoundingClientRect()` |

#### Hasil yang Diharapkan:
- Tinggi dan lebar elemen interaktif minimal **48×48px** (`height >= 48 && width >= 48`).
- Tombol numpad mudah dijangkau ibu jari (*thumb-zone*).

---

## 3. Matriks Keterlacakan Skenario ke Test Case

| ID Skenario | ID Test Case | Judul Ringkas Test Case | Prioritas | Tipe Otomasi |
|---|---|---|---|---|
| `S-01` | `TC-01` | Transaksi Pembayaran Tunai Normal (Happy Path) | P0 | Playwright E2E |
| `S-02` | `TC-02` | Validasi Nominal Pembayaran Kurang dari Tagihan | P0 | Playwright E2E |
| `S-03` | `TC-03` | Isolasi Kerahasiaan Harga Modal UMKM (`harga_asli`) | P0 | Security / Network |
| `S-04` | `TC-04` | Resiliensi Koneksi Terputus (Offline PWA Queue) | P1 | Playwright Mock Offline |
| `S-05` | `TC-05` | Verifikasi Ergonomi Sentuh & Responsivitas Mobile 375px | P2 | Playwright Mobile View |

---

## 4. Status Review & Persetujuan

- [ ] **Semua Test Case Detail Lengkap & Tervalidasi:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 07-automation-architecture.md:** `(Tanda Tangan / Persetujuan User: ________)`
