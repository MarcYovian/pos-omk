# Pertanyaan dan Asumsi: [NAMA_FITUR] ([KODE_FITUR])

> **Dokumen Tahap 2/9 — Klarifikasi Kebutuhan & Pencatatan Asumsi**  
> *Fungsi: Mencatat hal-hal ambigu, perilaku tepi (edge case), batas toleransi sistem, atau detail UI yang belum tertulis di PRD agar diverifikasi dan disetujui sebelum penulisan test case.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `[F-XX / KODE_FITUR]` |
| **Nama Fitur** | `[Nama Fitur Lengkap]` |
| **Status Klarifikasi** | `TERBUKA / SEBAGIAN TERJAWAB / LENGKAP` |
| **Terakhir Diperbarui** | `[YYYY-MM-DD]` |
| **QA Engineer** | `[Nama QA / Agent]` |
| **Pemberi Keputusan** | `[Nama User / Lead / Product Owner]` |

---

## 2. Matriks Pertanyaan (Questions) & Asumsi (Assumptions)

> **Keterangan Kode ID:**  
> - `Q-XX` = Pertanyaan langsung kepada stakeholder/user karena spesifikasi ambigu atau belum ada.  
> - `A-XX` = Asumsi kerja yang diajukan oleh QA/Agent untuk memandu penyusunan pengujian sementara.

| ID | Jenis | Pertanyaan / Asumsi | Kategori | Sumber | Dampak ke Testing / Risiko | Status | Jawaban / Keputusan Resmi | Tanggal Respon |
|---|---|---|---|---|---|---|---|---|
| **Q-01** | Pertanyaan | `[Contoh: Berapa batas waktu timeout saat proses pembayaran QRIS?]` | Bisnis / Integrasi | Tidak ada di PRD | Jika tidak dibatasi, UI freeze tanpa feedback | `Terbuka` | `[Jawaban stakeholder]` | `[YYYY-MM-DD]` |
| **Q-02** | Pertanyaan | `[Contoh: Apakah kasir boleh menghapus item yang sudah dimasukkan ke keranjang jika sesi hampir ditutup?]` | Otorisasi / Alur | PRD Bagian 2.3 | Mempengaruhi pengujian permission & state cart | `Menunggu Konfirmasi` | `[Jawaban stakeholder]` | `[YYYY-MM-DD]` |
| **A-01** | Asumsi | `[Contoh: Asumsi bahwa stok produk dicek kembali ke database saat tombol bayar ditekan, bukan hanya saat produk ditambahkan ke keranjang]` | Integritas Data | Asumsi Agent | Perlu skenario race condition / multi-cashier concurrency | `Perlu Konfirmasi` | `[Disetujui / Ditolak / Disesuaikan]` | `[YYYY-MM-DD]` |
| **A-02** | Asumsi | `[Contoh: Asumsi bahwa tombol aksi primer dinonaktifkan (disabled + spinner) saat mutasi berjalan untuk mencegah double submit]` | UI / UX | Standar AGENTS.md | Mencegah bug duplicate transaction di pengujian otomatis | `Disetujui` | `[Konfirmasi bahwa disable diterapkan]` | `[YYYY-MM-DD]` |

---

## 3. Log Keputusan Arsitektur & Bisnis (Decision Log)

Bagian ini merangkum keputusan final yang telah diambil berdasarkan diskusi pada tabel di atas untuk dijadikan acuan baku dalam `02-test-scenarios.md` dan `06-test-cases.md`:

### 3.1 Keputusan #[DEC-01]: [Topik Keputusan]
- **Rujukan ID:** `Q-01` / `A-01`
- **Isi Keputusan:** `[Rangkuman keputusan final yang mengikat]`
- **Dampak pada Desain Pengujian:** `[Bagaimana keputusan ini diuji di test case]`

### 3.2 Keputusan #[DEC-02]: [Topik Keputusan]
- **Rujukan ID:** `Q-02` / `A-02`
- **Isi Keputusan:** `[Rangkuman keputusan final yang mengikat]`
- **Dampak pada Desain Pengujian:** `[Bagaimana keputusan ini diuji di test case]`

---

## 4. Status Review & Kesiapan Melangkah ke Tahap Berikutnya

- [ ] **Semua Pertanyaan Kritis (P0/P1) Terjawab:** `YA / BELUM`
- [ ] **Semua Asumsi Utama Dikonfirmasi:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 02-test-scenarios.md:** `(Tanda Tangan / Persetujuan User: ________)`
