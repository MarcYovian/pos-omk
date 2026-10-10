# Pertanyaan dan Asumsi: UMKM Partner Master Data Management (F-04)

> **Dokumen Tahap 2/9 — Klarifikasi Kebutuhan & Pencatatan Asumsi**  
> *Fungsi: Mencatat hal-hal ambigu, perilaku tepi (edge case), batas toleransi sistem, atau detail UI yang belum tertulis di PRD agar diverifikasi dan disetujui sebelum penulisan test case.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-04` |
| **Nama Fitur** | `UMKM Partner Master Data Management` |
| **Status Klarifikasi** | `LENGKAP & DIKONFIRMASI` |
| **Terakhir Diperbarui** | `2026-10-10` |
| **QA Engineer** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |
| **Pemberi Keputusan** | `Product Owner & Tech Lead OMK POS` |

---

## 2. Matriks Pertanyaan (Questions) & Asumsi (Assumptions)

> **Keterangan Kode ID:**  
> - `Q-XX` = Pertanyaan langsung kepada stakeholder/user karena spesifikasi ambigu atau perilaku sistem memerlukan penegasan.  
> - `A-XX` = Asumsi kerja yang diajukan oleh QA untuk memandu penyusunan pengujian otomatis.

| ID | Jenis | Pertanyaan / Asumsi | Kategori | Sumber | Dampak ke Testing / Risiko | Status | Jawaban / Keputusan Resmi | Tanggal Respon |
|---|---|---|---|---|---|---|---|---|
| **Q-01** | Pertanyaan | Mengapa validasi nomor WhatsApp mewajibkan format kode negara `62` tanpa tanda plus (`+`) atau awalan lokal (`08`)? | Validasi & Integrasi | `app/pages/admin/umkm/index.vue` L73-77 | Jika kasir/admin menginput format `0812...`, sistem akan menolak. Perlu penanganan pesan toast yang jelas. | `Terjawab` | Nomor wajib diawali `62` murni tanpa karakter khusus agar kompatibel langsung dengan tautan deep-link `https://wa.me/62...` dan bot pengirim laporan WhatsApp (F-08). | `2026-10-10` |
| **Q-02** | Pertanyaan | Bagaimana penanganan jika admin mencoba menghapus produk master yang sudah memiliki riwayat keikutsertaan di sesi penjualan masa lalu? | Integritas Data & FK | `app/pages/admin/umkm/[umkm_id].vue` L201-207 | Database melempar error foreign key constraint (`violates foreign key constraint`). UI harus menangkap error dan mengedukasi pengguna. | `Terjawab` | Sistem dilarang melakukan hard delete terhadap produk yang berelasi dengan tabel `session_products`. UI menangkap error database dan menampilkan toast instruksi: *"Tidak dapat menghapus produk ini karena sudah terdaftar di suatu sesi penjualan. Silakan edit lalu ubah statusnya menjadi Nonaktif."* | `2026-10-10` |
| **Q-03** | Pertanyaan | Apakah sistem mengizinkan pendaftaran dua produk dengan nama yang sama untuk mitra UMKM yang sama atau berbeda? | Konsistensi Data | `docs/DB_SCHEMA.md` L399 | Uji batasan unik nama produk di form tambah/edit. | `Terjawab` | Produk dengan nama yang sama dilarang untuk mitra yang sama (`CONSTRAINT master_products_company_umkm_nama_unique`). Namun jika milik mitra yang berbeda, nama produk boleh sama. UI menangkap duplikasi dan menampilkan peringatan. | `2026-10-10` |
| **Q-04** | Pertanyaan | Apakah ada fitur hard-delete untuk entitas Mitra UMKM di antarmuka web? | Keamanan Bisnis | PRD F-04 Skenario 4.2 | Memastikan tidak ada tombol hapus permanen UMKM yang dapat merusak audit historis. | `Terjawab` | Tidak ada tombol hard delete untuk entitas UMKM pada UI. Seluruh pengelolaan masa aktif dilakukan via switch toggle `is_active` (soft-deactivation) untuk melindungi integritas catatan keuangan dan utang konsinyasi. | `2026-10-10` |
| **A-01** | Asumsi | Asumsi: Tombol submit ("Simpan" dan "Simpan Perubahan") otomatis menampilkan state loading (`isCreating = true` / `isUpdating = true`) dan dinonaktifkan dari double-click selama mutasi Supabase berjalan. | UI/UX & Ketahanan | Standar `AppButton` & `index.vue` | Mencegah terciptanya duplikat record secara tidak sengaja di pengujian otomatis. | `Disetujui` | Benar, tombol terikat prop `:loading` dan menolak klik ganda. | `2026-10-10` |
| **A-02** | Asumsi | Asumsi: Pengguna dengan role `cashier` tidak boleh melihat nilai `harga_asli` dan dilarang mengakses rute `/admin/umkm` maupun `/admin/umkm/[umkm_id]`. | Keamanan & RBAC | PRD F-01 & AGENTS.md Rule 7 | Pengujian route guard wajib memastikan kasir dicegat middleware `admin.ts` dan dialihkan ke `/pos`. | `Disetujui` | Sesuai aturan kerahasiaan konsinyasi; nilai `harga_asli` hanya untuk Admin & Super Admin. | `2026-10-10` |
| **A-03** | Asumsi | Asumsi: Mitra dan produk master yang berstatus nonaktif (`is_active = false`) tetap ditampilkan di konsol admin F-04 dengan badge visual "Nonaktif", namun otomatis di-filter keluar dari pilihan pembuatan sesi di F-05. | Alur Bisnis | PRD F-04 & F-05 | Uji status badge di F-04 dan filter dropdown di F-05. | `Disetujui` | Ya, admin tetap dapat melihat mitra nonaktif dan mengaktifkannya kembali sewaktu-waktu. | `2026-10-10` |
| **A-04** | Asumsi | Asumsi: Nilai `harga_asli` wajib berupa bilangan bulat positif (integer > 0) dan tidak boleh bernilai 0 atau negatif. | Finansial | Database Check Constraint `harga_asli > 0` | Uji input bernilai 0, negatif, atau string non-numerik. | `Disetujui` | Dilindungi oleh atribut `input-mode="numeric"` di UI dan database `CHECK (harga_asli > 0)`. | `2026-10-10` |

