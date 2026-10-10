# Test Cases Detail: Authentication & Role-Based Access Control (RBAC) (F-01)

> **Dokumen Tahap 7/9 — Prosedur Uji Terperinci & Spesifikasi Audit**  
> *Fungsi: Menjabarkan langkah demi langkah pengujian (*step-by-step*), data masukan, verifikasi visual, mutasi state, serta respons jaringan/database untuk tiap skenario. Dokumen ini menjadi rujukan utama bagi tester manual maupun engineer automation.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-01` |
| **Nama Fitur** | `Authentication & Role-Based Access Control (RBAC)` |
| **Total Test Case** | `9 Test Case Terperinci` |
| **Cakupan Pengujian** | `Autentikasi UI, Route Guards RBAC, Force Password Change, Recovery Token, State Pinia` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-test-case-and-runner-skill)` |

---

## 2. Rincian Test Case (Detailed Test Cases)

---

### TC-01: Login Kasir Berhasil & Navigasi ke `/pos` (Happy Path)
- **ID Skenario Terkait:** `S-01`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Positif / Happy Path`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Akun kasir terdaftar dengan email `cashier-standard@parish.test` dan status `is_active: true`, `force_password_change: false`.
2. Browser berada di halaman `/login` tanpa sesi aktif.

#### Data Uji yang Digunakan:
- Email: `cashier-standard@parish.test`
- Password: `KasirPass123!`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Buka halaman login | `page.goto('/login')` | Navigasi URL |
| 2 | Masukkan alamat email kasir | `input[type="email"]` | Ketik `cashier-standard@parish.test` |
| 3 | Masukkan kata sandi kasir | `input[type="password"]` | Ketik `KasirPass123!` |
| 4 | Klik tombol submit login | `button[type="submit"]:has-text("Masuk")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Tombol "Masuk" menampilkan status loading dan cursor not-allowed.
  - Toast sukses melayang muncul: `"Login berhasil!"`.
  - Halaman otomatis berpindah ke `/pos`.
- **State Store (Pinia):**
  - `authStore.role` bernilai `'cashier'`.
  - `authStore.isAdmin` bernilai `false`.
  - `authStore.user` terisi objek user Supabase aktif.
- **Jaringan / Backend:**
  - Request `POST /auth/v1/token?grant_type=password` mengembalikan status `200 OK`.

---

### TC-02: Login Administrator Paroki Berhasil & Navigasi ke `/admin`
- **ID Skenario Terkait:** `S-02`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Positif / Happy Path`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Akun admin paroki terdaftar dengan email `admin-parish@parish.test` dan status aktif.
2. Browser berada di halaman `/login` tanpa sesi aktif.

#### Data Uji yang Digunakan:
- Email: `admin-parish@parish.test`
- Password: `AdminPass123!`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Buka halaman login | `page.goto('/login')` | Navigasi URL |
| 2 | Masukkan alamat email admin | `input[type="email"]` | Ketik `admin-parish@parish.test` |
| 3 | Masukkan kata sandi admin | `input[type="password"]` | Ketik `AdminPass123!` |
| 4 | Klik tombol submit login | `button[type="submit"]:has-text("Masuk")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Toast sukses melayang muncul: `"Login berhasil!"`.
  - Halaman otomatis berpindah ke `/admin` (dashboard manajemen).
- **State Store (Pinia):**
  - `authStore.role` bernilai `'admin'`.
  - `authStore.isAdmin` bernilai `true`.

---

### TC-03: Login Gagal dengan Kredensial Salah
- **ID Skenario Terkait:** `S-04`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Negatif / Error Handling`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Browser berada di halaman `/login`.

#### Data Uji yang Digunakan:
- Email: `cashier-standard@parish.test`
- Password: `PasswordSalahTotal123!`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Buka halaman login | `page.goto('/login')` | Navigasi URL |
| 2 | Masukkan email valid | `input[type="email"]` | Ketik `cashier-standard@parish.test` |
| 3 | Masukkan password salah | `input[type="password"]` | Ketik `PasswordSalahTotal123!` |
| 4 | Klik tombol submit login | `button[type="submit"]:has-text("Masuk")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Pesan teks merah muncul di bawah form: `"Email atau password salah"`.
  - Toast merah tipe bahaya muncul: `"Email atau password salah"`.
  - Pengguna tetap berada di halaman `/login`.
