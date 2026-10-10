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
