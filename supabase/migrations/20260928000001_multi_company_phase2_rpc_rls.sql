-- Migration: 20260928000001_multi_company_phase2_rpc_rls.sql
-- Description: Multi-Company Phase 2 - RPC Functions, Views, & Row-Level Security (RLS)

BEGIN;

-- ==============================================================================
-- 1. IDENTITAS & TENANT CONTEXT RESOLVER
-- ==============================================================================

-- 1.1 Super Admin Identifier
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT (auth.jwt() ->> 'email') = 'marcellinusyovian@gmail.com';
$$;

-- 1.2 Tenant Context Resolver (X-Company-Id Header + is_default Fallback)
CREATE OR REPLACE FUNCTION public.get_current_user_company_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_req_company_id TEXT;
  v_company_uuid   UUID;
  v_user_id        UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Coba baca dari HTTP header 'X-Company-Id' (disuntikkan oleh client / middleware)
  BEGIN
    v_req_company_id := current_setting('request.headers', true)::json->>'x-company-id';
  EXCEPTION WHEN OTHERS THEN
    v_req_company_id := NULL;
  END;

  -- 2. Jika ada header dan valid UUID
  IF v_req_company_id IS NOT NULL AND v_req_company_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_company_uuid := v_req_company_id::UUID;
    
    -- Super Admin bebas mengakses company manapun
    IF public.is_super_admin() THEN
      RETURN v_company_uuid;
    END IF;

    -- Pengguna reguler harus terdaftar aktif di company_users tersebut
    IF EXISTS (
      SELECT 1 FROM public.company_users
      WHERE user_id = v_user_id 
        AND company_id = v_company_uuid 
        AND is_active = TRUE
    ) THEN
      RETURN v_company_uuid;
    END IF;
  END IF;

  -- 3. Fallback: Ambil default company dari keanggotaan pengguna
  SELECT company_id INTO v_company_uuid
  FROM public.company_users
  WHERE user_id = v_user_id AND is_active = TRUE
  ORDER BY is_default DESC, created_at ASC
  LIMIT 1;

  -- 4. Fallback Super Admin jika belum terdaftar di company_users
  IF v_company_uuid IS NULL AND public.is_super_admin() THEN
    SELECT id INTO v_company_uuid FROM public.companies WHERE is_active = TRUE ORDER BY created_at ASC LIMIT 1;
  END IF;

  RETURN v_company_uuid;
END;
$$;

-- 1.3 Role Resolver per Tenant
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_role_code TEXT;
  v_cid UUID;
BEGIN
  -- 1. Super Admin is always 'admin'
  IF public.is_super_admin() THEN
    RETURN 'admin';
  END IF;

  -- 2. Check company_users for current active company
  v_cid := public.get_current_user_company_id();
  IF v_cid IS NOT NULL AND auth.uid() IS NOT NULL THEN
    SELECT r.code INTO v_role_code
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    WHERE cu.user_id = auth.uid()
      AND cu.company_id = v_cid
      AND cu.is_active = TRUE
    LIMIT 1;

    IF v_role_code IS NOT NULL THEN
      RETURN v_role_code;
    END IF;
  END IF;

  -- 3. Fallback to user_roles
  SELECT r.code INTO v_role_code
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

  IF v_role_code IS NOT NULL THEN
    RETURN v_role_code;
  END IF;

  -- 4. Fallback to JWT metadata
  RETURN COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', 'cashier');
END;
$$;

-- 1.4 Granular Permission Authorizer per Tenant
CREATE OR REPLACE FUNCTION public.authorize(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cid UUID;
  v_has_override BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 0. Super Admin bypass
  IF public.is_super_admin() THEN
    RETURN TRUE;
  END IF;

  v_cid := public.get_current_user_company_id();

  -- 1. Direct User Permission Override (Precedence Tertinggi di Company ini)
  IF v_cid IS NOT NULL THEN
    SELECT up.is_granted INTO v_has_override
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.company_id = v_cid 
      AND up.user_id = v_user_id 
      AND p.code = p_permission;

    IF v_has_override IS NOT NULL THEN
      RETURN v_has_override;
    END IF;
  END IF;

  -- 2. Evaluasi Role Permissions dari company_users
  IF v_cid IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.company_users cu
    JOIN public.roles r ON r.id = cu.role_id
    LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
    LEFT JOIN public.permissions p ON p.id = rp.permission_id
    WHERE cu.company_id = v_cid
      AND cu.user_id = v_user_id
      AND cu.is_active = TRUE
      AND (r.code = 'admin' OR p.code = p_permission)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Fallback: Evaluasi legacy user_roles jika company_users belum sinkron
  IF EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    LEFT JOIN public.role_permissions rp ON rp.role_id = r.id
    LEFT JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = v_user_id
      AND (r.code = 'admin' OR p.code = p_permission)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 4. Legacy Metadata Fallback (Backward Compatibility saat Deploy)
  IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 1.5 Effective Permissions Fetcher
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
  p_user_id UUID
)
RETURNS TABLE (permission_code VARCHAR)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
  v_cid UUID := public.get_current_user_company_id();
