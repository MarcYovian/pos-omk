-- ============================================================================
-- MIGRATION: Split `products` → `master_products` + `session_products`
-- ============================================================================
-- Tujuan: Hilangkan duplikasi data produk per sesi. 1 produk fisik (nama_produk
-- + umkm_id) sekarang punya 1 baris di master_products, dan tiap kemunculannya
-- di suatu sesi (dengan harga_jual, stok_awal, stok_sekarang sendiri) jadi
-- baris di session_products.
--
-- ⚠️ JALANKAN SEBAGAI SATU TRANSACTION. Jangan jalankan section per section
--    secara terpisah di SQL Editor — backfill harus atomic dengan DDL.
-- ⚠️ BACKUP DATABASE DULU sebelum run ini (Supabase Dashboard → Database →
--    Backups → buat backup manual) — migration ini DROP kolom dan REWRITE FK.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1 — Buat tabel master_products
-- ============================================================================

CREATE TABLE public.master_products (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  umkm_id      UUID          NOT NULL REFERENCES public.umkm(id) ON DELETE RESTRICT,
  nama_produk  VARCHAR(100)  NOT NULL,
  harga_asli   INTEGER       NOT NULL CHECK (harga_asli > 0),
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,    -- Soft delete: produk masih jadi katalog atau tidak
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT master_products_unique_per_umkm UNIQUE (umkm_id, nama_produk)
);

COMMENT ON TABLE public.master_products IS
  'Katalog produk master per UMKM. Satu baris = satu jenis produk fisik, tidak terikat sesi tertentu.';
COMMENT ON COLUMN public.master_products.harga_asli IS
  'Harga dasar TERBARU/DEFAULT dari UMKM. Dipakai sebagai nilai awal saat admin menambah produk ini ke sesi baru. Tidak memengaruhi sesi yang sudah ada.';
COMMENT ON COLUMN public.master_products.is_active IS
  'Soft delete katalog. False = produk ini tidak lagi ditawarkan UMKM, disembunyikan dari pilihan "tambah produk" di setup sesi baru.';

CREATE TRIGGER trg_master_products_updated_at
  BEFORE UPDATE ON public.master_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
  -- NOTE: jika function set_updated_at() belum ada, lihat STEP 1B di bawah


-- ============================================================================
-- STEP 1B — Helper function untuk updated_at (skip jika sudah ada di project)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;


-- ============================================================================
-- STEP 2 — Buat tabel session_products (pivot dengan payload)
-- ============================================================================

CREATE TABLE public.session_products (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id          UUID          NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  master_product_id   UUID          NOT NULL REFERENCES public.master_products(id) ON DELETE RESTRICT,
  harga_asli          INTEGER       NOT NULL CHECK (harga_asli > 0),
  harga_jual          INTEGER       NOT NULL CHECK (harga_jual >= harga_asli),
  stok_awal           INTEGER       NOT NULL CHECK (stok_awal > 0),
  stok_sekarang       INTEGER       NOT NULL,
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT session_products_stok_check
    CHECK (stok_sekarang >= 0 AND stok_sekarang <= stok_awal),
  CONSTRAINT session_products_unique_per_session
    UNIQUE (session_id, master_product_id)
    -- Satu master_product cuma boleh muncul SEKALI per sesi
);

COMMENT ON TABLE public.session_products IS
  'Pivot table: kemunculan satu master_product pada satu sesi tertentu, dengan harga & stok khusus sesi itu.';
COMMENT ON COLUMN public.session_products.harga_asli IS
  'Harga dasar UNTUK SESI INI. Di-copy dari master_products.harga_asli saat dibuat, tapi admin bisa override khusus sesi ini jika UMKM kasih harga beda minggu ini.';
COMMENT ON COLUMN public.session_products.harga_jual IS
  'Harga jual OMK untuk sesi ini. Harus >= harga_asli pada baris ini (bukan harga master).';
COMMENT ON COLUMN public.session_products.stok_sekarang IS
  'Stok tersisa live untuk sesi ini. Hanya diubah lewat RPC complete_transaction.';

-- Trigger inisialisasi stok (ganti dari trigger lama yang nempel di `products`)
CREATE OR REPLACE FUNCTION public.set_stok_sekarang()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.stok_sekarang := NEW.stok_awal;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_init_stok_session_products
  BEFORE INSERT ON public.session_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stok_sekarang();


