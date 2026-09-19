-- ==============================================================================
-- OMK POS — Comprehensive Seed Data
-- File ini mengisi data awal (dummy/testing) untuk SEMUA tabel:
-- 1. umkm
-- 2. master_products
-- 3. sessions (2 sesi closed masa lalu + 1 sesi open aktif)
-- 4. session_products
-- 5. transactions
-- 6. transaction_details
-- 7. reconciliation (untuk sesi yang closed)
-- 8. cash_flows (manual kas modal & operasional)
-- 9. umkm_payments (riwayat & pending pembayaran UMKM)
-- ==============================================================================

-- Bersihkan data lama sebelum seeding agar bersih dan idempotent
TRUNCATE public.transaction_details, public.transactions, public.reconciliation, public.cash_flows, public.umkm_payments, public.session_products, public.sessions, public.master_products, public.umkm CASCADE;

DO $$
DECLARE
  -- User IDs dari auth.users
  v_admin_id   UUID;
  v_cashier_id UUID;

  -- UMKM IDs
  v_u1 UUID; v_u2 UUID; v_u3 UUID; v_u4 UUID;

  -- Master Products IDs
  v_mp_risol  UUID; v_mp_pastel UUID; v_mp_lemper UUID;
  v_mp_esteh  UUID; v_mp_puding UUID;
  v_mp_roti   UUID; v_mp_bolu   UUID; v_mp_tahu   UUID;
  v_mp_kopi   UUID; v_mp_thai   UUID;

  -- Session IDs
  v_s1 UUID; v_s2 UUID; v_s3 UUID;

  -- Session Products IDs for S1
  v_sp1_risol UUID; v_sp1_pastel UUID; v_sp1_esteh UUID; v_sp1_roti UUID; v_sp1_kopi UUID;

  -- Session Products IDs for S2
  v_sp2_risol UUID; v_sp2_pastel UUID; v_sp2_lemper UUID; v_sp2_esteh UUID; v_sp2_puding UUID; v_sp2_roti UUID; v_sp2_kopi UUID;

  -- Session Products IDs for S3 (Active)
  v_sp3_risol UUID; v_sp3_pastel UUID; v_sp3_lemper UUID; v_sp3_esteh UUID; v_sp3_puding UUID; v_sp3_roti UUID; v_sp3_bolu UUID; v_sp3_kopi UUID;

  -- Transaction IDs
  v_tx UUID;