- **State Store (Pinia):**
  - `authStore.user` bernilai `null`.
  - `authStore.role` bernilai `null`.

---

### TC-04: Penolakan Login Akun Dinonaktifkan (`is_active = false`)
- **ID Skenario Terkait:** `S-05`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Keamanan / RBAC`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Akun pengguna terdaftar namun memiliki `is_active: false` di user metadata.

#### Data Uji yang Digunakan:
- Email: `cashier-disabled@parish.test`
- Password: `DisabledPass123!`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Buka halaman login | `page.goto('/login')` | Navigasi URL |
| 2 | Masukkan email akun non-aktif | `input[type="email"]` | Ketik `cashier-disabled@parish.test` |
| 3 | Masukkan password | `input[type="password"]` | Ketik `DisabledPass123!` |
| 4 | Klik tombol submit login | `button[type="submit"]:has-text("Masuk")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Route guard `auth.ts` langsung memutus sesi dan menahan navigasi di `/login`.
  - Pengguna dilarang masuk ke `/pos` maupun `/admin`.
- **State Store (Pinia):**
  - Sesi diputus via `authStore.logout()`, token dibersihkan dari storage.

---

### TC-05: Force Password Change Intercept & Navigasi ke `/change-password`
- **ID Skenario Terkait:** `S-06`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Keamanan / RBAC`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Akun kasir baru dibuat dengan bendera `force_password_change = true`.

#### Data Uji yang Digunakan:
- Email: `cashier-temp@parish.test`
- Password: `TempPass123!`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Buka halaman login | `page.goto('/login')` | Navigasi URL |
| 2 | Masukkan kredensial akun baru | `input[type="email"]`, `input[type="password"]` | Isi email & temp password |
| 3 | Klik tombol Masuk | `button[type="submit"]:has-text("Masuk")` | Klik tombol |
| 4 | Pantau respon navigasi | Browser URL bar | URL dialihkan otomatis |
| 5 | Coba navigasi manual ke `/pos` | `page.goto('/pos')` | Navigasi URL langsung |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Pengguna dialihkan otomatis ke `/change-password`.
  - Upaya navigasi paksa ke `/pos` tetap dicegat oleh `auth.ts` dan dilempar kembali ke `/change-password`.
- **State Store (Pinia):**
  - `authStore.needsPasswordChange` bernilai `true`.

---

### TC-06: Pembaruan Kata Sandi Mandiri Berhasil di `/change-password`
- **ID Skenario Terkait:** `S-07`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Positif / Happy Path`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Pengguna berada di halaman `/change-password` dalam kondisi terautentikasi.

#### Data Uji yang Digunakan:
- Password Saat Ini: `TempPass123!`
- Password Baru: `BaruSukses123!`
- Konfirmasi Password: `BaruSukses123!`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Masukkan kata sandi saat ini | `input[placeholder*="saat ini"]` | Ketik `TempPass123!` |
| 2 | Masukkan kata sandi baru | `input[placeholder*="Min. 6"]` | Ketik `BaruSukses123!` |
| 3 | Masukkan konfirmasi sandi | `input[placeholder*="ulang"]` | Ketik `BaruSukses123!` |
| 4 | Klik tombol submit | `button[type="submit"]:has-text("Perbarui Kata Sandi")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Toast hijau sukses: `"Kata sandi berhasil diperbarui!"`.
  - Halaman otomatis dialihkan ke `/pos` (atau `/admin` sesuai peran).
- **State Store (Pinia):**
  - `authStore.passwordChangeCompleted` bernilai `true`.
  - `authStore.needsPasswordChange` bernilai `false`.

---

### TC-07: Validasi Formulir Ganti Kata Sandi (Panjang Minimal & Konfirmasi Cocok)
- **ID Skenario Terkait:** `S-08`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Negatif / Validasi Form`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Pengguna berada di halaman `/change-password`.

