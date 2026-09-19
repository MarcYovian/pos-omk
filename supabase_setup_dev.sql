-- ==============================================================================
-- OMK POS — Development Database Setup Script
-- File ini digunakan untuk inisialisasi database baru di Supabase (Development)
-- Jalankan seluruh isi script ini di SQL Editor di Supabase Dashboard project baru.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_stok_sekarang()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.stok_sekarang := NEW.stok_awal;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    'cashier'
  );
$$;

-- 3. TABLES

-- Table: umkm
CREATE TABLE IF NOT EXISTS public.umkm (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_umkm    VARCHAR(100) NOT NULL UNIQUE,
  kontak_wa    VARCHAR(20)  NOT NULL,
  is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Table: master_products
CREATE TABLE IF NOT EXISTS public.master_products (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  umkm_id      UUID          NOT NULL REFERENCES public.umkm(id) ON DELETE RESTRICT,
  nama_produk  VARCHAR(100)  NOT NULL,
  harga_asli   INTEGER       NOT NULL CHECK (harga_asli > 0),
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT master_products_unique_per_umkm UNIQUE (umkm_id, nama_produk)
);

DROP TRIGGER IF EXISTS trg_master_products_updated_at ON public.master_products;
CREATE TRIGGER trg_master_products_updated_at
  BEFORE UPDATE ON public.master_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Table: sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date DATE         NOT NULL UNIQUE,
  status       VARCHAR(10)  NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_by    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by    UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  closed_at    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Table: session_products
CREATE TABLE IF NOT EXISTS public.session_products (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id          UUID          NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  master_product_id   UUID          NOT NULL REFERENCES public.master_products(id) ON DELETE RESTRICT,
  harga_asli          INTEGER       NOT NULL CHECK (harga_asli > 0),
  harga_jual          INTEGER       NOT NULL CHECK (harga_jual >= harga_asli),
  stok_awal           INTEGER       NOT NULL CHECK (stok_awal > 0),
  stok_sekarang       INTEGER       NOT NULL,
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  CONSTRAINT session_products_stok_check CHECK (stok_sekarang >= 0 AND stok_sekarang <= stok_awal),
  CONSTRAINT session_products_unique_per_session UNIQUE (session_id, master_product_id)
);

DROP TRIGGER IF EXISTS trg_init_stok_session_products ON public.session_products;
CREATE TRIGGER trg_init_stok_session_products
  BEFORE INSERT ON public.session_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stok_sekarang();

-- Table: transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id                 UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id         UUID         NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  cashier_id         UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  total_harga_jual   INTEGER      NOT NULL,
  nominal_diterima   INTEGER      NOT NULL,
  kembalian          INTEGER      GENERATED ALWAYS AS (nominal_diterima - total_harga_jual) STORED,
  metode_pembayaran  VARCHAR(20)  DEFAULT 'cash',
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Table: transaction_details
CREATE TABLE IF NOT EXISTS public.transaction_details (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id      UUID        NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
  session_product_id  UUID        NOT NULL REFERENCES public.session_products(id) ON DELETE RESTRICT,
  qty                 INTEGER     NOT NULL CHECK (qty > 0),
  harga_jual_snapshot INTEGER     NOT NULL,
  harga_asli_snapshot INTEGER     NOT NULL,
  subtotal_harga_jual INTEGER     GENERATED ALWAYS AS (qty * harga_jual_snapshot) STORED,
  subtotal_harga_asli INTEGER     GENERATED ALWAYS AS (qty * harga_asli_snapshot) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: reconciliation
CREATE TABLE IF NOT EXISTS public.reconciliation (
  id                 UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id         UUID        NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  session_product_id UUID        NOT NULL REFERENCES public.session_products(id) ON DELETE RESTRICT,
  stok_fisik         INTEGER     NOT NULL,
  stok_sekarang_snap INTEGER     NOT NULL,
  selisih            INTEGER     GENERATED ALWAYS AS (stok_fisik - stok_sekarang_snap) STORED,
  recorded_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: cash_flows
CREATE TABLE IF NOT EXISTS public.cash_flows (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  source      VARCHAR(20) NOT NULL CHECK (source IN ('transaction', 'manual', 'payment')),
  amount      INTEGER     NOT NULL CHECK (amount > 0),
  description TEXT,
  session_id  UUID        REFERENCES public.sessions(id) ON DELETE SET NULL,
  recorded_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: umkm_payments
CREATE TABLE IF NOT EXISTS public.umkm_payments (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  umkm_id     UUID        NOT NULL REFERENCES public.umkm(id) ON DELETE RESTRICT,
  amount      INTEGER     NOT NULL CHECK (amount > 0),
  status      VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_at     TIMESTAMPTZ,
  recorded_by UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. CASH FLOW TRIGGERS
CREATE OR REPLACE FUNCTION public.trigger_add_cash_flow_from_transaction()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.cash_flows (type, source, amount, description, session_id, recorded_by)
  VALUES (
    'income',
    'transaction',
    NEW.total_harga_jual,
    'Penjualan sesi tanggal ' || (SELECT session_date FROM public.sessions WHERE id = NEW.session_id),
    NEW.session_id,
    NEW.cashier_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cash_flow_from_transaction ON public.transactions;
CREATE TRIGGER trg_cash_flow_from_transaction
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_add_cash_flow_from_transaction();

CREATE OR REPLACE FUNCTION public.trigger_add_cash_flow_from_umkm_payment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.cash_flows (type, source, amount, description, session_id, recorded_by)
  VALUES (
    'expense',
    'payment',
    NEW.amount,
    'Pembayaran ke ' || (SELECT nama_umkm FROM public.umkm WHERE id = NEW.umkm_id),
    NULL,
    NEW.recorded_by
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cash_flow_from_umkm_payment ON public.umkm_payments;
CREATE TRIGGER trg_cash_flow_from_umkm_payment
  AFTER INSERT ON public.umkm_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_add_cash_flow_from_umkm_payment();

-- 5. VIEWS
CREATE OR REPLACE VIEW public.products_cashier_view AS
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
  FROM public.session_products sp
  JOIN public.master_products mp ON mp.id = sp.master_product_id;

CREATE OR REPLACE VIEW public.top_products_sales AS
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

-- Grants for views
GRANT SELECT ON public.products_cashier_view TO authenticated;
GRANT SELECT ON public.top_products_sales TO authenticated;
GRANT SELECT ON public.umkm_profit_contribution TO authenticated;
GRANT SELECT ON public.session_history_summary TO authenticated;

-- 6. RPC FUNCTIONS

-- 6.1 complete_transaction
CREATE OR REPLACE FUNCTION public.complete_transaction(
  p_session_id        UUID,
  p_cashier_id        UUID,
  p_nominal_diterima  INTEGER,
  p_cart_items        JSONB,
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
    v_harga_jual         := (v_item->>'harga_jual')::INTEGER;
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

-- 6.2 close_session
CREATE OR REPLACE FUNCTION public.close_session(
  p_session_id  UUID,
  p_admin_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_product_count       INTEGER;
  v_reconciliation_count INTEGER;
BEGIN
  -- Count active products for this session
  SELECT COUNT(*) INTO v_product_count
  FROM public.session_products sp
  WHERE sp.session_id = p_session_id AND sp.is_active = TRUE;

  -- Count submitted reconciliation records
  SELECT COUNT(*) INTO v_reconciliation_count
  FROM public.reconciliation
  WHERE session_id = p_session_id;

  -- All products must have reconciliation records
  IF v_reconciliation_count < v_product_count THEN
    RAISE EXCEPTION 'Reconciliation incomplete. % of % products reconciled.',
      v_reconciliation_count, v_product_count;
  END IF;

  -- Close the session
  UPDATE public.sessions
  SET
    status     = 'closed',
    closed_by  = p_admin_id,
    closed_at  = NOW()
  WHERE id = p_session_id AND status = 'open';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found or already closed.', p_session_id;
  END IF;

  RETURN jsonb_build_object('session_id', p_session_id, 'status', 'closed');
END;
$$;

-- 6.3 reopen_session
CREATE OR REPLACE FUNCTION public.reopen_session(
  p_session_id  UUID,
  p_admin_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_authorized BOOLEAN;
BEGIN
  SELECT COALESCE(
    (auth.jwt() -> 'user_metadata' ->> 'can_reopen_session')::BOOLEAN,
    (public.get_user_role() = 'admin')
  ) INTO v_is_authorized;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Unauthorized: User does not have can_reopen_session permission.';
  END IF;

  UPDATE public.sessions
  SET status = 'open', closed_by = NULL, closed_at = NULL
  WHERE id = p_session_id AND status = 'closed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session % not found or not in closed state.', p_session_id;
  END IF;

  RETURN jsonb_build_object('session_id', p_session_id, 'status', 'open');
END;
$$;

-- 6.4 reset_session (Development friendly: allows admin role or primary email)
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
  IF public.get_user_role() != 'admin' AND v_caller_email != 'marcellinusyovian@gmail.com' THEN
    RAISE EXCEPTION 'Access Denied: Admin role required to reset session.';
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

-- 6.5 get_session_financial_summary
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

-- 6.6 get_umkm_product_breakdown
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

-- 6.7 get_product_stock_recommendation
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

-- 6.8 get_umkm_product_performance
CREATE OR REPLACE FUNCTION public.get_umkm_product_performance(p_umkm_id uuid)
RETURNS TABLE(master_product_id uuid, nama_produk character varying, harga_asli numeric, total_terjual bigint, total_setoran numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mp.id as master_product_id,
    mp.nama_produk::varchar(255),
    mp.harga_asli::numeric,
    COALESCE(SUM(td.qty)::bigint, 0) as total_terjual,
    COALESCE(SUM(td.subtotal_harga_asli)::numeric, 0) as total_setoran
  FROM public.master_products mp
  LEFT JOIN public.session_products sp ON sp.master_product_id = mp.id
  LEFT JOIN public.transaction_details td ON td.session_product_id = sp.id
  WHERE mp.umkm_id = p_umkm_id
  GROUP BY mp.id, mp.nama_produk, mp.harga_asli;
END;
$$;

-- 6.9 get_umkm_session_history
CREATE OR REPLACE FUNCTION public.get_umkm_session_history(p_umkm_id uuid)
RETURNS TABLE(session_id uuid, session_date date, status character varying, total_terjual bigint, total_setoran numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as session_id,
    s.session_date,
    s.status,
    COALESCE(SUM(td.qty)::bigint, 0) as total_terjual,
    COALESCE(SUM(td.subtotal_harga_asli)::numeric, 0) as total_setoran
  FROM public.sessions s
  JOIN public.session_products sp ON sp.session_id = s.id
  JOIN public.master_products mp ON mp.id = sp.master_product_id
  LEFT JOIN public.transaction_details td ON td.session_product_id = sp.id
  WHERE mp.umkm_id = p_umkm_id
  GROUP BY s.id, s.session_date, s.status
  ORDER BY s.session_date DESC;
END;
$$;

-- 6.10 get_weekly_trends
CREATE OR REPLACE FUNCTION public.get_weekly_trends(p_limit integer DEFAULT 10)
RETURNS TABLE(session_id uuid, session_date date, gross_revenue bigint, total_remittance bigint, omk_net_profit bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    shs.session_id,
    shs.session_date,
    shs.gross_revenue::BIGINT,
    shs.total_remittance::BIGINT,
    shs.omk_net_profit::BIGINT
  FROM public.session_history_summary shs
  WHERE shs.status = 'closed'
  ORDER BY shs.session_date DESC
  LIMIT p_limit;
END;
$$;

-- 6.11 Cash Flow RPCs
CREATE OR REPLACE FUNCTION public.add_cash_flow(
  p_type VARCHAR(20),
  p_amount INTEGER,
  p_description TEXT,
  p_session_id UUID DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  type VARCHAR(20),
  source VARCHAR(20),
  amount INTEGER,
  description TEXT,
  session_id UUID,
  recorded_by UUID,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_source VARCHAR(20);
  v_recorded_by UUID;
BEGIN
  IF p_session_id IS NOT NULL THEN
    v_source := 'transaction';
  ELSE
    v_source := 'manual';
  END IF;
  
  v_recorded_by := COALESCE(p_recorded_by, auth.uid());
  
  RETURN QUERY
  INSERT INTO public.cash_flows (type, source, amount, description, session_id, recorded_by)
  VALUES (p_type, v_source, p_amount, p_description, p_session_id, v_recorded_by)
  RETURNING cash_flows.id, cash_flows.type, cash_flows.source, cash_flows.amount, cash_flows.description, cash_flows.session_id, cash_flows.recorded_by, cash_flows.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_cash_flow_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_income BIGINT,
  total_expense BIGINT,
  saldo BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN cf.type = 'income' THEN cf.amount ELSE 0 END), 0)::BIGINT AS total_income,
    COALESCE(SUM(CASE WHEN cf.type = 'expense' THEN cf.amount ELSE 0 END), 0)::BIGINT AS total_expense,
    COALESCE(SUM(CASE WHEN cf.type = 'income' THEN cf.amount ELSE -cf.amount END), 0)::BIGINT AS saldo
  FROM public.cash_flows cf
  WHERE (p_start_date IS NULL OR cf.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR cf.created_at::DATE <= p_end_date);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_cash_flow_list(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  type VARCHAR(20),
  source VARCHAR(20),
  amount INTEGER,
  description TEXT,
  session_id UUID,
  recorded_by UUID,
  created_at TIMESTAMPTZ,
  session_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cf.id,
    cf.type,
    cf.source,
    cf.amount,
    cf.description,
    cf.session_id,
    cf.recorded_by,
    cf.created_at,
    s.session_date
  FROM public.cash_flows cf
  LEFT JOIN public.sessions s ON cf.session_id = s.id
  WHERE (p_start_date IS NULL OR cf.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR cf.created_at::DATE <= p_end_date)
  ORDER BY cf.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_cash_flow_count(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(total_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::BIGINT
  FROM public.cash_flows cf
  WHERE (p_start_date IS NULL OR cf.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR cf.created_at::DATE <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- 6.12 UMKM Payment RPCs
CREATE OR REPLACE FUNCTION public.get_umkm_payment_summary()
RETURNS TABLE(
  umkm_id UUID,
  nama_umkm VARCHAR(100),
  total_terutang BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id AS umkm_id,
    u.nama_umkm,
    COALESCE(SUM(td.subtotal_harga_asli), 0)::BIGINT AS total_terutang
  FROM public.umkm u
  LEFT JOIN public.master_products mp ON mp.umkm_id = u.id
  LEFT JOIN public.session_products sp ON sp.master_product_id = mp.id
  LEFT JOIN public.transaction_details td ON td.session_product_id = sp.id
  WHERE u.is_active = true
  GROUP BY u.id, u.nama_umkm
  ORDER BY u.nama_umkm;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.mark_umkm_as_paid(
  p_umkm_id UUID,
  p_amount INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  umkm_id UUID,
  amount INTEGER,
  status VARCHAR(20),
  paid_at TIMESTAMPTZ,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_recorded_by UUID;
BEGIN
  v_recorded_by := COALESCE(p_recorded_by, auth.uid());
  
  RETURN QUERY
  INSERT INTO public.umkm_payments (umkm_id, amount, status, paid_at, recorded_by, notes)
  VALUES (p_umkm_id, p_amount, 'paid', NOW(), v_recorded_by, p_notes)
  RETURNING
    umkm_payments.id,
    umkm_payments.umkm_id,
    umkm_payments.amount,
    umkm_payments.status,
    umkm_payments.paid_at,
    umkm_payments.recorded_by,
    umkm_payments.notes,
    umkm_payments.created_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_umkm_payment_history(
  p_umkm_id UUID
)
RETURNS TABLE(
  id UUID,
  umkm_id UUID,
  amount INTEGER,
  status VARCHAR(20),
  paid_at TIMESTAMPTZ,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.umkm_id,
    up.amount,
    up.status,
    up.paid_at,
    up.recorded_by,
    up.notes,
    up.created_at
  FROM public.umkm_payments up
  WHERE up.umkm_id = p_umkm_id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_umkm_payment_history_all()
RETURNS TABLE(
  id UUID,
  umkm_id UUID,
  amount INTEGER,
  status VARCHAR(20),
  paid_at TIMESTAMPTZ,
  recorded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ,
  nama_umkm VARCHAR(100)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id,
    up.umkm_id,
    up.amount,
    up.status,
    up.paid_at,
    up.recorded_by,
    up.notes,
    up.created_at,
    u.nama_umkm
  FROM public.umkm_payments up
  JOIN public.umkm u ON up.umkm_id = u.id
  ORDER BY up.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 6.13 User Management RPCs (Admin only)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_email    TEXT,
  p_password TEXT,
  p_role     TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_password TEXT;
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Admin role required.';
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_password := crypt(p_password, gen_salt('bf'));

  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    phone_change, phone_change_token, reauthentication_token, email_change_token_current)
  VALUES (v_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    p_email, v_encrypted_password, now(),
    '{"provider": "email", "providers": ["email"]}',
    jsonb_build_object('role', p_role, 'email', p_email, 'email_verified', true, 'phone_verified', false, 'is_active', true),
    now(), now(), '', '', '', '', '', '', '', '');

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_user_id, v_user_id,
    jsonb_build_object('sub', v_user_id, 'email', p_email, 'email_verified', true, 'phone_verified', false),
    'email', v_user_id::text, now(), now(), now());

  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user(
  p_user_id  UUID,
  p_email    TEXT,
  p_password TEXT,
  p_role     TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Admin role required.';
  END IF;

  UPDATE auth.users
  SET email = COALESCE(p_email, email),
      raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', p_role, 'email', p_email),
      encrypted_password = CASE WHEN p_password IS NOT NULL AND p_password != ''
        THEN crypt(p_password, gen_salt('bf')) ELSE encrypted_password END,
      updated_at = now()
  WHERE id = p_user_id;

  UPDATE auth.identities
  SET identity_data = identity_data || jsonb_build_object('email', p_email),
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Admin role required.';
  END IF;
  DELETE FROM auth.identities WHERE user_id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_user_active(
  p_user_id   UUID,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Admin role required.';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Access Denied: You cannot modify your own active status.';
  END IF;

  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('is_active', p_is_active),
      updated_at = now()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_users()
RETURNS TABLE(id UUID, email VARCHAR, role TEXT, is_active BOOLEAN, created_at TIMESTAMPTZ, last_sign_in_at TIMESTAMPTZ, email_confirmed_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.get_user_role() != 'admin' THEN
    RAISE EXCEPTION 'Access Denied: Admin role required.';
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::varchar(255),
         (u.raw_user_meta_data->>'role')::text,
         COALESCE((u.raw_user_meta_data->>'is_active')::boolean, true) AS is_active,
         u.created_at, u.last_sign_in_at, u.email_confirmed_at
  FROM auth.users u;
END;
$$;

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_master_products_umkm ON public.master_products(umkm_id);
CREATE INDEX IF NOT EXISTS idx_master_products_active ON public.master_products(umkm_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_session_products_session ON public.session_products(session_id);
CREATE INDEX IF NOT EXISTS idx_session_products_master ON public.session_products(master_product_id);
CREATE INDEX IF NOT EXISTS idx_session_products_active ON public.session_products(session_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_td_session_product ON public.transaction_details(session_product_id);
CREATE INDEX IF NOT EXISTS idx_cash_flows_session ON public.cash_flows(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_flows_created ON public.cash_flows(created_at);
CREATE INDEX IF NOT EXISTS idx_cash_flows_type ON public.cash_flows(type);
CREATE INDEX IF NOT EXISTS idx_cash_flows_source ON public.cash_flows(source);
CREATE INDEX IF NOT EXISTS idx_umkm_payments_umkm ON public.umkm_payments(umkm_id);
CREATE INDEX IF NOT EXISTS idx_umkm_payments_status ON public.umkm_payments(status);
CREATE INDEX IF NOT EXISTS idx_umkm_payments_created ON public.umkm_payments(created_at);

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.umkm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umkm_payments ENABLE ROW LEVEL SECURITY;

-- umkm policies
DROP POLICY IF EXISTS "umkm_read_all" ON public.umkm;
CREATE POLICY "umkm_read_all" ON public.umkm FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "umkm_write_admin" ON public.umkm;
CREATE POLICY "umkm_write_admin" ON public.umkm FOR ALL USING (public.get_user_role() = 'admin');

-- master_products policies
DROP POLICY IF EXISTS "master_products_read_all" ON public.master_products;
CREATE POLICY "master_products_read_all" ON public.master_products FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "master_products_write_admin" ON public.master_products;
CREATE POLICY "master_products_write_admin" ON public.master_products FOR ALL USING (public.get_user_role() = 'admin');

-- sessions policies
DROP POLICY IF EXISTS "sessions_read_all" ON public.sessions;
CREATE POLICY "sessions_read_all" ON public.sessions FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "sessions_write_admin" ON public.sessions;
CREATE POLICY "sessions_write_admin" ON public.sessions FOR ALL USING (public.get_user_role() = 'admin');

-- session_products policies
DROP POLICY IF EXISTS "session_products_read_cashier" ON public.session_products;
CREATE POLICY "session_products_read_cashier" ON public.session_products FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "session_products_write_admin" ON public.session_products;
CREATE POLICY "session_products_write_admin" ON public.session_products FOR ALL USING (public.get_user_role() = 'admin');

-- transactions policies
DROP POLICY IF EXISTS "transactions_read_admin" ON public.transactions;
CREATE POLICY "transactions_read_admin" ON public.transactions FOR SELECT USING (public.get_user_role() = 'admin');

-- transaction_details policies
DROP POLICY IF EXISTS "td_read_admin" ON public.transaction_details;
CREATE POLICY "td_read_admin" ON public.transaction_details FOR SELECT USING (public.get_user_role() = 'admin');

-- reconciliation policies
DROP POLICY IF EXISTS "reconciliation_read_admin" ON public.reconciliation;
CREATE POLICY "reconciliation_read_admin" ON public.reconciliation FOR SELECT USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "reconciliation_update_admin" ON public.reconciliation;
CREATE POLICY "reconciliation_update_admin" ON public.reconciliation FOR UPDATE USING (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "reconciliation_write_admin" ON public.reconciliation;
CREATE POLICY "reconciliation_write_admin" ON public.reconciliation FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

-- cash_flows policies
DROP POLICY IF EXISTS "Allow authenticated users to view all cash_flows" ON public.cash_flows;
CREATE POLICY "Allow authenticated users to view all cash_flows" ON public.cash_flows FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert cash_flows" ON public.cash_flows;
CREATE POLICY "Allow authenticated users to insert cash_flows" ON public.cash_flows FOR INSERT TO authenticated WITH CHECK (auth.uid() = recorded_by);

DROP POLICY IF EXISTS "Allow authenticated users to update cash_flows" ON public.cash_flows;
CREATE POLICY "Allow authenticated users to update cash_flows" ON public.cash_flows FOR UPDATE TO authenticated USING (true);

-- umkm_payments policies
DROP POLICY IF EXISTS "Allow authenticated users to view all umkm_payments" ON public.umkm_payments;
CREATE POLICY "Allow authenticated users to view all umkm_payments" ON public.umkm_payments FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert umkm_payments" ON public.umkm_payments;
CREATE POLICY "Allow authenticated users to insert umkm_payments" ON public.umkm_payments FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to update umkm_payments" ON public.umkm_payments;
CREATE POLICY "Allow authenticated users to update umkm_payments" ON public.umkm_payments FOR UPDATE TO authenticated USING (true);

-- 9. REALTIME PUBLICATION
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.umkm;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.session_products;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 10. OPTIONAL SEED DATA (DEVELOPMENT TEST DATA)
-- Aktifkan data dummy UMKM dan Produk untuk tes POS
DO $$
DECLARE
  v_umkm_1 UUID;
  v_umkm_2 UUID;
  v_mp_1   UUID;
  v_mp_2   UUID;
  v_mp_3   UUID;
  v_session_id UUID;
BEGIN
  -- Insert UMKM
  INSERT INTO public.umkm (nama_umkm, kontak_wa)
  VALUES ('Dapur Berkat OMK', '081234567890')
  ON CONFLICT (nama_umkm) DO UPDATE SET nama_umkm = EXCLUDED.nama_umkm
  RETURNING id INTO v_umkm_1;

  INSERT INTO public.umkm (nama_umkm, kontak_wa)
  VALUES ('Camilan Kasih', '089876543210')
  ON CONFLICT (nama_umkm) DO UPDATE SET nama_umkm = EXCLUDED.nama_umkm
  RETURNING id INTO v_umkm_2;

  -- Insert Master Products
  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli)
  VALUES (v_umkm_1, 'Risoles Mayo Spesial', 3000)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_1;

  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli)
  VALUES (v_umkm_1, 'Pastel Ayam Telur', 3500)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_2;

  INSERT INTO public.master_products (umkm_id, nama_produk, harga_asli)
  VALUES (v_umkm_2, 'Es Teh Manis Segar', 2000)
  ON CONFLICT (umkm_id, nama_produk) DO UPDATE SET harga_asli = EXCLUDED.harga_asli
  RETURNING id INTO v_mp_3;

  -- Create Today / Current Open Session
  INSERT INTO public.sessions (session_date, status)
  VALUES (CURRENT_DATE, 'open')
  ON CONFLICT (session_date) DO UPDATE SET status = 'open'
  RETURNING id INTO v_session_id;

  -- Add Products to current session
  INSERT INTO public.session_products (session_id, master_product_id, harga_asli, harga_jual, stok_awal, stok_sekarang)
  VALUES
    (v_session_id, v_mp_1, 3000, 4000, 20, 20),
    (v_session_id, v_mp_2, 3500, 5000, 15, 15),
    (v_session_id, v_mp_3, 2000, 3000, 30, 30)
  ON CONFLICT (session_id, master_product_id) DO NOTHING;

END $$;