BEGIN
  -- 0. Cek apakah user adalah super admin
  IF EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p_user_id AND u.email = 'marcellinusyovian@gmail.com'
  ) THEN
    RETURN QUERY SELECT p.code FROM public.permissions p;
    RETURN;
  END IF;

  -- 1. Cek apakah user adalah admin di company ini
  IF v_cid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.company_id = v_cid
        AND cu.user_id = p_user_id
        AND cu.is_active = TRUE
        AND r.code = 'admin'
    ) INTO v_is_admin;
  END IF;

  -- Fallback cek user_roles jika belum ada company_users
  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = p_user_id AND r.code = 'admin'
    ) INTO v_is_admin;
  END IF;

  -- Fallback cek metadata
  IF NOT v_is_admin THEN
    SELECT COALESCE((raw_user_meta_data->>'role') = 'admin', FALSE)
    INTO v_is_admin
    FROM auth.users
    WHERE id = p_user_id;
  END IF;

  -- Jika admin, return semua permissions
  IF v_is_admin THEN
    RETURN QUERY
    SELECT p.code FROM public.permissions p;
    RETURN;
  END IF;

  -- Kembalikan izin berbasis role di company ini dikurangi revoke override ditambah grant override
  RETURN QUERY
  WITH base_permissions AS (
    SELECT DISTINCT p.code
    FROM public.company_users cu
    JOIN public.role_permissions rp ON rp.role_id = cu.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE cu.user_id = p_user_id 
      AND (v_cid IS NULL OR cu.company_id = v_cid)
      AND cu.is_active = TRUE
    UNION
    SELECT DISTINCT p.code
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.company_users WHERE user_id = p_user_id AND (v_cid IS NULL OR company_id = v_cid)
      )
  ),
  granted_overrides AS (
    SELECT p.code
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id 
      AND (v_cid IS NULL OR up.company_id = v_cid)
      AND up.is_granted = TRUE
  ),
  revoked_overrides AS (
    SELECT p.code
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id 
      AND (v_cid IS NULL OR up.company_id = v_cid)
      AND up.is_granted = FALSE
  )
  (
    SELECT code FROM base_permissions
    EXCEPT
    SELECT code FROM revoked_overrides
  )
  UNION
  SELECT code FROM granted_overrides;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
  p_user_id UUID,
  p_company_id UUID
)
RETURNS TABLE (permission_code VARCHAR)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
  v_cid UUID := COALESCE(p_company_id, public.get_current_user_company_id());
BEGIN
  -- 0. Cek apakah user adalah super admin
  IF EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = p_user_id AND u.email = 'marcellinusyovian@gmail.com'
  ) THEN
    RETURN QUERY SELECT p.code FROM public.permissions p;
    RETURN;
  END IF;

  -- 1. Cek apakah user adalah admin di company ini
  IF v_cid IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.company_users cu
      JOIN public.roles r ON r.id = cu.role_id
      WHERE cu.company_id = v_cid
        AND cu.user_id = p_user_id
        AND cu.is_active = TRUE
        AND r.code = 'admin'
    ) INTO v_is_admin;
  END IF;

  -- Fallback cek user_roles jika belum ada company_users
  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = p_user_id AND r.code = 'admin'
    ) INTO v_is_admin;
  END IF;

  -- Fallback cek metadata
  IF NOT v_is_admin THEN
    SELECT COALESCE((raw_user_meta_data->>'role') = 'admin', FALSE)
    INTO v_is_admin
    FROM auth.users
    WHERE id = p_user_id;
  END IF;

  -- Jika admin, return semua permissions
  IF v_is_admin THEN
    RETURN QUERY
    SELECT p.code FROM public.permissions p;
    RETURN;
  END IF;

  -- Kembalikan izin berbasis role di company ini dikurangi revoke override ditambah grant override
  RETURN QUERY
  WITH base_permissions AS (
    SELECT DISTINCT p.code
    FROM public.company_users cu
    JOIN public.role_permissions rp ON rp.role_id = cu.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE cu.user_id = p_user_id 
      AND (v_cid IS NULL OR cu.company_id = v_cid)
      AND cu.is_active = TRUE
    UNION
    SELECT DISTINCT p.code
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
      AND NOT EXISTS (
        SELECT 1 FROM public.company_users WHERE user_id = p_user_id AND (v_cid IS NULL OR company_id = v_cid)
      )
  ),
  granted_overrides AS (
    SELECT p.code
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id 
      AND (v_cid IS NULL OR up.company_id = v_cid)
      AND up.is_granted = TRUE
  ),
  revoked_overrides AS (
    SELECT p.code
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id 
      AND (v_cid IS NULL OR up.company_id = v_cid)
      AND up.is_granted = FALSE
  )
  (
    SELECT code FROM base_permissions
    EXCEPT
    SELECT code FROM revoked_overrides
  )
  UNION
  SELECT code FROM granted_overrides;
