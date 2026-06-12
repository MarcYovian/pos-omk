// utils/report.ts
import type { UMKM } from '~/types/app'

export interface ProductReport {
  nama_produk: string
  stok_awal: number
  stok_sekarang: number
  stok_fisik: number
  remittance_due: number
}

export function generateUMKMReport(umkm: UMKM, products: ProductReport[], sessionDate: Date): string {
  const formattedDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  }).format(sessionDate);

  const productLines = products.map(p => {
    const qtySold = p.stok_awal - p.stok_sekarang;
    const qtyReturned = p.stok_fisik;
    return `• ${p.nama_produk}: ${qtySold} terjual, ${qtyReturned} dikembalikan`;
  }).join('\n');

  const totalSold = products.reduce((sum, p) => sum + (p.stok_awal - p.stok_sekarang), 0);
  const totalRemittance = products.reduce((sum, p) => sum + p.remittance_due, 0);
  
  // Format with dot separator for Indonesian style
  const formattedRemittance = new Intl.NumberFormat('id-ID').format(totalRemittance);

  return `Halo ${umkm.nama_umkm}! 👋

Berikut laporan penjualan hari ini:
📅 ${formattedDate}

DETAIL PENJUALAN:
${productLines}

RINGKASAN:
Total terjual: ${totalSold} item
Total setoran ke ${umkm.nama_umkm}: Rp${formattedRemittance}

Mohon konfirmasi penerimaan. Terima kasih atas kerja samanya! 🙏
— Tim OMK`;
}
