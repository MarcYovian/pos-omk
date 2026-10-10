# Arsitektur Test Automation: [NAMA_FITUR] ([KODE_FITUR])

> **Dokumen Tahap 8/9 — Blueprint Arsitektur & Standar Kode Automation**  
> *Fungsi: Menetapkan arsitektur pengujian otomatis, pola Page Object Model (POM), konvensi penamaan, pengelolaan status autentikasi/multi-tenant, dan strategi fixture sebelum penulisan kode Playwright dimulai.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `[F-XX / KODE_FITUR]` |
| **Nama Fitur** | `[Nama Fitur Lengkap]` |
| **Framework Utama** | `Playwright Test (^1.45+) + TypeScript (^5.4+)` |
| **Pola Desain** | `Page Object Model (POM) + Test Fixtures` |
| **Runner Lingkungan** | `Chromium (Desktop & Mobile Emulation)` |
| **Status Dokumen** | `DRAFT / IN REVIEW / APPROVED` |
| **QA Engineer** | `[Nama QA / Agent]` |

---

## 2. Struktur Direktori Automation

```
tests/e2e/
├── fixtures/
│   ├── auth.fixture.ts          # State login kasir, admin, super_admin via storageState
│   ├── tenant.fixture.ts        # Injeksi header X-Company-Id dan context paroki aktif
│   └── database.fixture.ts      # Helper seed dan cleanup transaksi uji
├── pages/
│   ├── base.page.ts             # Base Page Object (navigasi, toast, dialog global)
│   └── [fitur].page.ts          # Page Object spesifik untuk fitur ini
├── specs/
│   └── [fitur]/
│       ├── [fitur]-happy-path.spec.ts    # Skenario positif utama (P0)
│       ├── [fitur]-validation.spec.ts    # Skenario negatif dan validasi form (P1)
│       └── [fitur]-edge-cases.spec.ts    # Skenario batas, konkurensi, offline (P1-P2)
└── utils/
    ├── api-client.ts            # Helper API/RPC untuk bypass UI saat data setup
    └── date-helpers.ts          # Generator waktu Jakarta (WIB) yang konsisten
```

---

## 3. Konvensi Penamaan & Standar Kode

### 3.1 Konvensi File & Folder
- **File Page Object:** `app/pages/[fitur].page.ts` (kebab-case dengan ekstensi `.page.ts`).
- **File Test Spec:** `tests/e2e/specs/[fitur]/[fitur]-[kategori].spec.ts`.
- **Nama Kelas POM:** PascalCase berakhiran `Page` (contoh: `PosCashierPage`, `UmkmManagementPage`).

### 3.2 Konvensi Penulisan Test Block
- Gunakan pola deskripsi `test.describe('Fitur: [Nama Fitur]', () => { ... })`.
- Gunakan kalimat aksi yang diawali dengan `"should ..."` dalam bahasa Inggris yang konsisten:
  ```typescript
  test('should complete cash checkout and update stock atomically', async ({ posPage }) => {
    // ...
  });

  test('should display validation error when payment amount is insufficient', async ({ posPage }) => {
    // ...
  });
  ```

### 3.3 Hierarki Selektor Elemen
Wajib menggunakan hierarki selektor berikut secara berurutan:
1. `page.getByTestId('[fitur]-[nama]-[aksi]')` *(Sangat disarankan)*
2. `page.getByRole('button', { name: '...' })`
3. `page.getByLabel('...')`
4. `page.getByPlaceholder('...')`
5. `page.getByText('...')` *(Hanya untuk assert teks, dilarang untuk klik)*

---

## 4. Blueprint Page Object Model (POM)

```typescript
import { type Page, type Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class FeaturePage extends BasePage {
  readonly page: Page;
  
  // Locators
  readonly searchInput: Locator;
  readonly addItemButton: Locator;
  readonly submitButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    super(page);
    this.page = page;
    this.searchInput = page.getByTestId('[fitur]-search-input');
    this.addItemButton = page.getByTestId('[fitur]-add-btn');
    this.submitButton = page.getByTestId('[fitur]-submit-btn');
    this.successToast = page.getByTestId('app-toast');
  }

  async goto() {
    await this.page.goto('/[route-fitur]');
    await this.waitForPageReady();
  }

  async searchItem(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.waitForTimeout(300); // Debounce buffer
  }

  async submitAction() {
    await this.submitButton.click();
  }

  async expectSuccessToast(message: string) {
    await expect(this.successToast).toBeVisible();
    await expect(this.successToast).toContainText(message);
  }
}
```

---

## 5. Manajemen Autentikasi & Multi-Tenancy

### 5.1 Storage State (Bypass Login Berulang)
Untuk efisiensi eksekusi, state login disimpan ke dalam file JSON temporer:
- Kasir: `.auth/cashier.json`
- Admin Paroki: `.auth/admin.json`
- Super Admin: `.auth/super_admin.json`

### 5.2 Injeksi Header Multi-Tenant
Setiap request jaringan otomatis menginjeksi header paroki aktif:
```typescript
test.use({
  extraHTTPHeaders: {
    'X-Company-Id': process.env.TEST_COMPANY_ID || 'test-parish-st-yohanes',
  },
});
```

---

## 6. Standar Asersi & Pencegahan Flakiness

1. **Web-First Assertions:** Selalu gunakan asersi asinkronus bawaan Playwright (`await expect(locator).toBeVisible()`), BUKAN `expect(await locator.isVisible()).toBe(true)`.
2. **Hindari Hard Sleep:** DILARANG menggunakan `await page.waitForTimeout(5000)`. Gunakan event-based waiting seperti `await page.waitForResponse(...)` atau `await expect(locator).toHaveCount(n)`.
3. **Pembersihan State Bersih:** Setiap suite pengujian wajib menjamin state database kembali seperti semula menggunakan hook `afterAll` atau RPC `reset_session`.

---

## 7. Perintah Eksekusi (Run Commands)

```bash
# Jalankan seluruh test untuk fitur ini (Headless)
npx playwright test tests/e2e/specs/[fitur]

# Jalankan dalam mode UI interaktif (Visual Debugging)
npx playwright test tests/e2e/specs/[fitur] --ui

# Jalankan dengan emulasi perangkat mobile (PWA Cashier Viewport)
npx playwright test tests/e2e/specs/[fitur] --project="Mobile Chrome"

# Tampilkan laporan hasil uji dan trace viewer jika gagal
npx playwright show-report
npx playwright show-trace test-results/.../trace.zip
```

---

## 8. Status Review & Persetujuan

- [ ] **Arsitektur Automation Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)  
*Catatan: Jangan mulai menulis kode test spec jika arsitektur dan konvensi ini belum disetujui.*