END;
$$;

-- ==============================================================================
-- 2. PENYELARASAN DATABASE VIEWS (WITH SECURITY_INVOKER = TRUE)
-- ==============================================================================

-- 2.1 View Kasir
CREATE OR REPLACE VIEW public.products_cashier_view 
WITH (security_invoker = true) AS
  SELECT
    sp.id,
    sp.session_id,
    mp.umkm_id,
    mp.nama_produk,
    sp.harga_jual,
    sp.stok_awal,
    sp.stok_sekarang,
    sp.is_active,
    sp.created_at,
    sp.company_id
  FROM public.session_products sp
  JOIN public.master_products mp ON mp.id = sp.master_product_id AND mp.company_id = sp.company_id;

GRANT SELECT ON public.products_cashier_view TO authenticated;

-- 2.2 View Riwayat Sesi
CREATE OR REPLACE VIEW public.session_history_summary 
WITH (security_invoker = true) AS
  SELECT 
    s.id AS session_id,
    s.session_date,
    s.status,
    s.closed_at,
    COUNT(DISTINCT t.id)::BIGINT AS transaction_count,
    COALESCE(SUM(t.total_harga_jual), 0)::BIGINT AS gross_revenue,
    COALESCE(SUM(td.subtotal_harga_asli), 0)::BIGINT AS total_remittance,
    (COALESCE(SUM(t.total_harga_jual), 0) - COALESCE(SUM(td.subtotal_harga_asli), 0))::BIGINT AS omk_net_profit,
    s.company_id,
    s.opened_at,
    COUNT(DISTINCT t.id)::BIGINT AS total_transactions
  FROM public.sessions s
  LEFT JOIN public.transactions t ON t.session_id = s.id AND t.company_id = s.company_id
  LEFT JOIN (
    SELECT 
      transaction_id, 
      SUM(subtotal_harga_asli) AS subtotal_harga_asli
    FROM public.transaction_details
    GROUP BY transaction_id
  ) td ON td.transaction_id = t.id
  GROUP BY s.id, s.company_id, s.session_date, s.status, s.opened_at, s.closed_at;

GRANT SELECT ON public.session_history_summary TO authenticated;

-- 2.3 View Top Products Sales
CREATE OR REPLACE VIEW public.top_products_sales 
WITH (security_invoker = true) AS
  WITH product_sales AS (
    SELECT mp.company_id, mp.id AS master_product_id, mp.nama_produk,
           COALESCE(SUM(td.qty), 0)::BIGINT AS total_sold
    FROM public.master_products mp
    JOIN public.session_products sp ON sp.master_product_id = mp.id AND sp.company_id = mp.company_id
    JOIN public.transaction_details td ON td.session_product_id = sp.id
    JOIN public.transactions t ON t.id = td.transaction_id AND t.company_id = mp.company_id
    JOIN public.sessions s ON s.id = t.session_id AND s.company_id = mp.company_id
    WHERE s.status = 'closed'
    GROUP BY mp.company_id, mp.id, mp.nama_produk
  ), product_stock AS (
    SELECT mp.company_id, mp.id AS master_product_id, SUM(sp.stok_awal) AS total_stok_awal
    FROM public.master_products mp
    JOIN public.session_products sp ON sp.master_product_id = mp.id AND sp.company_id = mp.company_id
    JOIN public.sessions s ON s.id = sp.session_id AND s.company_id = mp.company_id
    WHERE s.status = 'closed'
    GROUP BY mp.company_id, mp.id
  )
  SELECT ps.master_product_id, ps.nama_produk, ps.total_sold, pst.total_stok_awal,
         CASE WHEN pst.total_stok_awal > 0
           THEN ROUND((ps.total_sold::NUMERIC / pst.total_stok_awal::NUMERIC) * 100, 1)
           ELSE 0 END AS sell_through_rate,
         ps.company_id
  FROM product_sales ps
  JOIN product_stock pst ON pst.master_product_id = ps.master_product_id AND pst.company_id = ps.company_id
  ORDER BY ps.total_sold DESC;

