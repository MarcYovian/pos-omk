# Feature Brief: Authentication & Role-Based Access Control (RBAC) (F-01)

> **Dokumen Tahap 1/9 — Ringkasan Pemahaman Fitur**  
> *Fungsi: Memastikan pemahaman bisnis, alur pengguna, batasan teknis, dan ruang lingkup telah disepakati sebelum menyusun skenario pengujian.*

---

## 1. Metadata Fitur

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-01` |
| **Nama Fitur** | `Authentication & Role-Based Access Control (RBAC)` |
| **Kategori / Modul** | `Autentikasi, Keamanan & RBAC` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer / Pembuat** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |
| **Tech Lead / Reviewer** | `Product Owner & Tech Lead OMK POS` |
| **Tanggal Pembuatan** | `2026-10-10` |
| **Rujukan Dokumen** | [PRD.md](../../PRD.md), [FEATURES.md](../../FEATURES.md), [USER_FLOWS.md](../../USER_FLOWS.md), [DB_SCHEMA.md](../../DB_SCHEMA.md) |

---

## 2. Ringkasan & Tujuan Bisnis

### 2.1 Tujuan Utama (Problem & Value Statement)
- **Tujuan:** Sebagai pengguna (Kasir / Admin / Super Admin), saya ingin masuk ke dalam sistem menggunakan email dan password terdaftar serta dapat mengganti sandi secara mandiri, sehingga saya dapat mengakses fungsi sistem sesuai wewenang saya dengan aman.
- **Target Hasil:** Menyediakan mekanisme gerbang keamanan autentikasi terpusat berbasis Supabase Auth, isolasi hak akses operasional (kasir dibatasi hanya pada antarmuka kasir `/pos`, administrator pada konsol manajemen `/admin`), penegakan penggantian password sementara untuk akun kasir baru (*force password change*), dan fasilitas pemulihan kata sandi mandiri via email.

### 2.2 Peran Pengguna (Roles Involved)
- [x] **Kasir (`cashier`):** Masuk via email & password, diarahkan otomatis ke `/pos`, dilarang mengakses konsol `/admin/*`, dan dapat mengganti kata sandi mandiri di `/change-password`.
- [x] **Admin Paroki (`admin`):** Masuk via email & password, diarahkan otomatis ke `/admin`, memiliki hak mengelola katalog sesi mingguan, UMKM, kas flow, dan kasir paroki.
- [x] **Super Admin (`super_admin`):** Bypass seluruh permission check, mengelola registrasi paroki/perusahaan lintas tenant, dan manajemen peran global.
- [ ] **Partner UMKM (`partner`):** Mengakses dashboard performa penjualan publik tanpa otentikasi login (via URL unik F-13).
- [ ] **Publik / Tamu (`guest`):** Akses tanpa login dibatasi hanya untuk halaman landing login (`/login`) dan halaman pemulihan sandi via token recovery (`/reset-password`).

---

## 3. Alur Pengguna Ringkas (Happy Path Journey)

```
[Langkah 1: Masuk Halaman Login (/login)] 
        ↓
[Langkah 2: Input Email & Kata Sandi] 
        ↓
[Langkah 3: Validasi Form & Submit Autentikasi] 
        ↓
[Langkah 4: Handshake Supabase Auth & Evaluasi Metadata Akun] 
        ↓
[Langkah 5: Evaluasi Route Guard & Navigasi Berbasis Peran]
```

**Penjelasan Tahapan:**
1. **Langkah 1:** Pengguna membuka rute `/login`. Jika pengguna sudah memiliki sesi login aktif di browser, sistem otomatis mengarahkan ke halaman utama perannya (`/pos` untuk kasir, `/admin` untuk admin).
2. **Langkah 2:** Pengguna memasukkan kredensial email dan kata sandi pada field form.
3. **Langkah 3:** Validasi form memastikan format email valid dan password tidak kosong. Penekanan tombol "Masuk" mengaktifkan state loading (`isLoading = true`) dan memproteksi tombol dari double-click.
4. **Langkah 4:** Sistem memanggil `supabase.auth.signInWithPassword()`. Jika kredensial cocok, `authStore.login()` mengisi session token, memuat role via RPC `get_user_role`, memuat permission via RPC `get_user_effective_permissions`, serta menginisialisasi organisasi paroki aktif (`useCompanyStore`).
5. **Langkah 5:** Route middleware mengevaluasi status:
   - Jika akun berstatus non-aktif (`is_active: false`), sesi langsung diputus dan diarahkan kembali ke `/login`.
   - Jika akun memiliki bendera `force_password_change = true`, pengguna dicegat dan diarahkan ke `/change-password`.
   - Jika peran adalah `admin` atau `super_admin`, diarahkan ke `/admin`.
   - Jika peran adalah `cashier`, diarahkan ke `/pos`.

---

## 4. Keputusan Bisnis & Aturan Keamanan yang Relevan

> [!IMPORTANT]
> Seluruh alur pengujian wajib mematuhi aturan baku keamanan dan RBAC repositori:

1. **Keamanan Kredensial & Sandi:**
   - Panjang kata sandi baru minimal **6 karakter**.
   - Kata sandi baru tidak boleh sama dengan kata sandi saat ini (`currentPassword !== newPassword`).
   - Seluruh input sandi menggunakan komponen `AppInput` dengan proteksi toggle visibilitas sandi.
2. **Isolasi Akses & Pencegahan Akses Ilegal (RBAC):**
   - Kasir **DILARANG KERAS** membuka rute administratif (`/admin/*`). Route guard `admin.ts` dan `permission.ts` mencegat akses URL langsung dan me-redirect ke `/pos` dengan toast peringatan.
   - Pengguna dengan bendera `force_password_change = true` wajib mengganti sandi sebelum dapat membuka rute lain.
   - Akun dengan status `is_active = false` dilarang masuk dan sesinya otomatis diterminasi.
3. **Isolasi Multi-Tenant & Sesi:**
   - Setiap sesi login terikat pada paroki/tenant aktif (`company_id`). Header `X-Company-Id` otomatis disematkan pada seluruh request API administratif.
4. **Pemulihan Sandi (Self-Service Recovery):**
   - Tautan pemulihan email diarahkan ke `/reset-password?code=...` dan dieksekusi via `exchangeCodeForSession(code)` sebelum memperbarui sandi pengguna.

---

## 5. Jejak Arsitektur & Dependensi Teknis

| Komponen | Identitas / Path | Deskripsi & Peran |
|---|---|---|
| **Rute Frontend** | `/login`, `/change-password`, `/reset-password` | Halaman UI autentikasi dan ganti sandi |
| **File Sumber UI** | `app/pages/login.vue`, `app/pages/change-password.vue`, `app/pages/reset-password.vue` | Komponen Vue 3 SFC (`<script setup lang="ts">`) |
| **Route Middleware** | `app/middleware/auth.ts`, `app/middleware/admin.ts`, `app/middleware/permission.ts` | Route guard autentikasi, force password redirect, dan izin RBAC |
| **Pinia Store** | `app/stores/auth.ts`, `app/stores/company.ts` | Manajemen state in-memory auth, role, permission, dan active tenant |
| **Komponen UI Primitives**| `app/components/ui/AppInput.vue`, `app/components/ui/AppButton.vue`, `app/components/ui/AppToast.vue` | Komponen visual form dan notifikasi |
| **Supabase Client & RPC** | `supabase.auth`, RPC `get_user_role`, RPC `get_user_effective_permissions` | Autentikasi Supabase & prosedur otorisasi database |
| **Tabel Terkait** | `auth.users`, `public.company_users`, `public.user_roles`, `public.roles`, `public.permissions` | Skema database RBAC dengan Row-Level Security (RLS) |

---

## 6. Batasan Ruang Lingkup (Scope Boundaries)

### 6.1 Dalam Cakupan (In-Scope)
- Pengujian fungsionalitas UI pada rute `/login`, `/change-password`, dan `/reset-password` (Desktop & Mobile PWA 375px).
- Validasi email dan password, pencegahan submission ganda (*double submit*), dan feedback visual error toast.
- Pengujian pengalihan rute berbasis peran (*role-based redirect*) ke `/pos` vs `/admin`.
- Pengujian intersep penggantian sandi sementara (*force password change*).
- Pengujian pencegahan akses ilegal (*route guard*) saat kasir mengakses rute administratif secara langsung.
- Pengujian penukaran token recovery di `/reset-password`.

### 6.2 Di Luar Cakupan (Out-of-Scope)
- Pengujian provisi akun pengguna baru oleh admin (dicakup di `F-14: User Management`).
- Pengujian pembuatan dynamic role dan permission catalog (dicakup di `F-16: Dynamic Roles & Permissions`).
- Pengujian server SMTP pengiriman email nyata (pengujian recovery token menggunakan staging/mock link).

---

## 7. Kriteria Penerimaan Inti (Acceptance Criteria Rujukan)

- [ ] **AC-01 (Skenario 1.1):** Login Berhasil & Redirect Sesuai Role (Kasir ke `/pos`, Admin ke `/admin`).
- [ ] **AC-02 (Skenario 1.2):** Force Password Change Intercept (Akun sementara dipaksa ke `/change-password`).
- [ ] **AC-03 (Skenario 1.3):** Pencegahan Akses Tak Berhak (Kasir mencoba membuka rute `/admin/*` di-redirect ke `/pos`).
- [ ] **AC-04:** Penanganan Error Kredensial Salah & Akun Non-Aktif.
- [ ] **AC-05:** Validasi Form Ganti Sandi (Minimal 6 Karakter, Tidak Sama dengan Sandi Lama, Konfirmasi Cocok).

---

## 8. Status Review & Persetujuan

- [ ] **Feature Brief Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)
