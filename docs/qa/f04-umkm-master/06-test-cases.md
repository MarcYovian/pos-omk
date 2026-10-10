# Test Cases Detail: UMKM Partner Master Data Management (F-04)

> **Dokumen Tahap 7/9 — Prosedur Uji Terperinci & Spesifikasi Audit**  
> *Fungsi: Menjabarkan langkah demi langkah pengujian (*step-by-step*), data masukan, verifikasi visual, mutasi state, serta respons jaringan/database untuk tiap skenario. Dokumen ini menjadi rujukan utama bagi tester manual maupun engineer automation.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-04` |
| **Nama Fitur** | `UMKM Partner Master Data Management` |
| **Total Test Case** | `12 Test Case Terperinci` |
| **Cakupan Pengujian** | `Direktori Mitra, Form Guard WA, Soft-Deactivation, Foreign Key Safety, RBAC Guard, State Pinia` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-test-case-and-runner-skill)` |

---

## 2. Rincian Test Case (Detailed Test Cases)

---

### TC-01: Pendaftaran Mitra UMKM Baru Valid (Happy Path)
- **ID Skenario Terkait:** `S-01`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Positif / Happy Path`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Pengguna login sebagai `admin.paroki.test@omkpos.local` (peran `admin`).
2. Tenant aktif pada `Paroki Santo Yohanes Bosco` (`d0000000-0000-0000-0000-000000000001`).
3. Browser berada di halaman `/admin/umkm`.

#### Data Uji yang Digunakan:
- Nama UMKM: `Dapur Bunda Teresa`
- Nomor WhatsApp: `6281234567899`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Klik tombol "Tambah UMKM" | `button:has-text("Tambah UMKM")` | Klik tombol |
| 2 | Masukkan nama mitra UMKM | `label:has-text("Nama UMKM") ~ div input` | Ketik `Dapur Bunda Teresa` |
| 3 | Masukkan nomor WhatsApp | `label:has-text("Nomor WhatsApp") ~ div input` | Ketik `6281234567899` |
| 4 | Klik tombol submit simpan | `button:has-text("Simpan")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Tombol simpan menampilkan state spinner (`:loading="true"`).
  - Modal pendaftaran tertutup secara otomatis.
  - Toast sukses melayang muncul: `"Mitra UMKM berhasil terdaftar"`.
  - Kartu mitra baru `"Dapur Bunda Teresa"` muncul pada grid dengan badge hijau `"Aktif"`.
- **State Store (Pinia):**
  - `umkmStore.umkmList` memuat objek mitra baru dan terurut secara alfabetis.
- **Jaringan / Backend:**
  - Request `POST /rest/v1/umkm` mengirim body `{ nama_umkm, kontak_wa: "6281234567899", is_active: true }` dengan header `X-Company-Id` mengembalikan `201 Created`.
- **Integritas Database:**
  - Record baru tercatat di tabel `public.umkm` dengan `company_id` paroki aktif.

---

### TC-02: Penambahan Produk Master Baru dengan Harga Modal Valid
- **ID Skenario Terkait:** `S-02`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Positif / Happy Path`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Admin berada di halaman detail mitra `/admin/umkm/[umkm_id]`.
2. Tab aktif adalah "Katalog Master".

#### Data Uji yang Digunakan:
- Nama Produk: `Pastel Ayam Telur Spesial`
- Harga Dasar UMKM (`harga_asli`): `4500`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Klik tombol "Tambah Produk" | `button:has-text("Tambah Produk")` | Klik tombol |
| 2 | Masukkan nama produk | `label:has-text("Nama Produk") ~ div input` | Ketik `Pastel Ayam Telur Spesial` |
| 3 | Masukkan harga dasar modal | `label:has-text("Harga Dasar UMKM") ~ div input` | Ketik `4500` |
| 4 | Klik tombol submit simpan | `button:has-text("Simpan")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Modal tertutup otomatis dan toast sukses muncul: `"Produk master berhasil dibuat"`.
  - Kartu produk master baru tampil di grid dengan label `"Harga Default UMKM: Rp 4.500"`.
  - Badge produk menampilkan status `"Aktif"`.
- **Jaringan / Backend:**
  - Request `POST /rest/v1/master_products` mengembalikan `201 Created`.
- **Integritas Database:**
  - Record tersimpan di tabel `public.master_products` dengan `harga_asli = 4500` dan `is_active = true`.

---

