# Pertanyaan dan Asumsi: Authentication & Role-Based Access Control (RBAC) (F-01)

> **Dokumen Tahap 2/9 — Klarifikasi Kebutuhan & Pencatatan Asumsi**  
> *Fungsi: Mencatat hal-hal ambigu, perilaku tepi (edge case), batas toleransi sistem, atau detail UI yang belum tertulis di PRD agar diverifikasi dan disetujui sebelum penulisan test case.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-01` |
| **Nama Fitur** | `Authentication & Role-Based Access Control (RBAC)` |
| **Status Klarifikasi** | `IN REVIEW` |
| **Terakhir Diperbarui** | `2026-10-10` |
| **QA Engineer** | `Senior QA Automation Team (qa-spec-and-scenario-skill)` |
| **Pemberi Keputusan** | `Product Owner & Tech Lead OMK POS` |

---

## 2. Matriks Pertanyaan (Questions) & Asumsi (Assumptions)

| ID | Jenis | Pertanyaan / Asumsi | Kategori | Sumber | Dampak ke Testing / Risiko | Status | Jawaban / Keputusan Resmi | Tanggal Respon |
|---|---|---|---|---|---|---|---|---|
| **Q-01** | Pertanyaan | Bagaimana penanganan jika pengguna yang sedang memiliki sesi aktif di browser dinonaktifkan (`is_active = false`) oleh admin di tengah jalan? | Resiliensi Akses | PRD F-01 & F-14 | Risiko celah akses unauthorized jika token masih valid | `Terjawab` | Route middleware `auth.ts` memeriksa `user.user_metadata.is_active` pada setiap navigasi; jika false, sistem langsung memanggil `authStore.logout()` dan mengarahkan ke `/login`. | `2026-10-10` |
| **Q-02** | Pertanyaan | Apakah ada mekanisme rate limiting atau proteksi brute force jika seseorang mencoba password salah berulang kali di form login? | Keamanan Infrastruktur | Supabase Auth Specs | Mencegah crash auth endpoint dan serangan kredensial | `Terjawab` | Ditangani secara native oleh Supabase Auth rate limiter (mengembalikan error status 429 jika melampaui ambang batas). | `2026-10-10` |
| **Q-03** | Pertanyaan | Bagaimana respon sistem jika kasir mencoba membuka link langsung `/admin/dashboard` di address bar browser? | Otorisasi & Routing | PRD AC-03 | Memastikan tidak ada data sensitif admin yang bocor | `Terjawab` | Route guard `admin.ts` / `permission.ts` mencegat navigasi, memblokir render halaman admin, dan mengarahkan kembali ke `/pos`. | `2026-10-10` |
| **Q-04** | Pertanyaan | Bagaimana flow pemulihan kata sandi jika link reset dibuka setelah token kedaluwarsa? | Siklus Sesi | PRD F-01 Recovery | UX error handling pada landing reset | `Terjawab` | Method `exchangeCodeForSession(code)` menghasilkan error, komponen menangkapnya dan menampilkan toast bahaya "Sesi reset sandi tidak valid atau telah kedaluwarsa". | `2026-10-10` |
| **A-01** | Asumsi | Asumsi: Tombol submit ("Masuk" dan "Perbarui Kata Sandi") otomatis dinonaktifkan (`disabled` + spinner loading) selama proses asinkron berlangsung untuk mencegah submission ganda (*double submit*). | UI/UX & Integritas | Standar AGENTS.md | Mencegah bug race condition auth di pengujian otomatis | `Disetujui` | Terkonfirmasi pada komponen `AppButton` (`:loading="isLoading"`). | `2026-10-10` |
| **A-02** | Asumsi | Asumsi: Peran (`role`) dan hak akses (`permissions`) pengguna dimuat via RPC database `get_user_role` dan di-cache di client-side Pinia store (`useAuthStore`) selama 60 detik untuk efisiensi jaringan. | Arsitektur State | Implementasi Pinia Store | Memastikan pengujian izin rute konsisten dan deterministik | `Disetujui` | Sesuai implementasi `authStore.fetchUserPermissions`. | `2026-10-10` |
| **A-03** | Asumsi | Asumsi: Validasi kata sandi baru (minimal 6 karakter, tidak boleh sama dengan kata sandi lama, dan konfirmasi cocok) divalidasi langsung di sisi klien sebelum request update dikirim ke server. | Integritas Form | UX Best Practice | Mengurangi round-trip jaringan yang tidak perlu | `Disetujui` | Terkonfirmasi pada logika `handleSubmit` di `change-password.vue`. | `2026-10-10` |

---

## 3. Log Keputusan Arsitektur & Bisnis (Decision Log)

### 3.1 Keputusan #[DEC-01]: Penegakan Force Password Change (Sandi Sementara)
- **Rujukan ID:** `A-03`, `PRD AC-02`
- **Isi Keputusan:** Setiap akun kasir baru yang dibuatkan oleh administrator dengan bendera `force_password_change = true` wajib diarahkan ke rute `/change-password` segera setelah login pertama berhasil. Seluruh rute lain (termasuk `/pos`) wajib diblokir hingga kata sandi baru tersimpan.
- **Dampak pada Desain Pengujian:** Skenario pengujian P0 wajib memvalidasi upaya bypass rute saat `needsPasswordChange = true` dan memastikan pengguna tidak bisa keluar dari halaman ganti sandi sebelum berhasil submit.

### 3.2 Keputusan #[DEC-02]: Perlindungan Berlapis Rute Administratif (Layered Route Guards)
- **Rujukan ID:** `Q-03`, `PRD AC-03`
- **Isi Keputusan:** Seluruh rute di bawah direktori `/admin/*` dilindungi secara ketat oleh middleware `admin.ts` dan `permission.ts`. Pengguna dengan peran kasir (`cashier`) tanpa izin administratif khusus dilarang melihat komponen admin dan otomatis dikembalikan ke `/pos`.
- **Dampak pada Desain Pengujian:** Skenario keamanan P0 wajib menguji navigasi langsung via URL browser maupun manipulasi link DOM.

---

## 4. Status Review & Kesiapan Melangkah ke Tahap Berikutnya

- [ ] **Semua Pertanyaan Kritis Terjawab:** `YA`
- [ ] **Semua Asumsi Utama Dikonfirmasi:** `YA`
- [ ] **Diberikan Izin Lanjut ke 02-test-scenarios.md:** `(Tanda Tangan / Persetujuan User: ________)`
