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