-- ============================================================================
-- STEP 3 — BACKFILL: pindahkan data dari `products` ke 2 tabel baru
-- ============================================================================

-- 3A. Isi master_products — GABUNGKAN baris yang nama_produk + umkm_id sama
--     (sesuai keputusan: hindari duplikasi by design)
INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli, created_at)
SELECT
  umkm_id,
  nama_produk,
  -- Ambil harga_asli dari kemunculan PALING BARU sebagai harga "default" master
  (ARRAY_AGG(harga_asli ORDER BY session_date DESC))[1] AS harga_asli,
  MIN(created_at) AS created_at
FROM public.products
GROUP BY umkm_id, nama_produk;

-- 3B. Isi session_products — setiap baris `products` lama jadi satu baris
--     session_products, di-link ke master yang sudah digabung di 3A,
--     dan di-link ke sessions lewat session_date
INSERT INTO public.session_products (
  id, session_id, master_product_id, harga_asli, harga_jual,
  stok_awal, stok_sekarang, is_active, created_at
)
SELECT
  p.id,                          -- PAKAI ID LAMA — supaya FK transaction_details
                                  -- & reconciliation tidak perlu remap, cukup
                                  -- retarget constraint-nya ke tabel baru
  s.id                AS session_id,
  mp.id               AS master_product_id,
  p.harga_asli,
  p.harga_jual,
  p.stok_awal,
  p.stok_sekarang,
  p.is_active,
  p.created_at
FROM public.products p
JOIN public.sessions s        ON s.session_date = p.session_date
JOIN public.master_products mp ON mp.umkm_id = p.umkm_id AND mp.nama_produk = p.nama_produk;

-- Sanity check: jumlah baris harus sama persis dengan tabel products lama
DO $$
DECLARE
  v_old_count INTEGER;
  v_new_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_old_count FROM public.products;
  SELECT COUNT(*) INTO v_new_count FROM public.session_products;
  IF v_old_count != v_new_count THEN
    RAISE EXCEPTION 'Backfill mismatch! products: %, session_products: %', v_old_count, v_new_count;
  END IF;
  RAISE NOTICE 'Backfill OK — % baris berhasil dipindah', v_new_count;
END $$;


-- ============================================================================
-- STEP 4 — Retarget FK di transaction_details & reconciliation
-- ============================================================================
-- Karena session_products.id dibuat SAMA dengan products.id (lihat 3B),
-- data transaction_details.product_id & reconciliation.product_id TIDAK
-- PERLU di-UPDATE nilainya — kita cukup pindah constraint FK-nya saja.

ALTER TABLE public.transaction_details
  DROP CONSTRAINT transaction_details_product_id_fkey;

ALTER TABLE public.transaction_details
  ADD CONSTRAINT transaction_details_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.session_products(id) ON DELETE RESTRICT;

ALTER TABLE public.reconciliation
  DROP CONSTRAINT reconciliation_product_id_fkey;

ALTER TABLE public.reconciliation
  ADD CONSTRAINT reconciliation_product_id_fkey
  FOREIGN KEY (product_id) REFERENCES public.session_products(id) ON DELETE RESTRICT;

-- Rename kolom biar jelas secara semantik (opsional tapi direkomendasikan)
ALTER TABLE public.transaction_details RENAME COLUMN product_id TO session_product_id;
ALTER TABLE public.reconciliation RENAME COLUMN product_id TO session_product_id;


-- ============================================================================
-- STEP 5 — Drop tabel `products` lama beserta trigger-nya
-- ============================================================================

DROP TRIGGER IF EXISTS trg_init_stok ON public.products;
DROP TABLE public.products;


-- ============================================================================
-- STEP 6 — Drop & buat ulang view products_cashier_view
-- ============================================================================

DROP VIEW IF EXISTS public.products_cashier_view;

CREATE VIEW public.products_cashier_view AS
  SELECT
    sp.id,
    sp.session_id,
    mp.umkm_id,
    mp.nama_produk,
    sp.harga_jual,
    sp.stok_awal,
    sp.stok_sekarang,
    sp.is_active,
    sp.created_at
    -- harga_asli TETAP tidak ditampilkan ke cashier
  FROM public.session_products sp
  JOIN public.master_products mp ON mp.id = sp.master_product_id;

GRANT SELECT ON public.products_cashier_view TO authenticated;

