# Feature Brief: [NAMA_FITUR] ([KODE_FITUR])

> **Dokumen Tahap 1/9 — Ringkasan Pemahaman Fitur**  
> *Fungsi: Memastikan pemahaman bisnis, alur pengguna, batasan teknis, dan ruang lingkup telah disepakati sebelum menyusun skenario pengujian.*

---

## 1. Metadata Fitur

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `[F-XX / KODE_FITUR]` (contoh: `F-02`, `F-04`, `F-15`) |
| **Nama Fitur** | `[Nama Fitur Lengkap]` |
| **Kategori / Modul** | `[POS / Admin / Finansial / Manajemen Pengguna / Pengaturan]` |
| **Status Dokumen** | `DRAFT / IN REVIEW / APPROVED` |
| **QA Engineer / Pembuat** | `[Nama QA / Agent]` |
| **Tech Lead / Reviewer** | `[Nama Lead / Stakeholder]` |
| **Tanggal Pembuatan** | `[YYYY-MM-DD]` |
| **Rujukan Dokumen** | [PRD.md](../../PRD.md), [FEATURES.md](../../FEATURES.md), [DB_SCHEMA.md](../../DB_SCHEMA.md) |

---

## 2. Ringkasan & Tujuan Bisnis

### 2.1 Tujuan Utama (Problem & Value Statement)
- **Tujuan:** `[Deskripsikan masalah apa yang diselesaikan dan nilai apa yang diberikan kepada paroki/UMKM/kasir]`
- **Target Hasil:** `[Hasil nyata yang terukur setelah user berinteraksi dengan fitur ini]`

### 2.2 Peran Pengguna (Roles Involved)
- `[ ]` **Kasir (`cashier`):** `[Aktivitas kasir di fitur ini]`
- `[ ]` **Admin Paroki (`admin`):** `[Aktivitas admin di fitur ini]`
- `[ ]` **Super Admin (`super_admin`):** `[Aktivitas super admin di fitur ini]`
- `[ ]` **Partner UMKM (`partner`):** `[Aktivitas atau tampilan untuk UMKM]`
- `[ ]` **Publik / Tamu (`guest`):** `[Aktivitas tanpa login]`

---

## 3. Alur Pengguna Ringkas (Happy Path Journey)

```
[Langkah 1: Masuk Halaman] 
        ↓
[Langkah 2: Input / Interaksi Pengguna] 
        ↓
[Langkah 3: Validasi & Konfirmasi] 
        ↓
[Langkah 4: Proses Sistem (RPC / API)] 
        ↓
[Langkah 5: Feedback Sukses & State Mutation]
```

**Penjelasan Tahapan:**
1. **Langkah 1:** `[User membuka rute /... dan melihat data ...] `
2. **Langkah 2:** `[User memilih/mengisi form ...] `
3. **Langkah 3:** `[User menekan tombol aksi primer ...] `
4. **Langkah 4:** `[Sistem mengeksekusi operasi transaksi atomik ...] `
5. **Langkah 5:** `[UI menampilkan notifikasi sukses / toast dan memperbarui tampilan ...] `

---

## 4. Keputusan Bisnis & Aturan Konsinyasi yang Relevan

> [!IMPORTANT]
> Pastikan semua aturan bisnis di bawah dipatuhi oleh alur UI dan pengujian.

1. **Aturan Harga & Keuangan:**
   - `[Sebutkan formula, batasan harga_asli vs harga_jual, bagi hasil OMK, format integer Rupiah tanpa desimal]`
2. **Isolasi Akses & Keamanan:**
   - `[Contoh: Kasir DILARANG melihat harga_asli UMKM; data terisolasi per company_id]`
3. **Zona Waktu & Tanggal:**
   - `[Wajib WIB (UTC+7) menggunakan getTodayJakarta(), tanggal sesi tidak boleh bergeser ke UTC]`
4. **Integritas Stok & Status:**
   - `[Mutasi stok wajib atomik via RPC; soft delete vs hard delete; kondisi sesi OPEN vs CLOSED]`

---

## 5. Jejak Arsitektur & Dependensi Teknis

| Komponen | Identitas / Path | Deskripsi & Peran |
|---|---|---|
| **Rute Frontend** | `[app/pages/...]` | Halaman UI utama |
| **Layout / Middleware** | `[app/layouts/... / app/middleware/...]` | Proteksi rute & layout navigasi |
| **Pinia Store** | `[app/stores/...]` | Manajemen state in-memory |
| **Komponen UI Primitives** | `[app/components/ui/...]` | Button, Input, Modal, Toast, dsb. |
| **API Endpoints** | `[server/api/...]` | Nitro REST endpoint (jika ada) |
| **Supabase RPC / View** | `[RPC ... / View ...]` | Prosedur database atomik & view aman |
| **Tabel Utama** | `[nama_tabel]` | Skema tabel database dengan RLS |

---

## 6. Batasan Ruang Lingkup (Scope Boundaries)

### 6.1 Dalam Cakupan (In-Scope)
- `[Alur spesifik 1 yang wajib diuji]`
- `[Alur spesifik 2 yang wajib diuji]`
- `[Validasi formulir dan error handling]`
- `[State UI responsif: desktop dan mobile PWA]`

### 6.2 Di Luar Cakupan (Out-of-Scope)
- `[Fitur dependensi yang sudah dicakup di dokumen QA fitur lain]`
- `[Uji beban / load testing skala besar]`
- `[Integrasi gateway pihak ketiga yang belum aktif]`

---

## 7. Kriteria Penerimaan Inti (Acceptance Criteria Rujukan)

- [ ] **AC-01:** `[Kriteria 1]`
- [ ] **AC-02:** `[Kriteria 2]`
- [ ] **AC-03:** `[Kriteria 3]`
- [ ] **AC-04:** `[Kriteria 4]`

---

## 8. Status Review & Persetujuan

- [ ] **Feature Brief Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)  
*Catatan: Jangan melanjutkan ke tahap penyusunan skenario detail jika tahap ini belum disetujui.*