GRANT SELECT ON public.top_products_sales TO authenticated;

-- 2.4 View UMKM Profit Contribution
CREATE OR REPLACE VIEW public.umkm_profit_contribution 
WITH (security_invoker = true) AS
  SELECT 
    u.nama_umkm,
    COALESCE(SUM(td.subtotal_harga_jual - td.subtotal_harga_asli), 0)::BIGINT AS omk_profit,
    u.company_id
  FROM public.umkm u
  JOIN public.master_products mp ON mp.umkm_id = u.id AND mp.company_id = u.company_id
  JOIN public.session_products sp ON sp.master_product_id = mp.id AND sp.company_id = u.company_id
  JOIN public.transaction_details td ON td.session_product_id = sp.id
  JOIN public.transactions t ON t.id = td.transaction_id AND t.company_id = u.company_id
  JOIN public.sessions s ON s.id = t.session_id AND s.company_id = u.company_id
  WHERE s.status = 'closed'
  GROUP BY u.company_id, u.nama_umkm;

GRANT SELECT ON public.umkm_profit_contribution TO authenticated;

-- ==============================================================================
-- 3. PEMBARUAN STORED PROCEDURES (RPC) & TRIGGERS
-- ==============================================================================

-- 3.1 Transaksi Kasir Atomik Multi-Tenant
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
  v_company_id         UUID;
  v_transaction_id     UUID;
  v_total_harga_jual   INTEGER := 0;
  v_item               JSONB;
  v_session_product_id UUID;
  v_qty                INTEGER;
  v_harga_jual         INTEGER;
  v_harga_asli         INTEGER;
  v_stok_sekarang      INTEGER;
  v_session_status     VARCHAR(20);
BEGIN
  -- 1. Ambil session status & company_id
  SELECT status, company_id INTO v_session_status, v_company_id 
  FROM public.sessions 
  WHERE id = p_session_id;

  IF v_session_status IS NULL THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;
  IF v_session_status != 'open' THEN
    RAISE EXCEPTION 'Session is closed. No transactions allowed.';
  END IF;

  -- 2. Hitung total belanja
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items) LOOP
    v_qty        := (v_item->>'qty')::INTEGER;
    v_harga_jual := (v_item->>'harga_jual')::INTEGER;
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid qty for item';
    END IF;
    v_total_harga_jual := v_total_harga_jual + (v_qty * v_harga_jual);
  END LOOP;

  -- 3. Validasi nominal bayar jika tunai
  IF p_metode_pembayaran = 'cash' AND p_nominal_diterima < v_total_harga_jual THEN
    RAISE EXCEPTION 'nominal_diterima (%) is less than total (%).', p_nominal_diterima, v_total_harga_jual;
  END IF;

  -- 4. Insert ke transactions (dengan company_id terisolasi)
  INSERT INTO public.transactions (
    company_id, session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran
  ) VALUES (
    v_company_id, p_session_id, p_cashier_id, v_total_harga_jual, p_nominal_diterima, p_metode_pembayaran
  ) RETURNING id INTO v_transaction_id;

  -- 5. Kunci baris stok dan potong stok secara atomik
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items) LOOP
    v_session_product_id := (v_item->>'product_id')::UUID;
    v_qty                := (v_item->>'qty')::INTEGER;
    v_harga_jual         := (v_item->>'harga_jual')::INTEGER;

    SELECT sp.stok_sekarang, sp.harga_asli
    INTO v_stok_sekarang, v_harga_asli
    FROM public.session_products sp
    WHERE sp.id = v_session_product_id 
      AND sp.session_id = p_session_id 
      AND sp.company_id = v_company_id
      AND sp.is_active = TRUE
    FOR UPDATE;

    IF v_stok_sekarang IS NULL THEN
      RAISE EXCEPTION 'Produk sesi % tidak ditemukan pada organisasi ini.', v_session_product_id;
    END IF;

    IF v_stok_sekarang < v_qty THEN
      RAISE EXCEPTION 'Stok tidak mencukupi untuk produk %. Tersedia: %, Diminta: %',
        v_session_product_id, v_stok_sekarang, v_qty;
    END IF;

    UPDATE public.session_products
    SET stok_sekarang = stok_sekarang - v_qty
    WHERE id = v_session_product_id;

    INSERT INTO public.transaction_details (
      transaction_id, session_product_id, qty, harga_jual_snapshot, harga_asli_snapshot
    ) VALUES (
      v_transaction_id, v_session_product_id, v_qty, v_harga_jual, v_harga_asli
    );
  END LOOP;

  RETURN jsonb_build_object(
    'transaction_id',    v_transaction_id,
    'total_harga_jual',  v_total_harga_jual,
    'nominal_diterima',  p_nominal_diterima,
    'kembalian',         (p_nominal_diterima - v_total_harga_jual),
    'metode_pembayaran', p_metode_pembayaran
  );