COMMENT ON VIEW public.products_cashier_view IS
  'View aman untuk role cashier — join session_products + master_products, harga_asli disembunyikan.';


-- ============================================================================
-- STEP 7 — Update views analitik yang sebelumnya query `products` langsung
-- ============================================================================

-- 7A. session_history_summary — tidak berubah strukturnya (tidak query products)
--     tapi kita CREATE OR REPLACE ulang untuk memastikan konsisten

CREATE OR REPLACE VIEW public.session_history_summary AS
  SELECT s.id AS session_id, s.session_date, s.status, s.closed_at,
         COALESCE(COUNT(DISTINCT t.id), 0)::BIGINT AS transaction_count,
         COALESCE(SUM(td.subtotal_harga_jual), 0)::BIGINT AS gross_revenue,
         COALESCE(SUM(td.subtotal_harga_asli), 0)::BIGINT AS total_remittance,
         COALESCE(SUM(td.subtotal_harga_jual - td.subtotal_harga_asli), 0)::BIGINT AS omk_net_profit
  FROM public.sessions s
  LEFT JOIN public.transactions t ON t.session_id = s.id
  LEFT JOIN public.transaction_details td ON td.transaction_id = t.id
  GROUP BY s.id, s.session_date, s.status, s.closed_at;


-- 7B. top_products_sales — sekarang group by master_product_id (ID stabil),
--     bukan nama_produk (teks rawan typo/duplikat)

DROP VIEW IF EXISTS public.top_products_sales;

CREATE VIEW public.top_products_sales AS
  WITH product_sales AS (
    SELECT mp.id AS master_product_id, mp.nama_produk,
           COALESCE(SUM(td.qty), 0)::BIGINT AS total_sold
    FROM public.master_products mp
    JOIN public.session_products sp ON sp.master_product_id = mp.id
    JOIN public.transaction_details td ON td.session_product_id = sp.id
    JOIN public.transactions t ON t.id = td.transaction_id
    JOIN public.sessions s ON s.id = t.session_id
    WHERE s.status = 'closed'
    GROUP BY mp.id, mp.nama_produk
  ), product_stock AS (
    SELECT mp.id AS master_product_id, SUM(sp.stok_awal) AS total_stok_awal
    FROM public.master_products mp
    JOIN public.session_products sp ON sp.master_product_id = mp.id
    JOIN public.sessions s ON s.id = sp.session_id
    WHERE s.status = 'closed'
    GROUP BY mp.id
  )
  SELECT ps.master_product_id, ps.nama_produk, ps.total_sold, pst.total_stok_awal,
         CASE WHEN pst.total_stok_awal > 0
           THEN ROUND((ps.total_sold::NUMERIC / pst.total_stok_awal::NUMERIC) * 100, 1)
           ELSE 0 END AS sell_through_rate
  FROM product_sales ps
  JOIN product_stock pst ON pst.master_product_id = ps.master_product_id
  ORDER BY ps.total_sold DESC;


-- 7C. umkm_profit_contribution — tidak ada perubahan logika, hanya rewrite
--     join path lewat session_products

CREATE OR REPLACE VIEW public.umkm_profit_contribution AS
  SELECT u.nama_umkm,
         COALESCE(SUM((td.harga_jual_snapshot - td.harga_asli_snapshot) * td.qty), 0)::BIGINT AS omk_profit
  FROM public.umkm u
  JOIN public.master_products mp ON mp.umkm_id = u.id
  JOIN public.session_products sp ON sp.master_product_id = mp.id
  JOIN public.transaction_details td ON td.session_product_id = sp.id
  JOIN public.transactions t ON t.id = td.transaction_id
  JOIN public.sessions s ON s.id = t.session_id
  WHERE s.status = 'closed'
  GROUP BY u.nama_umkm;


-- ============================================================================
-- STEP 8 — Update RPC: complete_transaction
-- ============================================================================
-- Perubahan: target stock check/decrement pindah dari `products` ke
-- `session_products`. Parameter cart_items tetap kompatibel di frontend
-- (cuma product_id sekarang artinya session_product_id).