BEGIN
  -- 0. Ambil Admin & Cashier User IDs
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'admin@pos.com' LIMIT 1;
  SELECT id INTO v_cashier_id FROM auth.users WHERE email = 'cashier@pos.com' LIMIT 1;

  -- Fallback jika user belum ada
  IF v_admin_id IS NULL THEN
    SELECT id INTO v_admin_id FROM auth.users LIMIT 1;
  END IF;
  IF v_cashier_id IS NULL THEN
    v_cashier_id := v_admin_id;
  END IF;

  -- ============================================================================
  -- 1. TABEL: umkm (4 Mitra Usaha)
  -- ============================================================================
  INSERT INTO public.umkm (nama_umkm, kontak_wa, is_active)
  VALUES ('Dapur Berkat OMK', '081234567890', true)
  ON CONFLICT (nama_umkm) DO UPDATE SET kontak_wa = EXCLUDED.kontak_wa
  RETURNING id INTO v_u1;

  INSERT INTO public.umkm (nama_umkm, kontak_wa, is_active)
  VALUES ('Camilan Kasih', '089876543210', true)
  ON CONFLICT (nama_umkm) DO UPDATE SET kontak_wa = EXCLUDED.kontak_wa
  RETURNING id INTO v_u2;

  INSERT INTO public.umkm (nama_umkm, kontak_wa, is_active)
  VALUES ('Warung Bu Maria', '081398765432', true)
  ON CONFLICT (nama_umkm) DO UPDATE SET kontak_wa = EXCLUDED.kontak_wa
  RETURNING id INTO v_u3;

  INSERT INTO public.umkm (nama_umkm, kontak_wa, is_active)
  VALUES ('Kopi & Teh Sedap OMK', '085612345678', true)
  ON CONFLICT (nama_umkm) DO UPDATE SET kontak_wa = EXCLUDED.kontak_wa
  RETURNING id INTO v_u4;

  -- ============================================================================
  -- 2. TABEL: master_products (Katalog Produk Master)
  -- ============================================================================
  -- Dapur Berkat OMK
  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, is_active)
  VALUES (v_u1, 'Risoles Mayo Spesial', 3000, true)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_risol;

  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, is_active)
  VALUES (v_u1, 'Pastel Ayam Telur', 3500, true)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_pastel;

  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, is_active)
  VALUES (v_u1, 'Lemper Ayam Gurih', 2500, true)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_lemper;

  -- Camilan Kasih
  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, is_active)
  VALUES (v_u2, 'Es Teh Manis Segar', 2000, true)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_esteh;

  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, is_active)
  VALUES (v_u2, 'Puding Cokelat Vla', 4000, true)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_puding;

  -- Warung Bu Maria
  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, is_active)
  VALUES (v_u3, 'Roti Bakso Sapi', 6000, true)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_roti;

  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, is_active)
  VALUES (v_u3, 'Bolu Kukus Pelangi', 2500, true)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_bolu;

  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, is_active)
  VALUES (v_u3, 'Tahu Bakso Goreng', 3000, true)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_tahu;

  -- Kopi & Teh Sedap OMK
  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, is_active)
  VALUES (v_u4, 'Kopi Susu Gula Aren', 8000, true)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_kopi;

  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, is_active)
  VALUES (v_u4, 'Thai Tea Jelly', 7000, true)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_thai;

  -- ============================================================================
  -- 3. TABEL: sessions (2 Sesi Selesai + 1 Sesi Aktif)
  -- ============================================================================
  -- Sesi 1: Minggu 2 minggu lalu (Closed)
  INSERT INTO public.sessions (session_date, status, opened_by, closed_by, opened_at, closed_at)
  VALUES ('2026-09-06', 'closed', v_admin_id, v_admin_id, '2026-09-06 06:30:00+07', '2026-09-06 12:30:00+07')
  ON CONFLICT (session_date) DO UPDATE SET status = 'closed', closed_at = '2026-09-06 12:30:00+07'
  RETURNING id INTO v_s1;

  -- Sesi 2: Minggu 1 minggu lalu (Closed)
  INSERT INTO public.sessions (session_date, status, opened_by, closed_by, opened_at, closed_at)
  VALUES ('2026-09-13', 'closed', v_admin_id, v_admin_id, '2026-09-13 06:30:00+07', '2026-09-13 12:45:00+07')
  ON CONFLICT (session_date) DO UPDATE SET status = 'closed', closed_at = '2026-09-13 12:45:00+07'
  RETURNING id INTO v_s2;

  -- Sesi 3: Sesi Aktif Hari Ini (Open)
  INSERT INTO public.sessions (session_date, status, opened_by, opened_at)
  VALUES (CURRENT_DATE, 'open', v_admin_id, NOW())
  ON CONFLICT (session_date) DO UPDATE SET status = 'open'
  RETURNING id INTO v_s3;

  -- ============================================================================
  -- 4. TABEL: session_products (Alokasi Produk per Sesi)
  -- ============================================================================
  -- SESI 1 Products
  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES
    (v_s1, v_mp_risol, 3000, 4000, 25, 25)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 4000
  RETURNING id INTO v_sp1_risol;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES
    (v_s1, v_mp_pastel, 3500, 5000, 20, 20)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 5000
  RETURNING id INTO v_sp1_pastel;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES
    (v_s1, v_mp_esteh, 2000, 3000, 30, 30)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 3000
  RETURNING id INTO v_sp1_esteh;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES
    (v_s1, v_mp_roti, 6000, 8000, 15, 15)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 8000
  RETURNING id INTO v_sp1_roti;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES
    (v_s1, v_mp_kopi, 8000, 12000, 15, 15)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 12000
  RETURNING id INTO v_sp1_kopi;

  -- SESI 2 Products
  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s2, v_mp_risol, 3000, 4000, 30, 30)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 4000
  RETURNING id INTO v_sp2_risol;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s2, v_mp_pastel, 3500, 5000, 25, 25)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 5000
  RETURNING id INTO v_sp2_pastel;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s2, v_mp_lemper, 2500, 3500, 20, 20)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 3500
  RETURNING id INTO v_sp2_lemper;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s2, v_mp_esteh, 2000, 3000, 40, 40)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 3000
  RETURNING id INTO v_sp2_esteh;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s2, v_mp_puding, 4000, 6000, 20, 20)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 6000
  RETURNING id INTO v_sp2_puding;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s2, v_mp_roti, 6000, 8000, 20, 20)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 8000
  RETURNING id INTO v_sp2_roti;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s2, v_mp_kopi, 8000, 12000, 20, 20)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 12000
  RETURNING id INTO v_sp2_kopi;

  -- SESI 3 (Aktif) Products
  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s3, v_mp_risol, 3000, 4000, 30, 30)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 4000
  RETURNING id INTO v_sp3_risol;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s3, v_mp_pastel, 3500, 5000, 25, 25)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 5000
  RETURNING id INTO v_sp3_pastel;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s3, v_mp_lemper, 2500, 3500, 20, 20)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 3500
  RETURNING id INTO v_sp3_lemper;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s3, v_mp_esteh, 2000, 3000, 40, 40)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 3000
  RETURNING id INTO v_sp3_esteh;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s3, v_mp_puding, 4000, 6000, 20, 20)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 6000
  RETURNING id INTO v_sp3_puding;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s3, v_mp_roti, 6000, 8000, 20, 20)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 8000
  RETURNING id INTO v_sp3_roti;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s3, v_mp_bolu, 2500, 3500, 25, 25)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 3500
  RETURNING id INTO v_sp3_bolu;

  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES (v_s3, v_mp_kopi, 8000, 12000, 25, 25)
  ON CONFLICT (session_id, master_product_id) DO UPDATE SET harga_jual = 12000
  RETURNING id INTO v_sp3_kopi;

  -- ============================================================================
  -- 5 & 6. TABEL: transactions & transaction_details
  -- ============================================================================
  -- ---------------- Sesi 1 Transaksi ----------------
  -- Tx 1.1: 2 Risoles + 1 Es Teh = 8.000 + 3.000 = 11.000 (Cash 20.000)
  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran, created_at)
  VALUES (v_s1, v_cashier_id, 11000, 20000, 'cash', '2026-09-06 08:15:00+07')
  RETURNING id INTO v_tx;
  INSERT INTO public.transaction_details (transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot, created_at)
  VALUES
    (v_tx, v_sp1_risol, 2, 4000, 3000, '2026-09-06 08:15:00+07'),
    (v_tx, v_sp1_esteh, 1, 3000, 2000, '2026-09-06 08:15:00+07');

  -- Tx 1.2: 1 Kopi Aren + 2 Pastel = 12.000 + 10.000 = 22.000 (QRIS 22.000)
  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran, created_at)
  VALUES (v_s1, v_cashier_id, 22000, 22000, 'qris', '2026-09-06 09:30:00+07')
  RETURNING id INTO v_tx;
  INSERT INTO public.transaction_details (transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot, created_at)
  VALUES
    (v_tx, v_sp1_kopi, 1, 12000, 8000, '2026-09-06 09:30:00+07'),
    (v_tx, v_sp1_pastel, 2, 5000, 3500, '2026-09-06 09:30:00+07');

  -- Tx 1.3: 2 Roti Bakso + 2 Es Teh = 16.000 + 6.000 = 22.000 (Cash 50.000)
  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran, created_at)
  VALUES (v_s1, v_cashier_id, 22000, 50000, 'cash', '2026-09-06 10:45:00+07')
  RETURNING id INTO v_tx;
  INSERT INTO public.transaction_details (transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot, created_at)
  VALUES
    (v_tx, v_sp1_roti, 2, 8000, 6000, '2026-09-06 10:45:00+07'),
    (v_tx, v_sp1_esteh, 2, 3000, 2000, '2026-09-06 10:45:00+07');

  -- Update sisa stok Sesi 1
  UPDATE public.session_products SET stok_sekarang = 23 WHERE id = v_sp1_risol;
  UPDATE public.session_products SET stok_sekarang = 18 WHERE id = v_sp1_pastel;
  UPDATE public.session_products SET stok_sekarang = 27 WHERE id = v_sp1_esteh;
  UPDATE public.session_products SET stok_sekarang = 13 WHERE id = v_sp1_roti;
  UPDATE public.session_products SET stok_sekarang = 14 WHERE id = v_sp1_kopi;

  -- ---------------- Sesi 2 Transaksi ----------------
  -- Tx 2.1: 5 Risoles + 2 Lemper + 3 Es Teh = 20.000 + 7.000 + 9.000 = 36.000 (Cash 50.000)
  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran, created_at)
  VALUES (v_s2, v_cashier_id, 36000, 50000, 'cash', '2026-09-13 08:30:00+07')
  RETURNING id INTO v_tx;
  INSERT INTO public.transaction_details (transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot, created_at)
  VALUES
    (v_tx, v_sp2_risol, 5, 4000, 3000, '2026-09-13 08:30:00+07'),
    (v_tx, v_sp2_lemper, 2, 3500, 2500, '2026-09-13 08:30:00+07'),
    (v_tx, v_sp2_esteh, 3, 3000, 2000, '2026-09-13 08:30:00+07');

  -- Tx 2.2: 2 Kopi Aren + 2 Puding = 24.000 + 12.000 = 36.000 (QRIS 36.000)
  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran, created_at)
  VALUES (v_s2, v_cashier_id, 36000, 36000, 'qris', '2026-09-13 09:15:00+07')
  RETURNING id INTO v_tx;
  INSERT INTO public.transaction_details (transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot, created_at)
  VALUES
    (v_tx, v_sp2_kopi, 2, 12000, 8000, '2026-09-13 09:15:00+07'),
    (v_tx, v_sp2_puding, 2, 6000, 4000, '2026-09-13 09:15:00+07');

  -- Tx 2.3: 3 Pastel + 2 Roti Bakso = 15.000 + 16.000 = 31.000 (Cash 35.000)
  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran, created_at)
  VALUES (v_s2, v_cashier_id, 31000, 35000, 'cash', '2026-09-13 10:00:00+07')
  RETURNING id INTO v_tx;
  INSERT INTO public.transaction_details (transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot, created_at)
  VALUES
    (v_tx, v_sp2_pastel, 3, 5000, 3500, '2026-09-13 10:00:00+07'),
    (v_tx, v_sp2_roti, 2, 8000, 6000, '2026-09-13 10:00:00+07');

  -- Tx 2.4: 1 Kopi Aren + 3 Risoles = 12.000 + 12.000 = 24.000 (QRIS 24.000)
  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran, created_at)
  VALUES (v_s2, v_cashier_id, 24000, 24000, 'qris', '2026-09-13 11:20:00+07')
  RETURNING id INTO v_tx;
  INSERT INTO public.transaction_details (transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot, created_at)
  VALUES
    (v_tx, v_sp2_kopi, 1, 12000, 8000, '2026-09-13 11:20:00+07'),
    (v_tx, v_sp2_risol, 3, 4000, 3000, '2026-09-13 11:20:00+07');

  -- Update sisa stok Sesi 2
  UPDATE public.session_products SET stok_sekarang = 22 WHERE id = v_sp2_risol;
  UPDATE public.session_products SET stok_sekarang = 22 WHERE id = v_sp2_pastel;
  UPDATE public.session_products SET stok_sekarang = 18 WHERE id = v_sp2_lemper;
  UPDATE public.session_products SET stok_sekarang = 37 WHERE id = v_sp2_esteh;
  UPDATE public.session_products SET stok_sekarang = 18 WHERE id = v_sp2_puding;
  UPDATE public.session_products SET stok_sekarang = 18 WHERE id = v_sp2_roti;
  UPDATE public.session_products SET stok_sekarang = 17 WHERE id = v_sp2_kopi;

  -- ---------------- Sesi 3 (Aktif) Transaksi Pembuka ----------------
  -- Tx 3.1: 2 Risoles + 1 Es Teh = 8.000 + 3.000 = 11.000 (Cash 15.000)
  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran, created_at)
  VALUES (v_s3, v_cashier_id, 11000, 15000, 'cash', NOW() - INTERVAL '1 hour')
  RETURNING id INTO v_tx;
  INSERT INTO public.transaction_details (transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot, created_at)
  VALUES
    (v_tx, v_sp3_risol, 2, 4000, 3000, NOW() - INTERVAL '1 hour'),
    (v_tx, v_sp3_esteh, 1, 3000, 2000, NOW() - INTERVAL '1 hour');

  -- Tx 3.2: 1 Kopi Aren + 1 Roti Bakso = 12.000 + 8.000 = 20.000 (QRIS 20.000)
  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran, created_at)
  VALUES (v_s3, v_cashier_id, 20000, 20000, 'qris', NOW() - INTERVAL '20 minutes')
  RETURNING id INTO v_tx;
  INSERT INTO public.transaction_details (transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot, created_at)
  VALUES
    (v_tx, v_sp3_kopi, 1, 12000, 8000, NOW() - INTERVAL '20 minutes'),
    (v_tx, v_sp3_roti, 1, 8000, 6000, NOW() - INTERVAL '20 minutes');

  -- Kurangi stok sesi aktif
  UPDATE public.session_products SET stok_sekarang = 28 WHERE id = v_sp3_risol;
  UPDATE public.session_products SET stok_sekarang = 39 WHERE id = v_sp3_esteh;
  UPDATE public.session_products SET stok_sekarang = 24 WHERE id = v_sp3_kopi;
  UPDATE public.session_products SET stok_sekarang = 19 WHERE id = v_sp3_roti;

  -- ============================================================================
  -- 7. TABEL: reconciliation (Rekonsiliasi Stok Akhir untuk Sesi Selesai)
  -- ============================================================================
  -- Rekonsiliasi Sesi 1
  INSERT INTO public.reconciliation (session_id, session_product_id, stok_fisik, stok_sekarang_snap, recorded_by, created_at)
  VALUES
    (v_s1, v_sp1_risol, 23, 23, v_admin_id, '2026-09-06 12:20:00+07'),
    (v_s1, v_sp1_pastel, 18, 18, v_admin_id, '2026-09-06 12:20:00+07'),
    (v_s1, v_sp1_esteh, 27, 27, v_admin_id, '2026-09-06 12:20:00+07'),
    (v_s1, v_sp1_roti, 13, 13, v_admin_id, '2026-09-06 12:20:00+07'),
    (v_s1, v_sp1_kopi, 14, 14, v_admin_id, '2026-09-06 12:20:00+07');

  -- Rekonsiliasi Sesi 2
  INSERT INTO public.reconciliation (session_id, session_product_id, stok_fisik, stok_sekarang_snap, recorded_by, created_at)
  VALUES
    (v_s2, v_sp2_risol, 22, 22, v_admin_id, '2026-09-13 12:35:00+07'),
    (v_s2, v_sp2_pastel, 22, 22, v_admin_id, '2026-09-13 12:35:00+07'),
    (v_s2, v_sp2_lemper, 18, 18, v_admin_id, '2026-09-13 12:35:00+07'),
    (v_s2, v_sp2_esteh, 37, 37, v_admin_id, '2026-09-13 12:35:00+07'),
    (v_s2, v_sp2_puding, 18, 18, v_admin_id, '2026-09-13 12:35:00+07'),
    (v_s2, v_sp2_roti, 18, 18, v_admin_id, '2026-09-13 12:35:00+07'),
    (v_s2, v_sp2_kopi, 17, 17, v_admin_id, '2026-09-13 12:35:00+07');

  -- ============================================================================
  -- 8. TABEL: cash_flows (Arus Kas Manual Tambahan: Kas Modal & Operasional)
  -- Catatan: Cash flow dari transaksi penjualan sudah otomatis dibuat oleh trigger!
  -- ============================================================================
  INSERT INTO public.cash_flows (type, source, amount, description, session_id, recorded_by, created_at)
  VALUES
    ('income', 'manual', 100000, 'Kas Awal Modal Kembalian Kasir', v_s3, v_admin_id, NOW() - INTERVAL '3 hours'),
    ('expense', 'manual', 25000, 'Beli Es Batu Kristal & Kantong Kresek', v_s3, v_cashier_id, NOW() - INTERVAL '2 hours'),
    ('expense', 'manual', 35000, 'Beli Cup Plastik & Sedotan Kopi', v_s2, v_cashier_id, '2026-09-13 07:00:00+07');

  -- ============================================================================
  -- 9. TABEL: umkm_payments (Bagi Hasil / Setoran UMKM)
  -- Catatan: Jika status = 'paid', trigger otomatis membuat entri expense di cash_flows!
  -- ============================================================================
  -- Pembayaran Sesi 1 yang sudah lunas
  INSERT INTO public.umkm_payments (umkm_id, amount, status, paid_at, recorded_by, notes, created_at)
  VALUES
    (v_u1, 13000, 'paid', '2026-09-06 14:00:00+07', v_admin_id, 'Setoran Sesi 06-09 via Transfer BCA', '2026-09-06 14:00:00+07'),
    (v_u4, 8000, 'paid', '2026-09-06 14:10:00+07', v_admin_id, 'Setoran Kopi Sesi 06-09 Tunai', '2026-09-06 14:10:00+07');

  -- Pembayaran Sesi 2 yang masih pending
  INSERT INTO public.umkm_payments (umkm_id, amount, status, recorded_by, notes, created_at)
  VALUES
    (v_u1, 24000, 'pending', v_admin_id, 'Tagihan Sesi 13-09 (Risoles & Pastel)', '2026-09-13 13:00:00+07'),
    (v_u3, 12000, 'pending', v_admin_id, 'Tagihan Sesi 13-09 (Roti Bakso)', '2026-09-13 13:00:00+07');

END $$;
