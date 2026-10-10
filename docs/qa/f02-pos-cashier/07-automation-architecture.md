# Arsitektur Test Automation: Real-time POS Cashier Screen (F-02)

> **Dokumen Tahap 8/9 — Blueprint Arsitektur & Standar Kode Automation**  
> *Fungsi: Menetapkan arsitektur pengujian otomatis, pola Page Object Model (POM), konvensi penamaan, pengelolaan status autentikasi/multi-tenant, dan strategi fixture sebelum penulisan kode Playwright dimulai.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-02` |
| **Nama Fitur** | `Real-time POS Cashier Screen` |
| **Framework Utama** | `Playwright Test (^1.45+) + TypeScript (^5.4+)` |
| **Pola Desain** | `Page Object Model (POM) + Test Fixtures` |
| **Runner Lingkungan** | `Chromium (Desktop & Mobile Emulation 375×667)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-test-case-and-runner-skill)` |

---

## 2. Struktur Direktori Automation

```
tests/e2e/
├── fixtures/
│   ├── auth.fixture.ts          # State login kasir via storageState (.auth/cashier.json)
│   ├── tenant.fixture.ts        # Injeksi header X-Company-Id: test-parish-st-yohanes
│   └── session.fixture.ts       # Hook buka sesi dan seed produk uji
├── pages/
│   ├── base.page.ts             # Base Page Object (toast, modal global)
│   └── f02.page.ts          # Page Object spesifik Real-time POS Cashier Screen
├── specs/
│   └── f02/
│       ├── f02-happy-path.spec.ts   # Skenario TC-01 (P0)
│       ├── f02-validation.spec.ts   # Skenario TC-02, TC-03 (P0-P1)
│       └── f02-offline-pwa.spec.ts  # Skenario TC-04, TC-05 (P1-P2)
└── utils/
    └── rpc-client.ts            # Helper bypass data setup via RPC Supabase
```

---

## 3. Blueprint Page Object Model (POM): `f02.page.ts`

```typescript
import { type Page, type Locator, expect } from '@playwright/test';

export class F02Page {
  readonly page: Page;

  // Locators
  readonly searchInput: Locator;
  readonly checkoutButton: Locator;
  readonly cashTab: Locator;
  readonly qrisTab: Locator;
  readonly submitButton: Locator;
  readonly successToast: Locator;

  constructor(page: Page) {
    this.page = page;
    // Dual-strategy locators: testid with semantic fallbacks
    this.searchInput = page.getByTestId('f02-searchQuery-input')
      .or(page.getByPlaceholder('Cari produk...'));
    this.checkoutButton = page.getByTestId('f02-cart-checkout-btn')
      .or(page.getByRole('button', { name: /bayar/i }));
    this.cashTab = page.getByTestId('f02-payment-cash-tab')
      .or(page.getByRole('button', { name: /tunai|cash/i }));
    this.qrisTab = page.getByTestId('f02-payment-qris-tab')
      .or(page.getByRole('button', { name: /qris/i }));
    this.submitButton = page.getByTestId('f02-checkout-submit-btn')
      .or(page.getByRole('button', { name: /selesaikan/i }));
    this.successToast = page.getByTestId('app-toast')
      .or(page.locator('.pos-success-overlay, .toast'));
  }

  async goto() {
    await this.page.goto('/pos');
    await this.page.waitForLoadState('networkidle');
  }

  async searchProduct(keyword: string) {
    await this.searchInput.fill(keyword);
    await this.page.waitForTimeout(300); // Debounce buffer
  }

  async addProductToCart(productName: string) {
    const card = this.page.locator('.pos-product-card', { hasText: productName });
    await expect(card).toBeVisible();
    await card.click();
  }

  async openCheckout() {
    await this.checkoutButton.click();
  }

  async payWithPreset(amountString: string) {
    const preset = this.page.getByRole('button', { name: amountString });
    await preset.click();
  }

  async submitPayment() {
    await this.submitButton.click();
  }

  async expectSuccess() {
    await expect(this.successToast).toBeVisible({ timeout: 5000 });
  }
}
```

---

## 4. Konfigurasi Autentikasi & Multi-Tenancy

```typescript
// tests/e2e/specs/f02/f02-happy-path.spec.ts
import { test, expect } from '@playwright/test';
import { F02Page } from '../../pages/f02.page';

test.use({
  storageState: '.auth/cashier.json',
  extraHTTPHeaders: {
    'X-Company-Id': 'test-parish-st-yohanes'
  }
});

test.describe('Real-time POS Cashier Screen (F-02)', () => {
  test('should complete cash checkout and update stock atomically', async ({ page }) => {
    const posPage = new F02Page(page);
    await posPage.goto();
    await posPage.searchProduct('Puding');
    await posPage.addProductToCart('Puding Cokelat');
    await posPage.openCheckout();
    await posPage.payWithPreset('20.000');
    await posPage.submitPayment();
    await posPage.expectSuccess();
  });
});
```

---

## 5. Perintah Eksekusi Pengujian (Execution Commands)

```bash
# Jalankan test spec fitur ini di headless mode
npx playwright test tests/e2e/specs/f02

# Jalankan dalam mode visual UI interaktif
npx playwright test tests/e2e/specs/f02 --ui

# Jalankan dengan emulasi mobile viewport
npx playwright test tests/e2e/specs/f02 --project="Mobile Chrome"

# Tampilkan laporan eksekusi HTML
npx playwright show-report
```

---

## 6. Status Review & Persetujuan

- [ ] **Arsitektur Automation & POM Disetujui:** `YA / BELUM`