CREATE OR REPLACE FUNCTION public.complete_transaction(
  p_session_id        UUID,
  p_cashier_id        UUID,
  p_nominal_diterima  INTEGER,
  p_cart_items        JSONB,         -- Array of {product_id, qty, harga_jual, harga_asli}
                                      -- NOTE: product_id di sini = session_products.id
  p_metode_pembayaran VARCHAR DEFAULT 'cash'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_transaction_id    UUID;
  v_total_harga_jual  INTEGER := 0;
  v_item              JSONB;
  v_session_product_id UUID;
  v_qty               INTEGER;
  v_harga_jual        INTEGER;
  v_stok_sekarang     INTEGER;
  v_session_status    VARCHAR(20);
BEGIN
  SELECT status INTO v_session_status FROM public.sessions WHERE id = p_session_id;
  IF v_session_status IS NULL THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;
  IF v_session_status != 'open' THEN
    RAISE EXCEPTION 'Session is closed. No transactions allowed.';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items) LOOP
    v_session_product_id := (v_item->>'product_id')::UUID;
    v_qty                := (v_item->>'qty')::INTEGER;
    v_harga_jual          := (v_item->>'harga_jual')::INTEGER;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid qty for session_product %', v_session_product_id;
    END IF;
    v_total_harga_jual := v_total_harga_jual + (v_qty * v_harga_jual);
  END LOOP;

  IF p_nominal_diterima < v_total_harga_jual THEN
    RAISE EXCEPTION 'nominal_diterima (%) is less than total (%).',
      p_nominal_diterima, v_total_harga_jual;
  END IF;

  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran)
  VALUES (p_session_id, p_cashier_id, v_total_harga_jual, p_nominal_diterima, p_metode_pembayaran)
  RETURNING id INTO v_transaction_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items) LOOP
    v_session_product_id := (v_item->>'product_id')::UUID;
    v_qty                := (v_item->>'qty')::INTEGER;

    -- Lock baris session_products, BUKAN products lagi
    SELECT stok_sekarang INTO v_stok_sekarang
    FROM public.session_products
    WHERE id = v_session_product_id AND is_active = TRUE
    FOR UPDATE;

    IF v_stok_sekarang IS NULL THEN
      RAISE EXCEPTION 'Session product % not found or inactive', v_session_product_id;
    END IF;
    IF v_stok_sekarang < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for session_product %. Available: %, Requested: %',
        v_session_product_id, v_stok_sekarang, v_qty;
    END IF;

    UPDATE public.session_products
    SET stok_sekarang = stok_sekarang - v_qty
    WHERE id = v_session_product_id;

    -- harga_jual & harga_asli SELALU dibaca dari session_products (server-side),
    -- tidak pernah dipercaya dari payload klien
    INSERT INTO public.transaction_details (
      transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot
    )
    SELECT v_transaction_id, v_session_product_id, v_qty, sp.harga_jual, sp.harga_asli
    FROM public.session_products sp WHERE sp.id = v_session_product_id;
  END LOOP;

  RETURN jsonb_build_object(
    'transaction_id',    v_transaction_id,
    'total_harga_jual',  v_total_harga_jual,
    'kembalian',         p_nominal_diterima - v_total_harga_jual,
    'metode_pembayaran', p_metode_pembayaran
  );
EXCEPTION WHEN OTHERS THEN RAISE;
END;
$$;

COMMENT ON FUNCTION public.complete_transaction IS
  'Atomic transaction: insert transaction header + details + kurangi stok session_products. Harga selalu dibaca dari DB, bukan dari payload klien.';


-- ============================================================================
-- STEP 9 — Update RPC: reset_session
-- ============================================================================
-- Perubahan: stok di-reset di session_products, dan join-nya pakai session_id
-- langsung (bukan lewat session_date) karena session_products sudah punya FK
-- session_id eksplisit — ini sekaligus jadi simplifikasi.

