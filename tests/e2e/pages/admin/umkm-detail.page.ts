import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class UmkmDetailPage extends BasePage {
  readonly backButton: Locator;
  readonly tabCatalog: Locator;
  readonly tabPerformance: Locator;
  readonly addProductButton: Locator;
  readonly productGrid: Locator;
  readonly totalSoldMetric: Locator;
  readonly totalRemittanceMetric: Locator;

  constructor(page: Page) {
    super(page);
    this.backButton = page.locator('[data-testid="f04-back-btn"], a[href="/admin/umkm"]');
    this.tabCatalog = page.locator('[data-testid="f04-tab-catalog-btn"], button:has-text("Katalog Master")');
    this.tabPerformance = page.locator('[data-testid="f04-tab-performance-btn"], button:has-text("Statistik Performa")');
    this.addProductButton = page.locator('[data-testid="f04-add-product-btn"], button:has-text("Tambah Produk")');
    this.productGrid = page.locator('.grid');
    this.totalSoldMetric = page.locator('[data-testid="f04-perf-sold-metric"], h3.font-mono:has-text("pcs")');
    this.totalRemittanceMetric = page.locator('[data-testid="f04-perf-remit-metric"], h3.font-mono.text-brand-950');
  }

  getProductCard(namaProduk: string): Locator {
    return this.page.locator(`div.group:has-text("${namaProduk}")`);
  }

  async switchTab(tab: 'catalog' | 'performance') {
    if (tab === 'catalog') {
      await this.tabCatalog.click();
    } else {
      await this.tabPerformance.click();
      await this.page.waitForLoadState('networkidle');
    }
  }

  async openAddProductModal() {
    await this.addProductButton.click();
  }

  async openEditProductModal(namaProduk: string) {
    const card = this.getProductCard(namaProduk);
    await card.locator('button[title="Edit Produk"]').click();
  }

  async deleteProduct(namaProduk: string) {
    const card = this.getProductCard(namaProduk);
    this.page.once('dialog', dialog => dialog.accept());
    await card.locator('button[title="Hapus Produk"]').click();
  }

  async expectProductCost(namaProduk: string, expectedFormattedCost: string) {
    const card = this.getProductCard(namaProduk);
    await expect(card.locator('span.font-mono.tabular-nums')).toContainText(expectedFormattedCost);
  }
}
