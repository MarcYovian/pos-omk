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