CREATE OR REPLACE FUNCTION public.reset_session(
  p_session_id  UUID,
  p_admin_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_email TEXT;
BEGIN
  SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();

  IF v_caller_email IS NULL OR v_caller_email != 'marcellinusyovian@gmail.com' THEN
    RAISE EXCEPTION 'Access Denied: Only marcellinusyovian@gmail.com is allowed to reset the session.';
  END IF;

  DELETE FROM public.transaction_details
  WHERE transaction_id IN (SELECT id FROM public.transactions WHERE session_id = p_session_id);

  DELETE FROM public.transactions WHERE session_id = p_session_id;

  DELETE FROM public.reconciliation WHERE session_id = p_session_id;

  UPDATE public.session_products
  SET stok_sekarang = stok_awal
  WHERE session_id = p_session_id;

  UPDATE public.sessions
  SET status = 'open', closed_by = NULL, closed_at = NULL
  WHERE id = p_session_id;

  RETURN jsonb_build_object('session_id', p_session_id, 'status', 'open', 'reset', true);
END;
$$;


-- ============================================================================
-- STEP 10 — Update RPC: get_session_financial_summary
-- ============================================================================
-- Perubahan: join path lewat session_products + master_products untuk
-- dapat umkm_id (sebelumnya langsung dari products.umkm_id)

CREATE OR REPLACE FUNCTION public.get_session_financial_summary(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_totals JSONB;
  v_per_umkm JSONB;
BEGIN
  SELECT jsonb_build_object(
    'session_id',        p_session_id,
    'gross_revenue',     COALESCE(SUM(td.subtotal_harga_jual), 0),
    'total_remittance',  COALESCE(SUM(td.subtotal_harga_asli), 0),
    'omk_net_profit',    COALESCE(SUM(td.subtotal_harga_jual - td.subtotal_harga_asli), 0),
    'transaction_count', COUNT(DISTINCT t.id)
  )
  INTO v_totals
  FROM public.transactions t
  JOIN public.transaction_details td ON td.transaction_id = t.id
  WHERE t.session_id = p_session_id;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'umkm_id',        agg.umkm_id,
        'nama_umkm',      agg.nama_umkm,
        'items_sold',     agg.items_sold,
        'gross_sales',    agg.gross_sales,
        'remittance_due', agg.remittance_due,
        'omk_profit',     agg.omk_profit
      ) ORDER BY agg.nama_umkm
    ), '[]'::jsonb
  )
  INTO v_per_umkm
  FROM (
    SELECT
      u.id              AS umkm_id,
      u.nama_umkm,
      COALESCE(SUM(td.qty), 0)                                          AS items_sold,
      COALESCE(SUM(td.subtotal_harga_jual), 0)                          AS gross_sales,
      COALESCE(SUM(td.subtotal_harga_asli), 0)                          AS remittance_due,
      COALESCE(SUM(td.subtotal_harga_jual - td.subtotal_harga_asli), 0) AS omk_profit
    FROM public.transactions t
    JOIN public.transaction_details td ON td.transaction_id = t.id
    JOIN public.session_products sp ON sp.id = td.session_product_id
    JOIN public.master_products mp ON mp.id = sp.master_product_id
    JOIN public.umkm u ON u.id = mp.umkm_id
    WHERE t.session_id = p_session_id
    GROUP BY u.id, u.nama_umkm
  ) agg;

  IF v_totals IS NULL THEN
    RETURN jsonb_build_object(
      'session_id', p_session_id, 'gross_revenue', 0, 'total_remittance', 0,
      'omk_net_profit', 0, 'transaction_count', 0, 'per_umkm', '[]'::jsonb
    );
  END IF;

  RETURN v_totals || jsonb_build_object('per_umkm', v_per_umkm);
END;
$$;


-- ============================================================================
-- STEP 11 — Update RPC: get_umkm_product_breakdown
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_umkm_product_breakdown(
  p_session_id UUID,
  p_umkm_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'master_product_id', mp.id,
        'nama_produk',       mp.nama_produk,
        'stok_awal',         sp.stok_awal,
        'stok_sekarang',     sp.stok_sekarang,
        'sold',              COALESCE(s.qty_sold, 0),
        'revenue',           COALESCE(s.rev, 0),
        'cost',              COALESCE(s.cost, 0),
        'profit',            COALESCE(s.rev - s.cost, 0)
      ) ORDER BY mp.nama_produk
    ), '[]'::jsonb
  )
  INTO v_result
  FROM public.session_products sp
  JOIN public.master_products mp ON mp.id = sp.master_product_id
  LEFT JOIN (
    SELECT td.session_product_id,
           SUM(td.qty)                 AS qty_sold,
           SUM(td.subtotal_harga_jual) AS rev,
           SUM(td.subtotal_harga_asli) AS cost
    FROM public.transaction_details td
    JOIN public.transactions t ON t.id = td.transaction_id
    WHERE t.session_id = p_session_id
    GROUP BY td.session_product_id
  ) s ON s.session_product_id = sp.id
  WHERE mp.umkm_id = p_umkm_id AND sp.session_id = p_session_id;

  RETURN v_result;