END;
$$;

-- 3.2 Triggers Otomatis Arus Kas
CREATE OR REPLACE FUNCTION public.trigger_add_cash_flow_from_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.cash_flows (
    company_id,
    type,
    source,
    amount,
    description,
    session_id,
    recorded_by
  ) VALUES (
    NEW.company_id,
    'income',
    'transaction',
    NEW.total_harga_jual,
    'Penjualan sesi tanggal ' || COALESCE((SELECT session_date::text FROM public.sessions WHERE id = NEW.session_id), ''),
    NEW.session_id,
    NEW.cashier_id
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_add_cash_flow_from_umkm_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    INSERT INTO public.cash_flows (
      company_id,
      type,
      source,
      amount,
      description,
      session_id,
      recorded_by
    ) VALUES (
      NEW.company_id,
      'expense',
      'payment',
      NEW.amount,
      'Pembayaran ke ' || COALESCE((SELECT nama_umkm FROM public.umkm WHERE id = NEW.umkm_id), 'UMKM'),
      NULL,
      NEW.recorded_by
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3.3 Tren Penjualan Mingguan
CREATE OR REPLACE FUNCTION public.get_weekly_trends(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(session_id uuid, session_date date, gross_revenue bigint, total_remittance bigint, omk_net_profit bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cid UUID := public.get_current_user_company_id();
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
    AND (v_cid IS NULL OR shs.company_id = v_cid)
  ORDER BY shs.session_date DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_weekly_trends(
  p_limit INTEGER,
  p_company_id UUID
)
RETURNS TABLE(session_id uuid, session_date date, gross_revenue bigint, total_remittance bigint, omk_net_profit bigint)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cid UUID := COALESCE(p_company_id, public.get_current_user_company_id());
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
    AND (v_cid IS NULL OR shs.company_id = v_cid)
  ORDER BY shs.session_date DESC
  LIMIT p_limit;
END;
$$;

-- 3.4 Arus Kas Manual & Agregasi
CREATE OR REPLACE FUNCTION public.add_cash_flow(
  p_type character varying,
  p_amount integer,
  p_description text,
  p_session_id uuid DEFAULT NULL::uuid,
  p_recorded_by uuid DEFAULT NULL::uuid
)
RETURNS TABLE(id uuid, type character varying, source character varying, amount integer, description text, session_id uuid, recorded_by uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source VARCHAR(20);
  v_recorded_by UUID;
  v_company_id UUID;
BEGIN
  IF p_session_id IS NOT NULL THEN
    v_source := 'transaction';
    SELECT s.company_id INTO v_company_id FROM public.sessions s WHERE s.id = p_session_id;
  ELSE
    v_source := 'manual';
    v_company_id := public.get_current_user_company_id();
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id wajib ditentukan untuk pencatatan arus kas';
  END IF;

  v_recorded_by := COALESCE(p_recorded_by, auth.uid());
  RETURN QUERY
  INSERT INTO public.cash_flows (company_id, type, source, amount, description, session_id, recorded_by)
  VALUES (v_company_id, p_type, v_source, p_amount, p_description, p_session_id, v_recorded_by)
  RETURNING cash_flows.id, cash_flows.type, cash_flows.source, cash_flows.amount, cash_flows.description, cash_flows.session_id, cash_flows.recorded_by, cash_flows.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cash_flow_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(total_income BIGINT, total_expense BIGINT, saldo BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cid UUID := public.get_current_user_company_id();
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN cf.type = 'income' THEN cf.amount ELSE 0 END), 0)::BIGINT AS total_income,
    COALESCE(SUM(CASE WHEN cf.type = 'expense' THEN cf.amount ELSE 0 END), 0)::BIGINT AS total_expense,
    COALESCE(SUM(CASE WHEN cf.type = 'income' THEN cf.amount ELSE -cf.amount END), 0)::BIGINT AS saldo
  FROM public.cash_flows cf
  WHERE (v_cid IS NULL OR cf.company_id = v_cid)
    AND (p_start_date IS NULL OR cf.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR cf.created_at::DATE <= p_end_date);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cash_flow_list(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(id UUID, type VARCHAR(20), source VARCHAR(20), amount INTEGER, description TEXT, session_id UUID, recorded_by UUID, created_at TIMESTAMPTZ, session_date DATE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cid UUID := public.get_current_user_company_id();
BEGIN
  RETURN QUERY
  SELECT
    cf.id, cf.type, cf.source, cf.amount, cf.description, cf.session_id, cf.recorded_by, cf.created_at, s.session_date
  FROM public.cash_flows cf
  LEFT JOIN public.sessions s ON cf.session_id = s.id
  WHERE (v_cid IS NULL OR cf.company_id = v_cid)
    AND (p_start_date IS NULL OR cf.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR cf.created_at::DATE <= p_end_date)
  ORDER BY cf.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cash_flow_count(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE(total_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cid UUID := public.get_current_user_company_id();
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::BIGINT
  FROM public.cash_flows cf
  WHERE (v_cid IS NULL OR cf.company_id = v_cid)
    AND (p_start_date IS NULL OR cf.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR cf.created_at::DATE <= p_end_date);
END;
$$;

-- 3.5 Pembayaran Mitra UMKM
CREATE OR REPLACE FUNCTION public.mark_umkm_as_paid(
  p_umkm_id UUID,
  p_amount INTEGER,
  p_notes TEXT DEFAULT NULL,
  p_recorded_by UUID DEFAULT NULL
)
RETURNS TABLE(id UUID, umkm_id UUID, amount INTEGER, status VARCHAR(20), paid_at TIMESTAMPTZ, recorded_by UUID, notes TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recorded_by UUID;
  v_company_id UUID;
BEGIN
  SELECT u.company_id INTO v_company_id FROM public.umkm u WHERE u.id = p_umkm_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'UMKM % tidak ditemukan', p_umkm_id;
  END IF;

  v_recorded_by := COALESCE(p_recorded_by, auth.uid());
  RETURN QUERY
  INSERT INTO public.umkm_payments (company_id, umkm_id, amount, status, paid_at, recorded_by, notes)
  VALUES (v_company_id, p_umkm_id, p_amount, 'paid', NOW(), v_recorded_by, p_notes)
  RETURNING
    umkm_payments.id, umkm_payments.umkm_id, umkm_payments.amount, umkm_payments.status,
    umkm_payments.paid_at, umkm_payments.recorded_by, umkm_payments.notes, umkm_payments.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_umkm_payment_summary()
RETURNS TABLE(umkm_id UUID, nama_umkm VARCHAR(100), total_terutang BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cid UUID := public.get_current_user_company_id();
BEGIN
  RETURN QUERY
  SELECT
    u.id AS umkm_id,
    u.nama_umkm,
    COALESCE(SUM(td.subtotal_harga_asli), 0)::BIGINT AS total_terutang
  FROM public.umkm u
  LEFT JOIN public.master_products mp ON mp.umkm_id = u.id AND (v_cid IS NULL OR mp.company_id = v_cid)
  LEFT JOIN public.session_products sp ON sp.master_product_id = mp.id AND (v_cid IS NULL OR sp.company_id = v_cid)
  LEFT JOIN public.transaction_details td ON td.session_product_id = sp.id
  WHERE u.is_active = true
    AND (v_cid IS NULL OR u.company_id = v_cid)
  GROUP BY u.id, u.nama_umkm
  ORDER BY u.nama_umkm;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_umkm_payment_history_all()
RETURNS TABLE(id uuid, umkm_id uuid, amount integer, status character varying, paid_at timestamp with time zone, recorded_by uuid, notes text, created_at timestamp with time zone, nama_umkm character varying)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cid UUID := public.get_current_user_company_id();
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
  WHERE (v_cid IS NULL OR up.company_id = v_cid)
  ORDER BY up.created_at DESC;
END;
$$;

-- 3.6 Grant Hak Eksekusi Dashboard Publik UMKM
GRANT EXECUTE ON FUNCTION public.get_umkm_product_performance(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_umkm_session_history(UUID) TO anon, authenticated;

-- ==============================================================================
-- 4. PENEGAKAN ROW-LEVEL SECURITY (RLS) KOMPREHENSIF
-- ==============================================================================

-- 4.0 Aktifkan RLS di 12 Tabel
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umkm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umkm_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 4.1 Companies
CREATE POLICY "tenant_companies_select" ON public.companies
  FOR SELECT TO authenticated
  USING (id = public.get_current_user_company_id() OR public.is_super_admin());

CREATE POLICY "tenant_companies_update" ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_super_admin() OR (id = public.get_current_user_company_id() AND public.get_user_role() = 'admin'))
  WITH CHECK (public.is_super_admin() OR (id = public.get_current_user_company_id() AND public.get_user_role() = 'admin'));

CREATE POLICY "tenant_companies_insert" ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

-- 4.2 Company Users
CREATE POLICY "tenant_company_users_select" ON public.company_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR company_id = public.get_current_user_company_id() OR public.is_super_admin());

CREATE POLICY "tenant_company_users_all" ON public.company_users
  FOR ALL TO authenticated
  USING (public.is_super_admin() OR (company_id = public.get_current_user_company_id() AND (public.get_user_role() = 'admin' OR public.authorize('users:manage'))))
  WITH CHECK (public.is_super_admin() OR (company_id = public.get_current_user_company_id() AND (public.get_user_role() = 'admin' OR public.authorize('users:manage'))));

-- 4.3 UMKM
ALTER POLICY "umkm_read_all" ON public.umkm
  USING (company_id = public.get_current_user_company_id() OR public.is_super_admin());

ALTER POLICY "umkm_read_all" ON public.umkm RENAME TO "tenant_umkm_select";

ALTER POLICY "umkm_write_admin" ON public.umkm
  USING (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('products:manage'))) OR public.is_super_admin())
  WITH CHECK (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('products:manage'))) OR public.is_super_admin());

ALTER POLICY "umkm_write_admin" ON public.umkm RENAME TO "tenant_umkm_all";

-- 4.4 Master Products
ALTER POLICY "master_products_read_all" ON public.master_products
  USING (company_id = public.get_current_user_company_id() OR public.is_super_admin());

ALTER POLICY "master_products_read_all" ON public.master_products RENAME TO "tenant_master_products_select";

ALTER POLICY "master_products_write_admin" ON public.master_products
  USING (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('products:manage'))) OR public.is_super_admin())
  WITH CHECK (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('products:manage'))) OR public.is_super_admin());

ALTER POLICY "master_products_write_admin" ON public.master_products RENAME TO "tenant_master_products_all";

-- 4.5 Sessions
ALTER POLICY "sessions_read_all" ON public.sessions
  USING (company_id = public.get_current_user_company_id() OR public.is_super_admin());

ALTER POLICY "sessions_read_all" ON public.sessions RENAME TO "tenant_sessions_select";

ALTER POLICY "sessions_write_admin" ON public.sessions
  USING (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('session:manage'))) OR public.is_super_admin())
  WITH CHECK (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('session:manage'))) OR public.is_super_admin());

