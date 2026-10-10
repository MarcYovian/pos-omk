import { test as base, expect, Page } from '@playwright/test';

/**
 * Custom Fixtures for Role-Based Access Control
 */
type AuthFixtures = {
  cashierPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixtures>({
  cashierPage: async ({ page }, use) => {
    // Navigate to login and authenticate as Cashier
    await page.goto('/login');
    await page.fill('input[type="email"], [data-testid="f01-email-input"]', 'cashier-standard@parish.test');
    await page.fill('input[type="password"], [data-testid="f01-password-input"]', 'KasirPass123!');
    await page.click('button[type="submit"]:has-text("Masuk"), [data-testid="f01-login-submit-btn"]');
    await expect(page).toHaveURL(/\/pos/, { timeout: 8000 });
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    // Navigate to login and authenticate as Admin
    await page.goto('/login');
    await page.fill('input[type="email"], [data-testid="f01-email-input"]', 'admin-st-yohanes@parish.test');
    await page.fill('input[type="password"], [data-testid="f01-password-input"]', 'AdminPass123!');
    await page.click('button[type="submit"]:has-text("Masuk"), [data-testid="f01-login-submit-btn"]');
    await expect(page).toHaveURL(/\/admin/, { timeout: 8000 });
    await use(page);
  },
});

export { expect };