END;
$$;


-- ============================================================================
-- STEP 12 — Update RPC: get_product_stock_recommendation
-- ============================================================================
-- Perubahan PALING SIGNIFIKAN: matching sekarang pakai p_master_product_id
-- (UUID stabil), BUKAN p_nama_produk (teks). Ini juga mengubah signature
-- function — frontend WAJIB update cara memanggil RPC ini.

CREATE OR REPLACE FUNCTION public.get_product_stock_recommendation(
  p_master_product_id UUID
)
RETURNS TABLE(recommendation INTEGER, s1_sold INTEGER, s2_sold INTEGER, s3_sold INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_s1 INTEGER := 0; v_s2 INTEGER := 0; v_s3 INTEGER := 0;
  v_rec INTEGER; r RECORD; idx INTEGER := 1;
BEGIN
  FOR r IN (
    SELECT COALESCE(SUM(td.qty), 0)::INTEGER AS total_sold
    FROM public.sessions s
    JOIN public.session_products sp ON sp.session_id = s.id
    LEFT JOIN public.transaction_details td ON td.session_product_id = sp.id
    WHERE s.status = 'closed'
      AND sp.master_product_id = p_master_product_id
    GROUP BY s.id, s.session_date
    ORDER BY s.session_date DESC LIMIT 3
  ) LOOP
    IF idx = 1 THEN v_s1 := r.total_sold;
    ELSIF idx = 2 THEN v_s2 := r.total_sold;
    ELSIF idx = 3 THEN v_s3 := r.total_sold; END IF;
    idx := idx + 1;
  END LOOP;

  IF idx = 1 THEN RETURN; END IF;

  v_rec := CEIL((0.5 * v_s1) + (0.3 * v_s2) + (0.2 * v_s3));
  RETURN QUERY SELECT v_rec, v_s1, v_s2, v_s3;
END;
$$;

COMMENT ON FUNCTION public.get_product_stock_recommendation IS
  'BREAKING CHANGE v3.0: parameter sekarang p_master_product_id (UUID), bukan p_umkm_id + p_nama_produk (TEXT). Frontend wajib update call site.';


-- ============================================================================
-- STEP 13 — Indexes baru (gantikan index lama di `products`)
-- ============================================================================

CREATE INDEX idx_master_products_umkm ON public.master_products(umkm_id);
CREATE INDEX idx_master_products_active ON public.master_products(umkm_id, is_active) WHERE is_active = TRUE;

CREATE INDEX idx_session_products_session ON public.session_products(session_id);
CREATE INDEX idx_session_products_master ON public.session_products(master_product_id);
CREATE INDEX idx_session_products_active ON public.session_products(session_id, is_active) WHERE is_active = TRUE;

-- Index lama di transaction_details & reconciliation tetap valid (nama kolom
-- berubah tapi index by FK column masih relevan) — drop & buat ulang dengan
-- nama kolom baru biar konsisten
DROP INDEX IF EXISTS idx_td_product;
CREATE INDEX idx_td_session_product ON public.transaction_details(session_product_id);


-- ============================================================================
-- STEP 14 — RLS Policies untuk tabel baru
-- ============================================================================

ALTER TABLE public.master_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_products ENABLE ROW LEVEL SECURITY;

-- master_products: semua authenticated user boleh baca (perlu untuk nama produk)
CREATE POLICY "master_products_read_all" ON public.master_products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "master_products_write_admin" ON public.master_products
  FOR ALL USING (public.get_user_role() = 'admin');

-- session_products: cashier baca lewat products_cashier_view (yang sudah handle
-- penyembunyian harga_asli), tapi base table read policy tetap perlu untuk view
-- bisa jalan dengan benar di bawah RLS
CREATE POLICY "session_products_read_cashier" ON public.session_products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "session_products_write_admin" ON public.session_products
  FOR ALL USING (public.get_user_role() = 'admin');


-- ============================================================================
-- STEP 15 — Realtime: pindahkan publication dari products ke session_products
-- ============================================================================

ALTER PUBLICATION supabase_realtime DROP TABLE public.products;  -- akan error jika sudah ke-drop di STEP 5, aman diabaikan
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_products;

COMMIT;

-- ============================================================================
-- SELESAI. Lanjut ke langkah verifikasi & catatan frontend di bawah.
-- ============================================================================
