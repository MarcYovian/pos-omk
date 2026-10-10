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
