# Pertanyaan dan Asumsi: Real-time POS Cashier Screen (F-02)

> **Dokumen Tahap 2/9 — Klarifikasi Kebutuhan & Pencatatan Asumsi**  
> *Fungsi: Mencatat hal-hal ambigu, perilaku tepi (edge case), batas toleransi sistem, atau detail UI yang belum tertulis di PRD agar diverifikasi dan disetujui sebelum penulisan test case.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-02` |
| **Nama Fitur** | `Real-time POS Cashier Screen` |
| **Status Klarifikasi** | `IN REVIEW` |
| **Terakhir Diperbarui** | `2026-10-10` |
| **QA Engineer** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |
| **Pemberi Keputusan** | `Product Owner & Tech Lead OMK POS` |

---

## 2. Matriks Pertanyaan (Questions) & Asumsi (Assumptions)

| ID | Jenis | Pertanyaan / Asumsi | Kategori | Sumber | Dampak ke Testing / Risiko | Status | Jawaban / Keputusan Resmi | Tanggal Respon |
|---|---|---|---|---|---|---|---|---|
| **Q-01** | Pertanyaan | Bagaimana penanganan jika koneksi internet terputus di tengah proses transaksi? | Resiliensi Jaringan | PRD F-03 PWA Queue | Memerlukan skenario offline queue fallback | `Menunggu Konfirmasi` | Ditampung di IndexedDB dan disinkronkan saat online | `2026-10-10` |
| **Q-02** | Pertanyaan | Apakah ada batas maksimum item yang dapat ditambahkan ke dalam keranjang? | Batasan Sistem | PRD F-02 | Validasi kapasitas tampilan keranjang mobile | `Menunggu Konfirmasi` | Dibatasi oleh stok aktual produk di server | `2026-10-10` |
| **A-01** | Asumsi | Asumsi: Tombol submit transaksi otomatis dinonaktifkan (`disabled` + spinner) saat proses RPC berjalan untuk mencegah *double checkout*. | UI/UX & Integritas | Best Practice POS | Mencegah bug duplikasi transaksi di automation | `Disetujui` | Sesuai spesifikasi AppButton (`loading = true`) | `2026-10-10` |
| **A-02** | Asumsi | Asumsi: Pengecekan stok akhir dilakukan secara atomik di database level saat checkout, bukan hanya validasi visual di keranjang. | Integritas Data | Aturan RPC Atomik | Uji skenario race condition kasir bersamaan | `Disetujui` | Terjamin oleh RPC `complete_transaction` | `2026-10-10` |
| **A-03** | Asumsi | Asumsi: Semua kalkulasi mata uang menggunakan integer Rupiah tanpa desimal dan diformat via `useCurrencyFormat()`. | Finansial | AGENTS.md Rule 6 | Uji input dan asersi teks nominal di UI | `Disetujui` | Baku di seluruh aplikasi | `2026-10-10` |

---

## 3. Log Keputusan Arsitektur & Bisnis (Decision Log)

### 3.1 Keputusan #[DEC-01]: Isolasi Harga Modal UMKM
- **Rujukan ID:** `A-02`
- **Isi Keputusan:** Kasir tidak diperbolehkan menerima atau melihat data `harga_asli` baik di layar maupun respons JSON jaringan.
- **Dampak pada Desain Pengujian:** Skenario keamanan P0 wajib memvalidasi inspect network payload.

### 3.2 Keputusan #[DEC-02]: Penanganan Tombol Aksi Primer
- **Rujukan ID:** `A-01`
- **Isi Keputusan:** Seluruh aksi submit transaksi wajib memiliki proteksi *double-click* dan indikator visual loading.
- **Dampak pada Desain Pengujian:** Skenario negatif dan edge case wajib menguji penekanan cepat tombol berkali-kali.

---

## 4. Status Review & Kesiapan Melangkah ke Tahap Berikutnya

- [ ] **Semua Pertanyaan Kritis Terjawab:** `YA / BELUM`
- [ ] **Semua Asumsi Utama Dikonfirmasi:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 02-test-scenarios.md:** `(Tanda Tangan / Persetujuan User: ________)`