ALTER POLICY "sessions_write_admin" ON public.sessions RENAME TO "tenant_sessions_all";

-- 4.6 Session Products
ALTER POLICY "session_products_read_cashier" ON public.session_products
  USING (company_id = public.get_current_user_company_id() OR public.is_super_admin());

ALTER POLICY "session_products_read_cashier" ON public.session_products RENAME TO "tenant_session_products_select";

ALTER POLICY "session_products_write_admin" ON public.session_products
  USING (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('session_stock:manage') OR public.authorize('session:manage'))) OR public.is_super_admin())
  WITH CHECK (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('session_stock:manage') OR public.authorize('session:manage'))) OR public.is_super_admin());

ALTER POLICY "session_products_write_admin" ON public.session_products RENAME TO "tenant_session_products_all";

-- 4.7 Transactions
ALTER POLICY "transactions_read_admin" ON public.transactions
  USING (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('cashflow:view'))) OR public.is_super_admin());

ALTER POLICY "transactions_read_admin" ON public.transactions RENAME TO "tenant_transactions_select";

CREATE POLICY "tenant_transactions_insert" ON public.transactions
  FOR INSERT TO authenticated
  WITH CHECK (company_id = public.get_current_user_company_id() OR public.is_super_admin());

-- 4.8 Transaction Details
ALTER POLICY "td_read_admin" ON public.transaction_details
  USING (
    EXISTS (
      SELECT 1 FROM public.transactions t 
      WHERE t.id = transaction_details.transaction_id 
        AND (t.company_id = public.get_current_user_company_id() OR public.is_super_admin())
    ) 
    AND (public.get_user_role() = 'admin' OR public.authorize('cashflow:view') OR public.is_super_admin())
  );

