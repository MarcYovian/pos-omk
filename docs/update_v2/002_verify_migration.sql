-- ============================================================================
-- VERIFIKASI PASCA-MIGRASI
-- Jalankan SETELAH migration 001 sukses dan ter-commit.
-- Semua query ini read-only — aman dijalankan kapan saja.
-- ============================================================================

-- 1. Cek jumlah baris konsisten
SELECT
  (SELECT COUNT(*) FROM public.master_products)  AS total_master_products,
  (SELECT COUNT(*) FROM public.session_products) AS total_session_products,
  (SELECT COUNT(*) FROM public.umkm)              AS total_umkm;

-- 2. Cek tidak ada session_products yang "nyantol" tanpa master
SELECT sp.id, sp.session_id
FROM public.session_products sp
LEFT JOIN public.master_products mp ON mp.id = sp.master_product_id
WHERE mp.id IS NULL;
-- Harus 0 baris

-- 3. Cek tidak ada transaction_details yang kehilangan relasi
SELECT td.id, td.transaction_id
FROM public.transaction_details td
LEFT JOIN public.session_products sp ON sp.id = td.session_product_id
WHERE sp.id IS NULL;
-- Harus 0 baris

-- 4. Cek tidak ada reconciliation yang kehilangan relasi
SELECT r.id, r.session_id
FROM public.reconciliation r
LEFT JOIN public.session_products sp ON sp.id = r.session_product_id
WHERE sp.id IS NULL;
-- Harus 0 baris

-- 5. Cek duplikasi berhasil terhindar — lihat produk yang sama dari UMKM yang
--    sama sekarang cuma 1 baris master, tapi muncul di banyak sesi
SELECT
  mp.nama_produk,
  u.nama_umkm,
  COUNT(sp.id) AS jumlah_sesi_muncul
FROM public.master_products mp
JOIN public.umkm u ON u.id = mp.umkm_id
JOIN public.session_products sp ON sp.master_product_id = mp.id
GROUP BY mp.id, mp.nama_produk, u.nama_umkm
ORDER BY jumlah_sesi_muncul DESC
LIMIT 20;
-- Produk yang sering dijual harusnya muncul di banyak sesi tapi tetap 1 baris master

-- 6. Cek total stok_sekarang tidak pernah negatif (sanity check standar)
SELECT * FROM public.session_products WHERE stok_sekarang < 0;
-- Harus 0 baris

-- 7. Cek financial summary masih menghasilkan angka yang sama seperti sebelum
--    migrasi — bandingkan manual untuk 1 sesi yang sudah closed
-- (ganti UUID di bawah dengan session_id yang sudah closed di project kamu)
-- SELECT public.get_session_financial_summary('PASTE_SESSION_ID_DISINI');

-- 8. Cek view products_cashier_view tidak meng-expose harga_asli
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'products_cashier_view' AND table_schema = 'public';
-- harga_asli TIDAK BOLEH ada di hasil ini