### TC-03: Soft-Deactivation Mitra UMKM & Preservasi Data
- **ID Skenario Terkait:** `S-03`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Keamanan / Bisnis`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Mitra `Ibu Maria Snack` berstatus aktif (`is_active: true`) dan memiliki riwayat penjualan di sesi masa lalu.
2. Admin berada di halaman direktori `/admin/umkm`.

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Buka modal edit pada kartu mitra | `div.group:has-text("Ibu Maria Snack") button[title="Edit UMKM"]` | Klik tombol pensil |
| 2 | Ubah toggle status kemitraan | `button:has(span.rounded-full)` | Klik switch toggle |
| 3 | Verifikasi switch bergeser | Switch toggle background | Memastikan beralih ke warna abu-abu |
| 4 | Simpan pembaruan | `button:has-text("Simpan Perubahan")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Modal edit tertutup dan toast sukses muncul: `"Detail mitra UMKM berhasil diperbarui"`.
  - Badge status pada kartu `Ibu Maria Snack` berubah menjadi `"NONAKTIF"` dengan styling abu-abu (`bg-slate-50 text-slate-400`).
- **Integritas Database:**
  - Record pada tabel `public.umkm` memiliki `is_active = false`.
  - Data historis sesi, detail transaksi, dan utang konsinyasi tetap utuh tanpa satupun baris terhapus.

---

### TC-04: Soft-Deactivation Produk Master di Katalog
- **ID Skenario Terkait:** `S-04`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Keamanan / Bisnis`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Admin berada di `/admin/umkm/[umkm_id]` pada tab "Katalog Master".
2. Terdapat produk aktif `Kroket Daging Sapi`.

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Klik tombol edit pada kartu produk | `div.group:has-text("Kroket Daging Sapi") button[title="Edit Produk"]` | Klik ikon pensil |
| 2 | Klik toggle "Status Produk" | `button:has(span.rounded-full)` | Klik switch toggle |
| 3 | Simpan pembaruan produk | `button:has-text("Simpan Perubahan")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Modal tertutup dan toast sukses muncul: `"Produk master berhasil diperbarui"`.
  - Badge produk pada kartu berubah menjadi `"NONAKTIF"`.
- **Integritas Database & Alur:**
  - Tabel `public.master_products` terupdate `is_active = false`.
  - Produk otomatis terfilter keluar saat admin membuka halaman setup sesi baru (`/admin/setup/[umkm_id]`).

---

### TC-05: Proteksi Route Guard Admin dari Akun Kasir
- **ID Skenario Terkait:** `S-05`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Keamanan / RBAC`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Pengguna login sebagai `kasir1.test@omkpos.local` (peran `cashier`).
2. Sesi login kasir aktif dan browser berada di rute `/pos`.

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Arahkan browser langsung ke URL admin UMKM | `page.goto('/admin/umkm')` | Input URL langsung |
| 2 | Evaluasi respons middleware | Evaluasi URL browser | Tunggu redirect |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Middleware `admin.ts` langsung memblokir akses dan me-redirect browser kembali ke `/pos`.
  - Tidak ada elemen formulir atau data mitra UMKM yang sempat ter-render di DOM kasir.
- **Keamanan Konsinyasi:**
  - Kasir terbukti tidak dapat mengakses atau melihat nilai `harga_asli`.

---

### TC-06: Validasi Format Nomor WhatsApp (Wajib Awalan 62)
- **ID Skenario Terkait:** `S-06`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Negatif / Validasi Form`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Admin membuka modal "Daftarkan UMKM Baru" di `/admin/umkm`.

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Isi nama mitra | `label:has-text("Nama UMKM") ~ div input` | Ketik `Mitra Format Salah` |
| 2 | Isi nomor WA tanpa kode negara | `label:has-text("Nomor WhatsApp") ~ div input` | Ketik `081234567890` |
| 3 | Klik tombol simpan | `button:has-text("Simpan")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Sistem membatalkan pengiriman data di sisi klien.
  - Toast peringatan oranye/kuning muncul: `"Nomor WhatsApp harus diawali dengan kode negara 62"`.
  - Modal pendaftaran tetap terbuka dan input tidak di-reset.
- **Jaringan:**
  - Tidak ada request jaringan `POST /rest/v1/umkm` yang dikirim ke Supabase.

---

### TC-07: Pencegahan Duplikasi Nama Produk per Mitra
- **ID Skenario Terkait:** `S-07`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Negatif / Database Constraint`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Mitra telah memiliki produk bernama `Pastel Ayam Telur`.
2. Admin membuka modal "Tambah Produk Master" untuk mitra yang sama.

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Masukkan nama produk yang sudah ada | `label:has-text("Nama Produk") ~ div input` | Ketik `Pastel Ayam Telur` |
| 2 | Masukkan harga modal | `label:has-text("Harga Dasar UMKM") ~ div input` | Ketik `5000` |
| 3 | Klik tombol simpan | `button:has-text("Simpan")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - UI menangkap error constraint unik PostgreSQL.
  - Toast error merah muncul: `"Gagal: Produk dengan nama tersebut sudah terdaftar untuk mitra ini"`.
  - Modal tetap terbuka sehingga admin dapat mengoreksi nama produk.

---

### TC-08: Penolakan Hard-Delete Produk Master Berelasi Sesi
- **ID Skenario Terkait:** `S-08`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Negatif / Integritas FK`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Produk `Pastel Ayam Telur` telah terikat pada tabel `session_products` di sesi penjualan lalu.
2. Admin berada di tab "Katalog Master".

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Klik tombol hapus (ikon tempat sampah) | `div.group:has-text("Pastel Ayam Telur") button[title="Hapus Produk"]` | Klik tombol |
| 2 | Konfirmasi dialog browser | `dialog.accept()` | Setujui konfirmasi |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Database menolak penghapusan karena constraint `ON DELETE RESTRICT`.
  - UI menangkap pesan foreign key dan menampilkan toast edukatif: *"Tidak dapat menghapus produk ini karena sudah terdaftar di suatu sesi penjualan. Silakan edit lalu ubah statusnya menjadi Nonaktif."*
  - Produk tetap ada di daftar dan tidak terhapus.

