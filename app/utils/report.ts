// utils/report.ts
import type { UMKM } from '~/types/app'

export interface ProductReport {
  nama_produk: string
  stok_awal: number
  stok_sekarang: number
  stok_fisik: number
  remittance_due: number
  harga_asli: number
}

export function generateUMKMReport(umkm: UMKM, products: ProductReport[], sessionDate: Date, origin?: string): string {
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
    const formattedHargaAsli = new Intl.NumberFormat('id-ID').format(p.harga_asli);
    const formattedTotal = new Intl.NumberFormat('id-ID').format(p.remittance_due);
    return `${p.nama_produk}
${qtySold} x ${formattedHargaAsli} = Rp ${formattedTotal}
(Retur: ${qtyReturned})`;
  }).join('\n\n');

  const totalSold = products.reduce((sum, p) => sum + (p.stok_awal - p.stok_sekarang), 0);
  const totalRemittance = products.reduce((sum, p) => sum + p.remittance_due, 0);

  // Format with dot separator for Indonesian style
  const formattedRemittance = new Intl.NumberFormat('id-ID').format(totalRemittance);

  const linkSection = origin 
    ? `\n\n📊 Rincian performa penjualan lengkap & berkala Anda: ${origin}/umkm/performance/${umkm.id}` 
    : '';

  return `Halo ${umkm.nama_umkm}! 👋
Izin melaporkan rekap penjualan hari ini ya, Bu:

📅 ${formattedDate}

DETAIL PENJUALAN:
--------------------------
${productLines}
--------------------------
RINGKASAN:
📦 Total Terjual : ${totalSold} Item
💰 Total Setoran : Rp ${formattedRemittance}

Mohon dicek kembali ya, Bu. Jika sudah sesuai, mohon konfirmasinya. Terima kasih banyak atas kerja samanya! 🙏${linkSection}
— Sie Kewirausahaan OMK`;
}
