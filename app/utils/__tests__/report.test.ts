// utils/__tests__/report.test.ts
import { describe, it, expect } from 'vitest'
import { generateUMKMReport, type ProductReport } from '../report'
import type { UMKM } from '~/types/app'

describe('generateUMKMReport', () => {
  it('generates correct report string for partners', () => {
    const umkm: UMKM = {
      id: '1',
      nama_umkm: 'Ibu Sari',
      kontak_wa: '62812345678',
      is_active: true,
      created_at: '2026-06-07'
    }

    const products: ProductReport[] = [
      {
        nama_produk: 'Kue Nastar',
        stok_awal: 10,
        stok_sekarang: 8,
        stok_fisik: 8,
        remittance_due: 20000,
        harga_asli: 10000
      },
      {
        nama_produk: 'Kue Putri Salju',
        stok_awal: 5,
        stok_sekarang: 5,
        stok_fisik: 5,
        remittance_due: 0,
        harga_asli: 15000
      }
    ]

    const report = generateUMKMReport(umkm, products, new Date('2025-06-15'))
    
    expect(report).toContain('Halo Ibu Sari! 👋')
    expect(report).toContain('Izin melaporkan rekap penjualan hari ini ya, Bu:')
    expect(report).toContain('Kue Nastar\n2 x 10.000 = Rp 20.000\n(Retur: 8)')
    expect(report).toContain('Kue Putri Salju\n0 x 15.000 = Rp 0\n(Retur: 5)')
    expect(report).toContain('Total Terjual : 2 Item')
    expect(report).toContain('Total Setoran : Rp 20.000')
  })
})