---

## 3. Log Keputusan Arsitektur & Bisnis (Decision Log)

Bagian ini merangkum keputusan final yang telah diambil berdasarkan analisis di atas untuk dijadikan acuan baku dalam `02-test-scenarios.md` dan penulisan test case otomatis:

### 3.1 Keputusan #[DEC-01]: Format Kontak WhatsApp Wajib Awalan `62`
- **Rujukan ID:** `Q-01`
- **Isi Keputusan:** Form pendaftaran dan edit mitra UMKM membersihkan karakter non-angka dan memvalidasi bahwa string diawali dengan `62`. Input seperti `08123456789`, `+628123456789`, atau `-` akan memicu toast peringatan kuning dan memblokir submit.
- **Dampak pada Desain Pengujian:** Skenario negatif wajib memvalidasi input dengan format `08...`, karakter spesial, dan huruf untuk memastikan form guard berfungsi.

### 3.2 Keputusan #[DEC-02]: Proteksi Foreign Key & Larangan Hard Delete
- **Rujukan ID:** `Q-02`, `Q-04`
- **Isi Keputusan:** Menjaga integritas basis data historis konsinyasi dengan mengandalkan `ON DELETE RESTRICT` pada PostgreSQL. Upaya penghapusan produk berelasi ditangani secara elegan di antarmuka pengguna dengan pesan edukasi beralih ke soft-deactivate.
- **Dampak pada Desain Pengujian:** Skenario negatif wajib memverifikasi penolakan penghapusan produk yang terikat sesi, serta memastikan tombol hapus tidak tersedia pada entitas mitra UMKM level atas.

### 3.3 Keputusan #[DEC-03]: Keunikan Nama Produk per Mitra & Paroki
- **Rujukan ID:** `Q-03`
- **Isi Keputusan:** Sistem menegakkan constraint unik `(company_id, umkm_id, nama_produk)`. Submit produk baru dengan nama yang identik untuk mitra yang sama akan memunculkan feedback error duplikasi.
- **Dampak pada Desain Pengujian:** Skenario negatif wajib menyertakan pengujian penambahan produk dengan nama yang sudah ada untuk mitra yang bersangkutan.

### 3.4 Keputusan #[DEC-04]: Isolasi Rute & Hak Akses Kasir
- **Rujukan ID:** `A-02`
- **Isi Keputusan:** Seluruh modul `/admin/umkm/*` dilindungi middleware kombinasi `['auth', 'admin']`. Kasir yang mencoba mengakses rute ini ditolak seketika tanpa menampilkan fragmen DOM administratif.
- **Dampak pada Desain Pengujian:** Skenario keamanan P0 wajib menyimulasikan navigasi kasir terautentikasi langsung ke URL `/admin/umkm` dan `/admin/umkm/[umkm_id]`, memastikan URL dialihkan ke `/pos`.

---

## 4. Status Review & Kesiapan Melangkah ke Tahap Berikutnya

- [x] **Semua Pertanyaan Kritis (Q-01 s/d Q-04) Terjawab:** `YA`
- [x] **Semua Asumsi Utama (A-01 s/d A-04) Dikonfirmasi:** `YA`
- [ ] **Diberikan Izin Lanjut ke 02-test-scenarios.md:** `(Menunggu Review Gate 1-3 User)`
