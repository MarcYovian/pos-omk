# Arsitektur Test Automation: UMKM Partner Master Data Management (F-04)

> **Dokumen Tahap 8/9 — Blueprint Arsitektur & Standar Kode Automation**  
> *Fungsi: Menetapkan arsitektur pengujian otomatis, pola Page Object Model (POM), konvensi penamaan, pengelolaan status autentikasi/multi-tenant, dan strategi fixture sebelum penulisan kode Playwright dimulai.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-04` |
| **Nama Fitur** | `UMKM Partner Master Data Management` |
| **Framework Utama** | `Playwright Test (^1.45+) + TypeScript (^5.4+)` |
| **Pola Desain** | `Page Object Model (POM) + Test Fixtures` |
| **Runner Lingkungan** | `Chromium (Desktop 1280×800 & Mobile PWA 375×667)` |
| **Status Dokumen** | `IN REVIEW` |
| **QA Engineer** | `Senior QA Automation Team (qa-test-case-and-runner-skill)` |

---

## 2. Struktur Direktori Automation

```
tests/e2e/
├── fixtures/
│   ├── auth.fixture.ts            # Penyimpan StorageState autentikasi per peran
│   ├── tenant.fixture.ts          # Injeksi header X-Company-Id test-parish-st-yohanes
│   └── database.fixture.ts        # Setup / teardown seed data mitra & produk uji
├── pages/
│   ├── base.page.ts               # Base Page Object (asert toast, wait loader)
│   ├── admin/
│   │   ├── umkm-index.page.ts     # Page Object direktori mitra (/admin/umkm)
│   │   ├── umkm-detail.page.ts    # Page Object detail & katalog (/admin/umkm/[id])
│   │   └── modals/
│   │       ├── umkm-form.modal.ts # Modal pendaftaran & edit mitra UMKM
│   │       └── product-form.modal.ts # Modal pendaftaran & edit produk master
└── specs/
    └── f04-umkm/
        ├── umkm-crud.spec.ts          # TC-01, TC-03, TC-06, TC-09, TC-11
        ├── product-catalog.spec.ts    # TC-02, TC-04, TC-07, TC-08, TC-10
        ├── route-guard.spec.ts        # TC-05: Proteksi rute admin dari kasir
        └── mobile-responsive.spec.ts  # TC-12: Ergonomi sentuh & viewport 375px
