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
        remittance_due: 20000
      },
      {
        nama_produk: 'Kue Putri Salju',
        stok_awal: 5,
        stok_sekarang: 5,
        stok_fisik: 5,
        remittance_due: 0
      }
    ]

    const report = generateUMKMReport(umkm, products, new Date('2025-06-15'))
    
    expect(report).toContain('Halo Ibu Sari! 👋')
    expect(report).toContain('Kue Nastar: 2 terjual, 8 dikembalikan')
    expect(report).toContain('Kue Putri Salju: 0 terjual, 5 dikembalikan')
    expect(report).toContain('Total terjual: 2 item')
    expect(report).toContain('Total setoran ke Ibu Sari: Rp20.000')
  })
})
