import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage — Foundation Page Object for OMK POS
 * Provides universal assertions for toasts, modals, route changes, and mobile ergonomics.
 */
export class BasePage {
  readonly page: Page;
  readonly toastContainer: Locator;
  readonly modalContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    // Dual-strategy toast selector
    this.toastContainer = page.locator('[data-testid="app-toast"], .fixed.bottom-4.right-4, .toast');
    this.modalContainer = page.locator('[data-testid="app-modal"], [role="dialog"]');
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async expectToast(messagePattern: string | RegExp): Promise<void> {
    const toast = this.page.locator(`text=${messagePattern}`);
    await expect(toast).toBeVisible({ timeout: 5000 });
  }

  async expectUrl(expectedUrl: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(expectedUrl, { timeout: 5000 });
  }

  async verifyTouchTargetSize(locator: Locator, minSize: number = 48): Promise<void> {
    const box = await locator.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(minSize);
      expect(box.width).toBeGreaterThanOrEqual(minSize);
    }
  }
}
