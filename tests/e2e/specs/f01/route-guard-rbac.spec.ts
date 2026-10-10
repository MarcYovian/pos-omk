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