---

### TC-09: Penyalinan Tautan Dashboard Performa Publik
- **ID Skenario Terkait:** `S-09`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Positif / Integrasi Clipboard`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Admin berada di `/admin/umkm` dan melihat kartu mitra dengan ID `u0000000-0000-0000-0000-000000000001`.

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Klik tombol salin link performa | `div.group:first-child button[title="Salin Link Performa"]` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI & Clipboard:**
  - Toast notifikasi sukses muncul: `"Link performa UMKM berhasil disalin!"`.
  - Isi clipboard sistem sama persis dengan format: `http://localhost:3000/umkm/performance/u0000000-0000-0000-0000-000000000001`.

---

### TC-10: Eksplorasi Tab Statistik Performa All-Time & Riwayat Sesi
- **ID Skenario Terkait:** `S-10`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Positif / RPC Analytics`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Admin membuka halaman detail mitra yang memiliki riwayat penjualan di masa lalu.

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Klik tab "Statistik Performa" | `button:has-text("Statistik Performa")` | Klik tab |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI & API:**
  - RPC `get_umkm_product_performance` dan `get_umkm_session_history` dieksekusi via Supabase.
  - Kartu metrik "Total Terjual (All-Time)" menampilkan angka kuantitas format font mono (misal: `125 pcs`).
  - Kartu metrik "Total Setoran Bersih" menampilkan total nominal format Rupiah (misal: `Rp 500.000`).
  - Tabel performa tiap produk dan tabel riwayat keikutsertaan sesi berhasil ter-render dengan rapi.

---

### TC-11: Penyaringan Instan Mitra UMKM Berdasarkan Nama atau Nomor WA
- **ID Skenario Terkait:** `S-11`
- **Prioritas:** `P2 (Medium)`
- **Tipe Uji:** `UI / Performa`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Terdapat lebih dari 3 mitra di direktori (misal: "Ibu Maria", "Dapur Santo Yosef", "Berkah Kue").
2. Admin berada di `/admin/umkm`.

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Ketik kata kunci pada kotak pencarian | `input[placeholder*="Cari nama mitra"]` | Ketik `"Maria"` |
| 2 | Verifikasi daftar tersaring | Grid kartu mitra | Periksa item yang tampil |
| 3 | Bersihkan kata kunci | Input pencarian | Kosongkan field |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Saat input bernilai `"Maria"`, hanya kartu `"Ibu Maria Snack"` yang tampil di grid.
  - Kartu lain otomatis disembunyikan seketika (<100ms) tanpa jeda reload atau pemanggilan API baru.
  - Saat input dikosongkan, seluruh mitra kembali tampil lengkap.

---

### TC-12: Ergonomi Sentuh & Responsivitas Mobile PWA 375px
- **ID Skenario Terkait:** `S-12`
- **Prioritas:** `P2 (Medium)`
- **Tipe Uji:** `Ergonomi / Responsivitas`
- **Tingkat Otomasi:** `Playwright Automated (Emulation)`

#### Prasyarat (Preconditions):
1. Viewport browser diatur pada emulasi mobile: `375 × 667px` (iPhone SE).
2. Admin berada di halaman direktori `/admin/umkm`.

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Buka direktori UMKM pada mobile viewport | `page.setViewportSize({ width: 375, height: 667 })` | Emulasi mobile |
| 2 | Periksa tata letak kartu mitra | Grid layout `.grid` | Evaluasi class kolom |
| 3 | Periksa target sentuh tombol | Tombol aksi kartu | Ukur tinggi & lebar elemen |
| 4 | Buka modal "Tambah UMKM" | `button:has-text("Tambah UMKM")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI & Ergonomi:**
  - Grid bertransformasi menjadi 1 kolom vertikal (`grid-cols-1`).
  - Tidak ada elemen yang meluap secara horizontal (*no horizontal scrolling / overflow*).
  - Seluruh tombol aksi memenuhi area sentuh minimal 48×48px.
  - Dialog modal tampil proporsional di layar ponsel dengan padding yang rapi.
