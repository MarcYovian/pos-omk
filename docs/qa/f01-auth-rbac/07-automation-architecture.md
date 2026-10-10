# Arsitektur Test Automation: Authentication & Role-Based Access Control (RBAC) (F-01)

> **Dokumen Tahap 8/9 — Blueprint Arsitektur & Standar Kode Automation**  
> *Fungsi: Menetapkan arsitektur pengujian otomatis, pola Page Object Model (POM), konvensi penamaan, pengelolaan status autentikasi/multi-tenant, dan strategi fixture sebelum penulisan kode Playwright dimulai.*

---

## 1. Metadata Dokumen

| Atribut | Nilai |
|---|---|
| **ID Fitur** | `F-01` |
| **Nama Fitur** | `Authentication & Role-Based Access Control (RBAC)` |
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
│   ├── auth.fixture.ts          # StorageState per role (kasir, admin, super_admin)
│   ├── tenant.fixture.ts        # Injeksi header X-Company-Id test-parish-st-yohanes
│   └── database.fixture.ts      # Setup / teardown kredensial & flag akun uji
├── pages/
│   ├── base.page.ts             # Base Page Object (toast assertion, URL wait)
│   ├── login.page.ts            # Page Object form login (/login)
│   ├── change-password.page.ts  # Page Object form ganti sandi (/change-password)
│   └── reset-password.page.ts   # Page Object form reset sandi (/reset-password)
└── specs/
    └── f01-auth/
        ├── login-happy-path.spec.ts     # TC-01 & TC-02: Login sukses kasir & admin
        ├── login-validation.spec.ts     # TC-03 & TC-04: Kredensial salah & akun nonaktif
        ├── force-password-change.spec.ts# TC-05, TC-06, TC-07: Intersep & ganti sandi
        ├── route-guard-rbac.spec.ts     # TC-08: Proteksi rute admin dari kasir
        └── reset-password.spec.ts       # TC-09: Token recovery flow
```

---

## 3. Blueprint Page Object Model (POM)

### 3.1 `LoginPage` (`tests/e2e/pages/login.page.ts`)
```typescript
import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly toastContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    // Dual-strategy: data-testid dengan fallback semantik
    this.emailInput = page.locator('[data-testid="f01-email-input"], input[type="email"]');
    this.passwordInput = page.locator('[data-testid="f01-password-input"], input[type="password"]');
    this.submitButton = page.locator('[data-testid="f01-login-submit-btn"], button[type="submit"]:has-text("Masuk")');
    this.errorMessage = page.locator('[data-testid="f01-login-error-text"], .text-danger');
    this.toastContainer = page.locator('[data-testid="app-toast"], .fixed.bottom-4.right-4');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, pass: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(pass);
    await this.submitButton.click();
  }

  async expectLoginError(expectedText = 'Email atau password salah') {
    await expect(this.errorMessage).toContainText(expectedText);
    await expect(this.toastContainer).toContainText(expectedText);
  }

  async expectRedirectTo(pathRegex: RegExp | string) {
    await this.page.waitForURL(pathRegex);
  }
}
```

### 3.2 `ChangePasswordPage` (`tests/e2e/pages/change-password.page.ts`)
```typescript
import { Page, Locator, expect } from '@playwright/test';

export class ChangePasswordPage {
  readonly page: Page;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly toastContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.currentPasswordInput = page.locator('[data-testid="f01-current-password-input"], input[placeholder*="saat ini"]');
    this.newPasswordInput = page.locator('[data-testid="f01-new-password-input"], input[placeholder*="Min. 6"]');
    this.confirmPasswordInput = page.locator('[data-testid="f01-confirm-password-input"], input[placeholder*="ulang kata sandi baru"]');
    this.submitButton = page.locator('[data-testid="f01-change-password-submit-btn"], button[type="submit"]:has-text("Perbarui Kata Sandi")');
    this.toastContainer = page.locator('[data-testid="app-toast"], .fixed.bottom-4.right-4');
  }

  async fillForm(currentPass: string, newPass: string, confirmPass: string) {
    await this.currentPasswordInput.fill(currentPass);
    await this.newPasswordInput.fill(newPass);
    await this.confirmPasswordInput.fill(confirmPass);
  }

  async submit() {
    await this.submitButton.click();
  }

  async expectToastWarning(message: string) {
    await expect(this.toastContainer).toContainText(message);
  }

  async expectSuccessToast(message = 'Kata sandi berhasil diperbarui!') {
    await expect(this.toastContainer).toContainText(message);
  }
}
```

---

## 4. Blueprint Test Spec (Playwright Spec Examples)

### 4.1 Spec Login & Role Redirection (`login-happy-path.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';

test.describe('F-01: Authentication & Role-Based Access Control (RBAC)', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('TC-01: should login successfully as cashier and navigate to /pos', async () => {
    await loginPage.login('cashier-standard@parish.test', 'KasirPass123!');
    await loginPage.expectRedirectTo(/\/pos/);
  });

  test('TC-02: should login successfully as admin and navigate to /admin', async () => {
    await loginPage.login('admin-parish@parish.test', 'AdminPass123!');
    await loginPage.expectRedirectTo(/\/admin/);
  });

  test('TC-03: should show error feedback when entering wrong credentials', async () => {
    await loginPage.login('cashier-standard@parish.test', 'PasswordSalahTotal123!');
    await loginPage.expectLoginError('Email atau password salah');
  });
});
```

### 4.2 Spec Route Guard RBAC Protection (`route-guard-rbac.spec.ts`)
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../../pages/login.page';

test.describe('F-01: RBAC Route Guard Enforcement', () => {
  test('TC-08: should prevent cashier from accessing /admin and redirect back to /pos', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('cashier-standard@parish.test', 'KasirPass123!');
    await page.waitForURL(/\/pos/);

    // Kasir mencoba membuka dashboard admin langsung
    await page.goto('/admin/dashboard');

    // Route guard admin.ts wajib mencegat dan mengarahkan kembali ke /pos
    await page.waitForURL(/\/pos/);
    expect(page.url()).toContain('/pos');
  });
});
```

---

## 5. Standar Asersi & Praktik Terbaik Anti-Flaky

1. **Gunakan Web-First Assertions:**
   - Selalu gunakan `await expect(locator).toBeVisible()` atau `await expect(page).toHaveURL()`. Hindari `sleep()` atau `waitForTimeout()`.
2. **Penanganan Toast Asinkron:**
   - Berikan toleransi timeout pada asersi toast hingga 5000ms untuk mengakomodasi round-trip Supabase Auth.
3. **Isolasi State Penyimpanan:**
   - Setiap spec file dijalankan dalam konteks browser yang bersih (`browser.newContext()`) untuk menghindari residu token sesi antar-uji.

---

## 6. Status Review & Persetujuan

- [ ] **Arsitektur Test Automation Disetujui Pengguna / Lead:** (Tanggal: `________`, Reviewer: `________`)
