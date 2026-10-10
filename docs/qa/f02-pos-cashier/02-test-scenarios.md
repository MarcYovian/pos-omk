# Test Scenarios (Test Plan): Real-time POS Cashier Screen (F-02)

> **Dokumen Tahap 3/9 — Rencana Pengujian & Daftar Skenario**  
> *Fungsi: Memetakan seluruh skenario pengujian dengan format Given-When-Then, menetapkan prioritas risiko (P0-P3), serta mengelompokkan skenario positif, negatif, edge-case, dan konkurensi sebelum penulisan test case terperinci.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-02` |
| **Nama Fitur** | `Real-time POS Cashier Screen` |
| **Total Skenario** | `5 Skenario` |
| **Rasio Prioritas** | `P0: 3 | P1: 2 | P2: 0` |
| **Target Cakupan** | `UI E2E + Pinia Store State + Supabase RPC Integrity` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |

---

## 2. Definisi Skala Prioritas & Tipe Uji

| Prioritas | Kriteria | Toleransi Rilis |
|---|---|---|
| **P0 (Critical)** | Alur utama bisnis, transaksi finansial, isolasi tenant & data, mutasi stok atomik. | Zero tolerance; blokir rilis jika gagal. |
| **P1 (High)** | Validasi formulir, error handling jaringan, feedback toast, kalkulasi kembalian. | Harus lulus sebelum staging rilis. |
| **P2 (Medium)** | Filter data, pencarian teks instan, tampilan responsif mobile 375px. | Dapat diperbaiki pada patch minor. |
| **P3 (Low)** | Estetika visual minor, animasi transisi non-kritis. | Tidak menghambat rilis. |

---

## 3. Daftar Skenario Pengujian (Given-When-Then)

| ID | Skenario Pengujian (Given-When-Then) | Tipe | Prioritas | Sumber / Rujukan | Status Automasi |
|---|---|---|---|---|---|
| **S-01** | **Given** Sesi hari ini berstatus aktif (`status = 'open'`) dan terdapat produk dengan `stok_sekarang > 0`.<br>**When** Kasir mengetik nama produk di kolom pencarian atau mengklik kartu produk.<br>**Then** Produk masuk ke keranjang Pinia in-memory; jumlah kuantitas bertambah; dan subtotal terhitung instan. | Positif | P1 | PRD Skenario 2.1 | Candidate (Playwright) |
| **S-02** | **Given** Kasir membuka antarmuka `/pos` dan memeriksa katalog produk maupun DOM browser.<br>**Then** Seluruh data yang ditampilkan hanya bersumber dari `products_cashier_view`, tidak ada eksposur field `harga_asli` sama sekali di frontend kasir. | Keamanan / RBAC | P0 | PRD Skenario 2.2 | Candidate (Playwright) |
| **S-03** | **Given** Keranjang berisi total belanja Rp 35.000.<br>**When** Kasir memilih metode tunai (*Cash*) dan menekan tombol preset `50.000`.<br>**Then** Kolom kembalian seketika menampilkan `Rp 15.000` dengan tipografi kontras `text-pos-change`. Tombol "Selesaikan Pembayaran" menjadi aktif. | Negatif / Validasi | P1 | PRD Skenario 2.3 | Candidate (Playwright) |
| **S-04** | **Given** Kasir menekan tombol "Selesaikan Pembayaran".<br>**When** Permintaan dikirim ke server.<br>**Then** Sistem mengeksekusi RPC `complete_transaction` yang mengunci baris stok, memvalidasi ketersediaan stok, mengurangi `stok_sekarang`, mencatat record transaksi dan item, serta men-trigger entri kas masuk ke `cash_flows` dalam satu transaksi database ACID. | Negatif / Validasi | P0 | PRD Skenario 2.4 | Candidate (Playwright) |
| **S-05** | **Given** Dua kasir (Kasir A dan Kasir B) membuka antarmuka `/pos`.<br>**When** Kasir A menyelesaikan penjualan 2 unit "Puding Cokelat".<br>**Then** Melalui Supabase Realtime channel, layar Kasir B otomatis memperbarui sisa stok "Puding Cokelat" tanpa perlu reload halaman. | Konkurensi / Realtime | P0 | PRD Skenario 2.5 | Candidate (Playwright) |

---

## 4. Matriks Cakupan Pengujian (Coverage Matrix)

### 4.1 Cakupan Berdasarkan Peran (Role Coverage)
| Peran (Role) | Target Skenario | Skenario Terkait |
|---|---|---|
| **Kasir / Admin** | Operasional fitur utama & transaksi | S-01, S-02, S-03 |
| **Unauthorized User** | Proteksi izin akses & isolasi harga modal | S-02 |

### 4.2 Cakupan Berdasarkan Viewport & Jaringan
| Kondisi / Viewport | Perilaku yang Divalidasi | Skenario Terkait |
|---|---|---|
| **Desktop (1280×800)** | Tampilan tabel lengkap, navigasi admin | S-01 |
| **Mobile PWA (375×667)** | Ergonomi ibu jari, tap target 48×48px, table-to-card | S-05 |

---

## 5. Keterlacakan ke Acceptance Criteria (Traceability Matrix)

| Acceptance Criteria (PRD) | Skenario Teruji | Status Keterpenuhan |
|---|---|---|
| `PRD Skenario 2.1` | `S-01` | `Tercakup Lengkap` |
| `PRD Skenario 2.2` | `S-02` | `Tercakup Lengkap` |
| `PRD Skenario 2.3` | `S-03` | `Tercakup Lengkap` |
| `PRD Skenario 2.4` | `S-04` | `Tercakup Lengkap` |
| `PRD Skenario 2.5` | `S-05` | `Tercakup Lengkap` |

---

## 6. Status Review & Persetujuan

- [ ] **Semua Skenario Kritis (P0) Disetujui:** `YA / BELUM`
- [ ] **Distribusi Prioritas & Tipe Uji Seimbang:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 03-screen-flow.md:** `(Tanda Tangan / Persetujuan User: ________)`