```

---

## 3. Blueprint Page Object Model (POM)

### 3.1 `UmkmIndexPage` (`tests/e2e/pages/admin/umkm-index.page.ts`)
```typescript
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class UmkmIndexPage extends BasePage {
  readonly searchInput: Locator;
  readonly addUmkmButton: Locator;
  readonly umkmGrid: Locator;
  readonly toastContainer: Locator;

  constructor(page: Page) {
    super(page);
    // Dual-strategy locators: data-testid dengan fallback semantik
    this.searchInput = page.locator('[data-testid="f04-search-umkm-input"], input[placeholder*="Cari nama mitra"]');
    this.addUmkmButton = page.locator('[data-testid="f04-add-umkm-btn"], button:has-text("Tambah UMKM")');
    this.umkmGrid = page.locator('.grid');
    this.toastContainer = page.locator('[data-testid="app-toast"], .fixed.bottom-4.right-4');
  }

  async goto() {
    await this.page.goto('/admin/umkm');
    await this.page.waitForLoadState('networkidle');
  }

  getUmkmCard(namaUmkm: string): Locator {
    return this.page.locator(`div.group:has-text("${namaUmkm}")`);
  }

  async searchUmkm(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(200); // debounce reaktif
  }

  async openAddModal() {
    await this.addUmkmButton.click();
  }

  async openEditModal(namaUmkm: string) {
    const card = this.getUmkmCard(namaUmkm);
    await card.locator('button[title="Edit UMKM"]').click();
  }

  async copyPublicLink(namaUmkm: string) {
    const card = this.getUmkmCard(namaUmkm);
    await card.locator('button[title="Salin Link Performa"]').click();
  }

  async navigateToCatalog(namaUmkm: string) {
    const card = this.getUmkmCard(namaUmkm);
    await card.locator('a:has-text("Katalog Master"), button:has-text("Katalog Master")').click();
    await this.page.waitForURL(/\/admin\/umkm\/[a-zA-Z0-9-]+/);
  }

  async expectStatusBadge(namaUmkm: string, expectedStatus: 'Aktif' | 'Nonaktif') {
    const card = this.getUmkmCard(namaUmkm);
    const badge = card.locator('span.uppercase');
    await expect(badge).toContainText(expectedStatus);
  }
}
```

### 3.2 `UmkmDetailPage` (`tests/e2e/pages/admin/umkm-detail.page.ts`)
```typescript
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class UmkmDetailPage extends BasePage {
  readonly backButton: Locator;
  readonly tabCatalog: Locator;
  readonly tabPerformance: Locator;
  readonly addProductButton: Locator;
  readonly productGrid: Locator;
  readonly totalSoldMetric: Locator;
  readonly totalRemittanceMetric: Locator;

  constructor(page: Page) {
    super(page);
    this.backButton = page.locator('[data-testid="f04-back-btn"], a[href="/admin/umkm"]');
    this.tabCatalog = page.locator('[data-testid="f04-tab-catalog-btn"], button:has-text("Katalog Master")');
    this.tabPerformance = page.locator('[data-testid="f04-tab-performance-btn"], button:has-text("Statistik Performa")');
    this.addProductButton = page.locator('[data-testid="f04-add-product-btn"], button:has-text("Tambah Produk")');
    this.productGrid = page.locator('.grid');
    this.totalSoldMetric = page.locator('[data-testid="f04-perf-sold-metric"], h3.font-mono:has-text("pcs")');
    this.totalRemittanceMetric = page.locator('[data-testid="f04-perf-remit-metric"], h3.font-mono.text-brand-950');
  }

  getProductCard(namaProduk: string): Locator {
    return this.page.locator(`div.group:has-text("${namaProduk}")`);
  }

  async switchTab(tab: 'catalog' | 'performance') {
    if (tab === 'catalog') {
      await this.tabCatalog.click();
    } else {
      await this.tabPerformance.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async openAddProductModal() {
    await this.addProductButton.click();
  }

  async openEditProductModal(namaProduk: string) {
    const card = this.getProductCard(namaProduk);
    await card.locator('button[title="Edit Produk"]').click();
  }

  async deleteProduct(namaProduk: string) {
    const card = this.getProductCard(namaProduk);
    this.page.once('dialog', dialog => dialog.accept());
    await card.locator('button[title="Hapus Produk"]').click();
  }

  async expectProductCost(namaProduk: string, expectedFormattedCost: string) {
    const card = this.getProductCard(namaProduk);
    await expect(card.locator('span.font-mono.tabular-nums')).toContainText(expectedFormattedCost);
  }
}
```

---

## 4. Injeksi Multi-Tenant & Autentikasi Fixtures

```typescript
// tests/e2e/fixtures/tenant.fixture.ts
import { test as baseTest } from '@playwright/test';

export const test = baseTest.extend<{ companyId: string }>({
  companyId: async ({}, use) => {
    // Tenant baku untuk pengujian otomatis
    await use('d0000000-0000-0000-0000-000000000001');
  },
  page: async ({ page, companyId }, use) => {
    // Intersep seluruh HTTP request ke Supabase & Nitro untuk injeksi X-Company-Id
    await page.route('**/*', async (route) => {
      const headers = {
        ...route.request().headers(),
        'x-company-id': companyId,
      };
      await route.continue({ headers });
    });

    // Injeksi omk_active_company_id ke localStorage
    await page.addInitScript((cid) => {
      window.localStorage.setItem('omk_active_company_id', cid);
    }, companyId);

    await use(page);
  },
});
```

---

## 5. Blueprint Spesifikasi Pengujian (Playwright Spec Scaffolding)

```typescript
// tests/e2e/specs/f04-umkm/umkm-crud.spec.ts
import { test } from '../../fixtures/tenant.fixture';
import { expect } from '@playwright/test';
import { UmkmIndexPage } from '../../pages/admin/umkm-index.page';

test.describe('F-04: Master Data UMKM CRUD & Validasi', () => {
  let umkmPage: UmkmIndexPage;

  test.beforeEach(async ({ page }) => {
    umkmPage = new UmkmIndexPage(page);
    await umkmPage.goto();
  });

  test('TC-01: Pendaftaran Mitra Baru dengan Data Valid (P0)', async ({ page }) => {
    const uniqueName = `Mitra Uji ${Date.now()}`;
    await umkmPage.openAddModal();

    await page.fill('label:has-text("Nama UMKM") ~ div input', uniqueName);
    await page.fill('label:has-text("Nomor WhatsApp") ~ div input', '6281234567899');
    await page.click('button:has-text("Simpan")');

    await expect(page.locator('.fixed.bottom-4.right-4')).toContainText('Mitra UMKM berhasil terdaftar');
    await expect(umkmPage.getUmkmCard(uniqueName)).toBeVisible();
    await umkmPage.expectStatusBadge(uniqueName, 'Aktif');
  });

  test('TC-06: Validasi Format WhatsApp Wajib Diawali 62 (P1)', async ({ page }) => {
    await umkmPage.openAddModal();
    await page.fill('label:has-text("Nama UMKM") ~ div input', 'Format Salah');
    await page.fill('label:has-text("Nomor WhatsApp") ~ div input', '081234567890');
    await page.click('button:has-text("Simpan")');

    await expect(page.locator('.fixed.bottom-4.right-4')).toContainText('Nomor WhatsApp harus diawali dengan kode negara 62');
  });

  test('TC-03: Soft-Deactivation Mitra UMKM & Status Nonaktif (P0)', async ({ page }) => {
    const targetUmkm = 'Dapur Santo Yosef';
    await umkmPage.openEditModal(targetUmkm);

    // Klik toggle aktif
    await page.click('button:has(span.rounded-full)');
    await page.click('button:has-text("Simpan Perubahan")');

    await expect(page.locator('.fixed.bottom-4.right-4')).toContainText('Detail mitra UMKM berhasil diperbarui');
    await umkmPage.expectStatusBadge(targetUmkm, 'Nonaktif');
  });
});
```

---

## 6. Standar Kualitas Asersi & Anti-Flakiness

1. **Auto-Waiting Locators:** Dilarang keras menggunakan `page.waitForTimeout(5000)`. Wajib mengandalkan web-first assertions seperti `expect(locator).toBeVisible()` dan `page.waitForLoadState('networkidle')`.
2. **Clipboard Mocking:** Saat menguji fitur salin link (TC-09), inject `navigator.clipboard.readText()` permission menggunakan browser context grant:
   ```typescript
   await context.grantPermissions(['clipboard-read', 'clipboard-write']);
   ```
3. **Dialog Confirmation Handler:** Handler `dialog.accept()` wajib didaftarkan sebelum tombol hapus diklik untuk mencegah proses blocking dialog modal browser.
