# Test Scenarios (Test Plan): Authentication & Role-Based Access Control (RBAC) (F-01)

> **Dokumen Tahap 3/9 — Rencana Pengujian & Daftar Skenario**  
> *Fungsi: Memetakan seluruh skenario pengujian dengan format Given-When-Then, menetapkan prioritas risiko (P0-P3), serta mengelompokkan skenario positif, negatif, edge-case, dan konkurensi sebelum penulisan test case terperinci.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-01` |
| **Nama Fitur** | `Authentication & Role-Based Access Control (RBAC)` |
| **Total Skenario** | `11 Skenario` |
| **Rasio Prioritas** | `P0: 6 | P1: 4 | P2: 1 | P3: 0` |
| **Target Cakupan** | `UI E2E + Pinia Auth Store State + Supabase Auth & RPC Integrity` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |

---

## 2. Definisi Skala Prioritas & Tipe Uji

| Prioritas | Kriteria | Toleransi Rilis |
|---|---|---|
| **P0 (Critical)** | Autentikasi kredensial utama, redirect berbasis peran, penegakan force password change, isolasi rute admin (route guards), akun non-aktif. | Zero tolerance; blokir rilis jika gagal. |
| **P1 (High)** | Validasi form login & ganti sandi, penanganan kredensial salah, error toast feedback, alur pemulihan sandi via token. | Harus lulus sebelum staging rilis. |
| **P2 (Medium)** | Ergonomi form sentuh mobile 375px, toggle lihat/sembunyikan sandi, transisi visual non-kritis. | Dapat diperbaiki pada patch minor. |
| **P3 (Low)** | Estetika visual minor, whitespace, animasi logo. | Tidak menghambat rilis. |

---

## 3. Daftar Skenario Pengujian (Given-When-Then)

| ID | Skenario Pengujian (Given-When-Then) | Tipe | Prioritas | Sumber / Rujukan | Status Automasi |
|---|---|---|---|---|---|
| **S-01** | **Given** Pengguna dengan role `cashier` dan status aktif (`is_active: true`) berada di halaman `/login`<br>**When** Memasukkan email dan password yang valid lalu menekan tombol "Masuk"<br>**Then** Sistem melakukan autentikasi via Supabase Auth, memuat role `cashier`, menginisialisasi tenant paroki aktif, dan mengarahkan pengguna ke `/pos` | Positif | P0 | PRD Skenario 1.1 | Candidate (Playwright) |
| **S-02** | **Given** Pengguna dengan role `admin` dan status aktif berada di halaman `/login`<br>**When** Memasukkan email dan password yang valid lalu menekan tombol "Masuk"<br>**Then** Sistem melakukan autentikasi via Supabase Auth, memuat role `admin`, menginisialisasi tenant paroki aktif, dan mengarahkan pengguna ke `/admin` | Positif | P0 | PRD Skenario 1.1 | Candidate (Playwright) |
| **S-03** | **Given** Pengguna dengan role `super_admin` berada di halaman `/login`<br>**When** Memasukkan email dan password yang valid lalu menekan tombol "Masuk"<br>**Then** Sistem melakukan autentikasi, memuat role `super_admin` dengan platform bypass, dan mengarahkan pengguna ke `/admin` | Positif | P0 | PRD Skenario 1.1 | Candidate (Playwright) |
| **S-04** | **Given** Pengguna berada di halaman `/login`<br>**When** Memasukkan email terdaftar namun password salah, lalu menekan tombol "Masuk"<br>**Then** Sistem menolak autentikasi, menampilkan pesan error teks "Email atau password salah", memunculkan toast bahaya, dan pengguna tetap berada di `/login` | Negatif | P1 | PRD F-01 Error State | Candidate (Playwright) |
| **S-05** | **Given** Akun pengguna telah dinonaktifkan oleh administrator (`is_active = false`)<br>**When** Pengguna mencoba login dengan kredensial email dan password yang cocok<br>**Then** Route guard `auth.ts` mendeteksi status non-aktif, mengeksekusi `authStore.logout()`, memutus sesi, dan mengembalikan pengguna ke `/login` | Keamanan / RBAC | P0 | PRD F-01 / Guard Rule | Candidate (Playwright) |
| **S-06** | **Given** Akun kasir baru dibuat dengan bendera `force_password_change = true`<br>**When** Pengguna berhasil login menggunakan password sementara<br>**Then** Route guard `auth.ts` mencegat navigasi dan secara otomatis me-redirect pengguna ke `/change-password`, memblokir akses ke `/pos` atau rute lainnya | Keamanan / RBAC | P0 | PRD Skenario 1.2 | Candidate (Playwright) |
| **S-07** | **Given** Pengguna terautentikasi berada di halaman `/change-password`<br>**When** Memasukkan password saat ini dengan benar, password baru valid (>= 6 karakter), dan konfirmasi sandi cocok lalu menekan "Perbarui Kata Sandi"<br>**Then** Sistem mengupdate sandi di Supabase Auth, menghapus bendera force change, memunculkan toast sukses, dan mengarahkan pengguna ke halaman home perannya | Positif | P1 | PRD Skenario 1.2 | Candidate (Playwright) |
| **S-08** | **Given** Pengguna berada di halaman `/change-password`<br>**When** Memasukkan password baru kurang dari 6 karakter ATAU konfirmasi kata sandi tidak cocok ATAU password baru sama dengan password lama<br>**Then** Sistem membatalkan submit di sisi klien, menampilkan toast peringatan terkait, dan form tidak dikirim ke server | Negatif / Validasi | P1 | Form Guard F-01 | Candidate (Playwright) |
| **S-09** | **Given** Pengguna login sebagai `cashier` dan sedang berada di `/pos`<br>**When** Pengguna mencoba mengetikkan URL administratif `/admin` atau `/admin/dashboard` secara langsung di browser<br>**Then** Route guard `admin.ts` / `permission.ts` memblokir akses, menolak perenderan tampilan admin, dan mengembalikan kasir ke `/pos` | Keamanan / RBAC | P0 | PRD Skenario 1.3 | Candidate (Playwright) |
| **S-10** | **Given** Pengguna menerima tautan reset password dan mendarat di `/reset-password?code=VALID_CODE`<br>**When** Memasukkan password baru dan konfirmasi password yang valid lalu menekan "Perbarui Kata Sandi"<br>**Then** Sesi ditukarkan via `exchangeCodeForSession()`, sandi diperbarui, toast sukses muncul, dan pengguna diarahkan ke rute perannya | Positif | P1 | PRD F-01 Recovery | Candidate (Playwright) |
| **S-11** | **Given** Viewport pengujian diatur pada ukuran mobile 375×667px (iPhone SE)<br>**When** Pengguna berinteraksi dengan field input dan tombol submit pada halaman `/login` dan `/change-password`<br>**Then** Seluruh area sentuh memenuhi standar ergonomi minimal 48×48px (`min-h-touch min-w-touch`) dan tombol toggle visibilitas password berfungsi baik | Ergonomi & UI | P2 | UI/UX Spec 4.1 | Candidate (Playwright) |

---

## 4. Matriks Cakupan Pengujian (Coverage Matrix)

### 4.1 Cakupan Berdasarkan Peran (Role Coverage)
| Peran (Role) | Target Skenario | Skenario Terkait |
|---|---|---|
| **Kasir (`cashier`)** | Login normal, redirect ke `/pos`, force password change, ganti sandi mandiri | S-01, S-06, S-07, S-08, S-11 |
| **Admin Paroki (`admin`)** | Login admin, redirect ke `/admin`, akses manajemen | S-02, S-07, S-08 |
| **Super Admin (`super_admin`)** | Login super admin, bypass izin administratif | S-03 |
| **Unauthorized / Kasir di Admin** | Proteksi route guard terhadap pembajakan URL admin | S-09 |
| **Akun Non-Aktif / Tamu** | Penolakan akun deaktif, kegagalan kredensial, reset sandi via token | S-04, S-05, S-10 |

### 4.2 Cakupan Berdasarkan Viewport & Jaringan
| Kondisi / Viewport | Perilaku yang Divalidasi | Skenario Terkait |
|---|---|---|
| **Desktop (1280×800)** | Tampilan form terpusat kartu modal, responsivitas navigasi instan | S-01, S-02, S-03, S-09 |
| **Mobile PWA (375×667)** | Area sentuh 48×48px, keyboard virtual friendly, toggle intip sandi | S-11 |
| **Rate Limiter / Offline** | Penanganan kegagalan koneksi saat handshake autentikasi | S-04, S-05 |

---

## 5. Keterlacakan ke Acceptance Criteria (Traceability Matrix)

| Acceptance Criteria (PRD) | Skenario Teruji | Status Keterpenuhan |
|---|---|---|
| `PRD Skenario 1.1 (Login & Role Redirect)` | `S-01`, `S-02`, `S-03` | `Tercakup Lengkap` |
| `PRD Skenario 1.2 (Force Password Change)` | `S-06`, `S-07`, `S-08` | `Tercakup Lengkap` |
| `PRD Skenario 1.3 (Route Guard RBAC)` | `S-09` | `Tercakup Lengkap` |
| `PRD F-01 Error Handling (Kredensial Salah)` | `S-04` | `Tercakup Lengkap` |
| `PRD F-01 Akun Deaktif (is_active: false)` | `S-05` | `Tercakup Lengkap` |
| `PRD F-01 Pemulihan Sandi (/reset-password)` | `S-10` | `Tercakup Lengkap` |
| `UI/UX Spec 4.1 (Mobile Touch Ergonomics)` | `S-11` | `Tercakup Lengkap` |

---

## 6. Status Review & Persetujuan

- [ ] **Semua Skenario Kritis (P0) Disetujui:** `YA / BELUM`
- [ ] **Distribusi Prioritas & Tipe Uji Seimbang:** `YA / BELUM`
- [ ] **Diberikan Izin Lanjut ke 03-screen-flow.md:** `(Tanda Tangan / Persetujuan User: ________)`
