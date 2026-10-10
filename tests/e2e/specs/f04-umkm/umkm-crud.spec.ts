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
