# Katalog Elemen (Locator Inventory): Authentication & Role-Based Access Control (RBAC) (F-01)

> **Dokumen Tahap 6/9 — Inventaris Lokator & Selektor Elemen UI**  
> *Fungsi: Sumber kebenaran tunggal (*Single Source of Truth*) untuk lokator elemen antarmuka yang stabil dan tahan terhadap perubahan styling CSS/DOM. Mengimplementasikan strategi Dual-Strategy Locator (Resilient Semantic Fallback + Rekomendasi Patch Developer).*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-01` |
| **Nama Fitur** | `Authentication & Role-Based Access Control (RBAC)` |
| **Prefix Selektor Baku** | `f01-` |
| **Strategi Lokator** | `Dual-Strategy (Semantic Fallback Ready + Developer Patch)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-ui-cataloger-skill)` |

---

## 2. Strategi Selektor & Penanganan Ketiadaan `data-testid`

Karena sebagian besar elemen Vue saat ini belum memiliki atribut `data-testid`, pengujian **TIDAK DIBLOKIR**. Kita menerapkan strategi dua lapis:

### 2.1 Hierarki Selektor Segera (Fallback Siap Pakai)
1. **Prioritas 1 (Resilient ARIA / Role):** `page.getByRole('button', { name: 'Masuk' })`
2. **Prioritas 2 (Label / Placeholder):** `page.getByPlaceholder('nama@email.com')`, `page.getByLabel('Kata Sandi')`
3. **Prioritas 3 (Text Content):** `page.getByText('Email atau password salah')`
4. **Dilarang Keras:** Menggunakan XPath absolut atau class Tailwind yang dinamis.

### 2.2 Standar Konvensi Nama `data-testid`
Format Baku: `f01-[nama-elemen]-[tipe/aksi]`
- `[data-testid="f01-email-input"]`
- `[data-testid="f01-password-input"]`
- `[data-testid="f01-login-submit-btn"]`
- `[data-testid="f01-login-error-text"]`
- `[data-testid="f01-current-password-input"]`
- `[data-testid="f01-new-password-input"]`
- `[data-testid="f01-confirm-password-input"]`
- `[data-testid="f01-change-password-submit-btn"]`

---

## 3. Inventaris Lokator Elemen (Element Catalog Table)

| Halaman / Komponen | Nama Elemen | Rekomendasi Selector (`data-testid`) | Fallback Selector Siap Pakai | Tipe | Status di UI | Aksi yang Didukung |
|---|---|---|---|---|---|---|
| **Login (`/login`)** | Input Email | `[data-testid="f01-email-input"]` | `input[type="email"], input[placeholder*="email"]` | input | `Perlu Patch` | `fill(), clear()` |
| **Login (`/login`)** | Input Kata Sandi | `[data-testid="f01-password-input"]` | `input[type="password"]` | input | `Perlu Patch` | `fill(), clear()` |
| **Login (`/login`)** | Tombol Masuk | `[data-testid="f01-login-submit-btn"]` | `button[type="submit"]:has-text("Masuk")` | button | `Perlu Patch` | `click()` |
| **Login (`/login`)** | Pesan Error Form | `[data-testid="f01-login-error-text"]` | `.text-danger:has-text("Email atau password salah")` | text | `Perlu Patch` | `toBeVisible()` |
| **Ganti Sandi (`/change-password`)** | Sandi Saat Ini | `[data-testid="f01-current-password-input"]` | `input[placeholder*="saat ini"]` | input | `Perlu Patch` | `fill(), clear()` |
| **Ganti Sandi (`/change-password`)** | Sandi Baru | `[data-testid="f01-new-password-input"]` | `input[placeholder*="Min. 6"]` | input | `Perlu Patch` | `fill(), clear()` |
| **Ganti Sandi (`/change-password`)** | Konfirmasi Sandi | `[data-testid="f01-confirm-password-input"]` | `input[placeholder*="ulang kata sandi baru"]` | input | `Perlu Patch` | `fill(), clear()` |
| **Ganti Sandi (`/change-password`)** | Tombol Simpan Sandi | `[data-testid="f01-change-password-submit-btn"]`| `button[type="submit"]:has-text("Perbarui Kata Sandi")` | button | `Perlu Patch` | `click()` |
| **Reset Sandi (`/reset-password`)** | Sandi Baru Reset | `[data-testid="f01-reset-new-password-input"]` | `input[placeholder*="Min. 6"]` | input | `Perlu Patch` | `fill(), clear()` |
| **Reset Sandi (`/reset-password`)** | Konfirmasi Reset | `[data-testid="f01-reset-confirm-password-input"]`| `input[placeholder*="ulang kata sandi"]` | input | `Perlu Patch` | `fill(), clear()` |
| **Reset Sandi (`/reset-password`)** | Tombol Simpan Reset | `[data-testid="f01-reset-submit-btn"]` | `button[type="submit"]:has-text("Perbarui Kata Sandi")` | button | `Perlu Patch` | `click()` |
| **Feedback Global** | Toast Notifikasi | `[data-testid="app-toast"]` | `.fixed.bottom-4.right-4, .toast` | toast | `Sudah Ada (AppToast)` | `toBeVisible()` |

---

## 4. Rekomendasi Patch `data-testid` untuk Developer (Action Items)

Daftar rekomendasi atribut `data-testid` yang disarankan untuk ditambahkan ke kode sumber Vue oleh developer guna meningkatkan ketahanan uji otomatis:

### 4.1 Patch `app/pages/login.vue`
```diff
@@ -75,6 +75,7 @@
         <AppInput
           v-model="email"
           label="Email"
           type="email"
           placeholder="nama@email.com"
+          data-testid="f01-email-input"
           required
         />
         
         <AppInput
           v-model="password"
           label="Kata Sandi"
           type="password"
           placeholder="••••••••"
+          data-testid="f01-password-input"
           required
         />

-       <div v-if="errorMessage" class="text-xs text-danger font-semibold text-center mt-2">
+       <div v-if="errorMessage" data-testid="f01-login-error-text" class="text-xs text-danger font-semibold text-center mt-2">
           {{ errorMessage }}
         </div>

         <AppButton
           type="submit"
           :loading="isLoading"
           full-width
+          data-testid="f01-login-submit-btn"
           class="mt-4"
         >
           Masuk
         </AppButton>
```

### 4.2 Patch `app/pages/change-password.vue`
```diff
@@ -89,6 +89,7 @@
         <AppInput
           v-model="currentPassword"
           label="Kata Sandi Saat Ini"
           type="password"
           placeholder="Masukkan password saat ini"
+          data-testid="f01-current-password-input"
           required
         />

         <AppInput
           v-model="newPassword"
           label="Kata Sandi Baru"
           type="password"
           placeholder="Min. 6 karakter"
+          data-testid="f01-new-password-input"
           required
         />

         <AppInput
           v-model="confirmPassword"
           label="Konfirmasi Kata Sandi Baru"
           type="password"
           placeholder="Masukkan ulang kata sandi baru"
+          data-testid="f01-confirm-password-input"
           required
         />

         <AppButton
           type="submit"
           :loading="isSubmitting"
           full-width
+          data-testid="f01-change-password-submit-btn"
           class="mt-2"
         >
           Perbarui Kata Sandi
         </AppButton>
```

---

## 5. Status Review & Persetujuan

- [ ] **Katalog Elemen Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)
