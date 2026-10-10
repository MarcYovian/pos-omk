# OMK POS — Master Documentation Hub

Selamat datang di pusat dokumentasi resmi **OMK POS** (`pos-omk`). 

Direktori ini dirancang sebagai **Single Source of Truth** yang terpadu dan hidup (*living documentation*). Seluruh informasi teknis, produk, bisnis, antarmuka, dan arsitektur telah dikonsolidasi agar **mudah dicari di satu tempat tanpa perlu lagi memeriksa dokumen perencanaan parsial per versi**.

> [!IMPORTANT]
> **ATURAN PENCARIAN INFORMASI (NO VERSION DIGGING):**  
> Semua spesifikasi terkini dari sistem (termasuk Multi-Parish Tenancy dan Dynamic RBAC) sudah disatukan ke dalam dokumen-dokumen master di bawah ini. Anda **TIDAK PERLU** membaca dokumen perencanaan bertahap di `docs/plans/` atau `docs/archive/` untuk operasional dan pengembangan harian. Folder-folder tersebut dipertahankan murni sebagai arsip jejak rekam historis (*audit trail*).

---

## 🗺️ Matriks Navigasi Cepat (Fast Lookup Directory)

Gunakan panduan berikut untuk menemukan informasi yang Anda butuhkan secara instan:

| Kebutuhan Informasi Anda | Dokumen Acuan Utama | Isi & Cakupan Dokumen |
|---|---|---|
| **Latar Belakang Produk & Bisnis**<br>• Masalah yang diselesaikan<br>• Target Persona / Role pengguna<br>• Hasil bisnis & KPI terukur<br>• Formula & aturan konsinyasi<br>• **User Stories & Acceptance Criteria (BDD)** | 📖 [**`docs/PRD.md`**](./PRD.md) | **Living Master PRD:** Latar belakang 5 masalah lapangan, analisis 5 persona, model bagi hasil konsinyasi murni, katalog 16 fitur lengkap, dan skenario BDD (Given-When-Then) untuk F-01 s/d F-16. |
| **Kontrak API & Database RPC**<br>• REST Endpoints Nitro (`/api/*`)<br>• Header & Autentikasi (`X-Company-Id`)<br>• Stored Procedures PostgreSQL (RPC)<br>• Format Request & Response DTO | 🔌 [**`docs/API_CONTRACTS.md`**](./API_CONTRACTS.md) | **Master API & RPC Reference:** Dokumentasi lengkap endpoints `/api/companies`, `/api/roles`, `/api/permissions`, `/api/users`, `/api/public`, serta 14+ fungsi RPC Supabase berserta parameter dan return typenya. |
| **Spesifikasi UI/UX & Wireframe**<br>• Desain sistem pengganti Figma<br>• Palet warna & semantic tokens<br>• Tipografi angka kasir monospace<br>• Ergonomi sentuh (min 48×48px)<br>• Wireframe layout layar (ASCII) | 🎨 [**`docs/UI_UX_SPECIFICATION.md`**](./UI_UX_SPECIFICATION.md) | **Master UI/UX Design System:** Token warna `#1e3a5f`, preset `JetBrains Mono` uang, katalog 7 komponen primitif (`AppButton`, `AppModal`, dll.), dan blueprint layout kasir & admin. |
| **Katalog Fitur Locked (F-01 s/d F-16)**<br>• Status proteksi fitur (LOCKED)<br>• Rute & middleware terkait<br>• Dependensi store & RPC | 🔒 [**`docs/FEATURES.md`**](./FEATURES.md) | **Registry 16 Fitur Terkunci:** Daftar ringkas dan batas perlindungan fitur F-01 hingga F-16 yang dilarang di-refactor sembarangan. |
| **Arsitektur Sistem & Rekayasa**<br>• Tech stack (Nuxt 4 SPA, Nitro, Supabase)<br>• Mesin PWA & Offline Queue (idb)<br>• Batasan tanggung jawab modul<br>• Strategi caching in-memory Nitro | 🏗️ [**`docs/ARCHITECTURE.md`**](./ARCHITECTURE.md) | **Arsitektur Teknis:** Struktur folder, siklus hidup data, penanganan zona waktu WIB (UTC+7), isolasi RLS multi-tenant, dan aturan penulisan kode. |
| **Skema Database & Keamanan Data**<br>• 14 tabel PostgreSQL<br>• Kebijakan Row-Level Security (RLS)<br>• Database Views & Triggers<br>• Migrasi skema | 🗄️ [**`docs/DB_SCHEMA.md`**](./DB_SCHEMA.md) | **Database Reference:** Skema lengkap tabel PostgreSQL, definisi relasi, indeks performa, aturan RLS multi-paroki, dan trigger pencatatan buku kas. |
| **Alur Pengguna & State Machine**<br>• Alur operasional kasir Minggu<br>• Alur rekonsiliasi pengurus OMK<br>• State diagram sesi (Draft, Open, Closed) | 🔄 [**`docs/USER_FLOWS.md`**](./USER_FLOWS.md) | **User Journey & State Flows:** Diagram alur interaksi pengguna, diagram transisi status sesi, dan urutan pemulihan antrean offline. |

---

## 📁 Struktur Direktori `docs/`

```
docs/
├── README.md                  # 🌟 Hub Navigasi Utama (Dokumen ini)
├── PRD.md                     # 📖 Master PRD: Bisnis, Masalah, Personas, 16 Fitur, User Stories & AC
├── API_CONTRACTS.md           # 🔌 Master API Reference: Nitro REST Endpoints & Supabase RPC
├── UI_UX_SPECIFICATION.md     # 🎨 Master UI/UX: Design Tokens, Ergonomi & Wireframe Layouts
├── FEATURES.md                # 🔒 Registry Resmi 16 Fitur Terkunci (Locked)
├── ARCHITECTURE.md            # 🏗️ Panduan Arsitektur Teknis & Boundaries
├── DB_SCHEMA.md               # 🗄️ Skema Database PostgreSQL, RLS, Views & Triggers
├── USER_FLOWS.md              # 🔄 Diagram Alur Interaksi Pengguna & State Machine
│
├── plans/                     # 📦 [ARSIP HISTORIS] Dokumen perencanaan masa lalu (Tidak perlu dibaca)
│   ├── completed/             # Arsip PRD v1 awal, rencana Multi-Company bertahap, dan rencana RBAC
│   └── proposed/              # Tempat draf RFC/usulan fitur masa depan yang belum diimplementasikan
└── archive/                   # 📦 [ARSIP TEKNIS] Catatan migrasi SQL v2 dan tech stack lama
```

---

## 📌 Pedoman Pembaruan Dokumentasi (Maintenance Rule)

1. **Prinsip Single Source of Truth:** Saat ada penambahan atau perubahan fitur di kemudian hari, langsung perbarui dokumen master terkait (`PRD.md`, `API_CONTRACTS.md`, `UI_UX_SPECIFICATION.md`, `FEATURES.md`, `DB_SCHEMA.md`, `ARCHITECTURE.md`).
2. **Hindari Pembuatan Dokumen Terfragmentasi:** Jangan membuat file baru seperti `PRD_v2.md` atau `API_v3.md`. Pertahankan satu dokumen living yang terus dimutakhirkan.
3. **Standar Kode & Pengujian:** Setiap perubahan wajib mematuhi aturan baku pada [AGENTS.md](../AGENTS.md) dan lolos seluruh test suite Vitest (`npm test`).
