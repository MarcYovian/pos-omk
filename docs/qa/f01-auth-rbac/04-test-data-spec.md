# Spesifikasi Data Test (Test Data Spec): Authentication & Role-Based Access Control (RBAC) (F-01)

> **Dokumen Tahap 5/9 — Perencanaan & Manajemen Data Uji**  
> *Fungsi: Mendefinisikan dataset awal, kondisi prasyarat database, akun pengujian per peran, metode pembuatan data (setup), dan pembersihan data (cleanup) guna menjamin pengujian bersifat deterministik dan terisolasi.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-01` |
| **Nama Fitur** | `Authentication & Role-Based Access Control (RBAC)` |
| **Lingkup Tenant (`company_id`)**| `Test Parish St. Yohanes (ID: test-parish-st-yohanes)` |
| **Zona Waktu Uji** | `Asia/Jakarta (WIB / UTC+7)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-ui-cataloger-skill)` |

---

## 2. Matriks Akun Uji Peran (Test Persona Accounts)

Untuk memvalidasi seluruh skenario pengujian secara deterministik, digunakan akun-akun pengujian standar berikut:

| ID Persona | Peran (`role`) | Email Akun Uji | Password Awal | Status Akun (`is_active`) | Flag Force Change | Ekspektasi Tujuan Setelah Login |
|---|---|---|---|---|---|---|
| **PER-01** | `cashier` | `cashier-standard@parish.test` | `KasirPass123!` | `true` | `false` | `/pos` |
| **PER-02** | `admin` | `admin-parish@parish.test` | `AdminPass123!` | `true` | `false` | `/admin` |
| **PER-03** | `super_admin` | `superadmin@omkpos.test` | `SuperPass123!` | `true` | `false` | `/admin` |
| **PER-04** | `cashier` | `cashier-temp@parish.test` | `TempPass123!` | `true` | `true` | Dicegat ke `/change-password` |
| **PER-05** | `cashier` | `cashier-disabled@parish.test` | `DisabledPass123!`| `false` | `false` | Ditolak login / Sesi diputus |
| **PER-06** | `unregistered`| `unknown-user@parish.test` | `AnyPassword123!`| N/A | N/A | Ditolak login ("Email atau password salah") |

---

## 3. Dataset Uji Formulir & Kasus Validasi

### 3.1 Dataset Validasi Login (`/login`)
| Kasus Uji | Input Email | Input Password | Ekspektasi Pesan Error / Respon |
|---|---|---|---|
| **Format Email Salah** | `bukan-email-valid` | `KasirPass123!` | Validasi HTML5 browser (`type="email"`) memblokir submit |
| **Password Salah** | `cashier-standard@parish.test` | `PasswordSalah123!` | Label form & Toast: "Email atau password salah" |
| **Email Tidak Terdaftar** | `tidak-ada@parish.test` | `PasswordSalah123!` | Label form & Toast: "Email atau password salah" |
| **Kredensial Valid** | `cashier-standard@parish.test` | `KasirPass123!` | Toast: "Login berhasil!", Navigasi ke `/pos` |

### 3.2 Dataset Validasi Ganti Kata Sandi (`/change-password`)
| Kasus Uji | Sandi Saat Ini | Sandi Baru | Konfirmasi Sandi | Ekspektasi Respon |
|---|---|---|---|---|
| **Kolom Kosong** | `KasirPass123!` | `""` | `""` | Toast Peringatan: "Harap isi semua kolom" |
| **Sandi < 6 Karakter** | `KasirPass123!` | `12345` | `12345` | Toast Peringatan: "Kata sandi baru minimal harus 6 karakter" |
| **Konfirmasi Tidak Cocok**| `KasirPass123!` | `BaruPass123!` | `BedaPass123!` | Toast Peringatan: "Konfirmasi kata sandi tidak cocok" |
| **Sandi Baru = Sandi Lama**| `KasirPass123!` | `KasirPass123!` | `KasirPass123!` | Toast Peringatan: "Kata sandi baru tidak boleh sama dengan kata sandi saat ini" |
| **Sandi Lama Salah** | `SalahPass123!` | `BaruPass123!` | `BaruPass123!` | Toast Bahaya: "Password saat ini salah" |
| **Valid & Berhasil** | `TempPass123!` | `BaruSukses123!` | `BaruSukses123!` | Toast Sukses: "Kata sandi berhasil diperbarui!", redirect ke role home |

### 3.3 Dataset Pemulihan Kata Sandi (`/reset-password`)
| Kasus Uji | URL Param `code` | Sandi Baru | Konfirmasi Sandi | Ekspektasi Respon |
|---|---|---|---|---|
| **Token Kedaluwarsa** | `code=token-expired-999` | `NewPass123!` | `NewPass123!` | Toast Bahaya: "Sesi reset sandi tidak valid atau telah kedaluwarsa." |
| **Token Valid & Sukses**| `code=token-valid-123` | `NewPass123!` | `NewPass123!` | Toast Sukses: "Kata sandi berhasil diperbarui!", redirect ke role home |

---

## 4. Kondisi Prasyarat Database & Multi-Tenant

1. **Relasi Tenant Paroki:**
   - Seluruh akun uji terdaftar pada paroki St. Yohanes (`company_id: test-parish-st-yohanes`).
   - Tabel `public.company_users` memetakan `user_id` ke `test-parish-st-yohanes`.
2. **Metadata Supabase Auth (`raw_user_meta_data`):**
   - Field `role`: disetel sesuai `cashier`, `admin`, atau `super_admin`.
   - Field `is_active`: boolean `true` atau `false`.
   - Field `force_password_change`: boolean `true` atau `false`.
3. **Data Role & Permissions di Database:**
   - Role `cashier` memiliki relasi permission `pos:transact`.
   - Role `admin` memiliki permission administratif (`products:manage`, `session:manage`, `cashflow:view`, dll).

---

## 5. Prosedur Setup & Cleanup (Pembersihan Data)

### 5.1 Skrip Setup Pra-Pengujian (Pre-Test Fixture)
Sebelum rangkaian pengujian otomatis dijalankan, pastikan kredensial akun uji berada dalam kondisi baseline:
```sql
-- Reset password akun sementara ke baseline
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{force_password_change}', 'true')
WHERE email = 'cashier-temp@parish.test';

-- Pastikan akun disabled tetap false
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{is_active}', 'false')
WHERE email = 'cashier-disabled@parish.test';
```

### 5.2 Skrip Pembersihan Pasca-Pengujian (Teardown)
Setelah tes ganti kata sandi selesai, kembalikan password akun uji ke kata sandi standar untuk menjaga determinisme pengujian berikutnya:
```typescript
// Teardown hook via Supabase Admin / Playwright fixture
await supabaseAdmin.auth.admin.updateUserById(tempUserId, {
  password: 'TempPass123!',
  user_metadata: { force_password_change: true }
});
```

---

## 6. Status Review & Persetujuan

- [ ] **Spesifikasi Data Test Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)