ALTER POLICY "td_read_admin" ON public.transaction_details RENAME TO "tenant_transaction_details_select";

-- 4.9 Cash Flows
ALTER POLICY "Allow authenticated users to view all cash_flows" ON public.cash_flows
  USING (company_id = public.get_current_user_company_id() OR public.is_super_admin());

ALTER POLICY "Allow authenticated users to view all cash_flows" ON public.cash_flows RENAME TO "tenant_cash_flows_select";

ALTER POLICY "Allow authenticated users to insert cash_flows" ON public.cash_flows
  WITH CHECK (company_id = public.get_current_user_company_id() OR public.is_super_admin());

ALTER POLICY "Allow authenticated users to insert cash_flows" ON public.cash_flows RENAME TO "tenant_cash_flows_insert";

ALTER POLICY "Allow authenticated users to update cash_flows" ON public.cash_flows
  USING (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('cashflow:manage'))) OR public.is_super_admin())
  WITH CHECK (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('cashflow:manage'))) OR public.is_super_admin());

ALTER POLICY "Allow authenticated users to update cash_flows" ON public.cash_flows RENAME TO "tenant_cash_flows_update";

-- 4.10 UMKM Payments
ALTER POLICY "Allow authenticated users to view all umkm_payments" ON public.umkm_payments
  USING (company_id = public.get_current_user_company_id() OR public.is_super_admin());