#### Data Uji yang Digunakan:
- Kasus A (Kurang dari 6 karakter): Sandi baru `12345`
- Kasus B (Konfirmasi tidak cocok): Sandi baru `Valid123!`, Konfirmasi `Beda123!`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Isi sandi saat ini | `input[placeholder*="saat ini"]` | Ketik sandi saat ini |
| 2 | Isi sandi baru pendek (5 huruf) | `input[placeholder*="Min. 6"]` | Ketik `12345` |
| 3 | Isi konfirmasi sama | `input[placeholder*="ulang"]` | Ketik `12345` |
| 4 | Klik tombol submit | `button[type="submit"]` | Klik tombol |
| 5 | Ganti konfirmasi menjadi tidak cocok | `input[placeholder*="ulang"]` | Ketik `BedaKarakter!` |
| 6 | Klik tombol submit | `button[type="submit"]` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Pada langkah 4: Toast peringatan muncul: `"Kata sandi baru minimal harus 6 karakter"`.
  - Pada langkah 6: Toast peringatan muncul: `"Konfirmasi kata sandi tidak cocok"`.
  - Tidak ada panggilan API updateUser yang dikirim ke Supabase.

---

### TC-08: Proteksi Akses Route Guard Admin oleh Kasir (`/admin` -> `/pos`)
- **ID Skenario Terkait:** `S-09`
- **Prioritas:** `P0 (Critical)`
- **Tipe Uji:** `Keamanan / RBAC Route Guard`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Pengguna login sebagai `cashier` dan sedang berada di `/pos`.

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Coba navigasi ke dashboard admin | `page.goto('/admin/dashboard')` | Input URL langsung di browser |
| 2 | Pantau URL browser setelah guard | Browser URL address bar | Evaluasi redirect |
| 3 | Periksa DOM halaman | `body` | Verifikasi komponen admin |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Middleware `admin.ts` / `permission.ts` mencegat akses.
  - Browser URL dialihkan seketika kembali ke `/pos`.
  - Tidak ada data tabel atau dashboard admin yang sempat bocor atau dirender di DOM.

---

### TC-09: Setel Ulang Kata Sandi via Recovery Token di `/reset-password`
- **ID Skenario Terkait:** `S-10`
- **Prioritas:** `P1 (High)`
- **Tipe Uji:** `Positif / Recovery Flow`
- **Tingkat Otomasi:** `Playwright Automated`

#### Prasyarat (Preconditions):
1. Pengguna menerima URL tautan pemulihan dengan token valid.

#### Data Uji yang Digunakan:
- URL: `/reset-password?code=VALID_RECOVERY_CODE_123`
- Sandi Baru: `SandiBaruReset123!`

#### Langkah-langkah Pengujian (Test Steps):
| No | Aksi Pengguna (User Action) | Target Elemen / Locator | Input / Interaksi |
|---|---|---|---|
| 1 | Buka URL pemulihan | `page.goto('/reset-password?code=VALID_RECOVERY_CODE_123')` | Navigasi URL |
| 2 | Masukkan sandi baru | `input[placeholder*="Min. 6"]` | Ketik `SandiBaruReset123!` |
| 3 | Masukkan konfirmasi sandi | `input[placeholder*="ulang"]` | Ketik `SandiBaruReset123!` |
| 4 | Klik tombol submit | `button[type="submit"]:has-text("Perbarui Kata Sandi")` | Klik tombol |

#### Hasil yang Diharapkan (Expected Result):
- **Tampilan UI:**
  - Toast hijau sukses muncul: `"Kata sandi berhasil diperbarui!"`.
  - Halaman otomatis dialihkan ke home role pengguna.

---

## 3. Status Review & Persetujuan

- [ ] **Test Cases Terperinci Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)
