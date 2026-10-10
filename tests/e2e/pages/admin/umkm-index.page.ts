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