ALTER POLICY "Allow authenticated users to view all umkm_payments" ON public.umkm_payments RENAME TO "tenant_umkm_payments_select";

ALTER POLICY "Allow authenticated users to insert umkm_payments" ON public.umkm_payments
  WITH CHECK (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('umkm:payout'))) OR public.is_super_admin());

ALTER POLICY "Allow authenticated users to insert umkm_payments" ON public.umkm_payments RENAME TO "tenant_umkm_payments_insert";

ALTER POLICY "Allow authenticated users to update umkm_payments" ON public.umkm_payments
  USING (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('umkm:payout'))) OR public.is_super_admin())
  WITH CHECK (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('umkm:payout'))) OR public.is_super_admin());

ALTER POLICY "Allow authenticated users to update umkm_payments" ON public.umkm_payments RENAME TO "tenant_umkm_payments_update";

-- 4.11 Reconciliation
ALTER POLICY "reconciliation_read_admin" ON public.reconciliation
  USING (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('session:manage') OR public.authorize('reports:view'))) OR public.is_super_admin());

ALTER POLICY "reconciliation_read_admin" ON public.reconciliation RENAME TO "tenant_reconciliation_select";

ALTER POLICY "reconciliation_write_admin" ON public.reconciliation
  WITH CHECK (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('session:manage'))) OR public.is_super_admin());

ALTER POLICY "reconciliation_write_admin" ON public.reconciliation RENAME TO "tenant_reconciliation_insert";

ALTER POLICY "reconciliation_update_admin" ON public.reconciliation
  USING (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('session:manage'))) OR public.is_super_admin())
  WITH CHECK (((company_id = public.get_current_user_company_id()) AND (public.get_user_role() = 'admin' OR public.authorize('session:manage'))) OR public.is_super_admin());

ALTER POLICY "reconciliation_update_admin" ON public.reconciliation RENAME TO "tenant_reconciliation_update";

-- 4.12 User Permissions
ALTER POLICY "Users can read their own user_permissions or admin can read all" ON public.user_permissions
  USING (((company_id = public.get_current_user_company_id() AND (user_id = auth.uid() OR public.get_user_role() = 'admin' OR public.authorize('roles:manage') OR public.authorize('users:manage'))) OR public.is_super_admin()));

ALTER POLICY "Users can read their own user_permissions or admin can read all" ON public.user_permissions RENAME TO "tenant_user_permissions_select";

ALTER POLICY "Admins can manage user_permissions" ON public.user_permissions
  USING (((company_id = public.get_current_user_company_id() AND (public.get_user_role() = 'admin' OR public.authorize('roles:manage') OR public.authorize('users:manage'))) OR public.is_super_admin()))
  WITH CHECK (((company_id = public.get_current_user_company_id() AND (public.get_user_role() = 'admin' OR public.authorize('roles:manage') OR public.authorize('users:manage'))) OR public.is_super_admin()));

ALTER POLICY "Admins can manage user_permissions" ON public.user_permissions RENAME TO "tenant_user_permissions_all";

COMMIT;
