-- ==============================================================================
-- Migration: 20260922000000_create_rbac_tables.sql
-- Description: Dynamic Role-Based Access Control (RBAC) & Granular Permissions
-- ==============================================================================

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    module VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS public.user_permissions (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    is_granted BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    PRIMARY KEY (user_id, permission_id)
);

-- 2. Seed Modular Permissions
INSERT INTO public.permissions (code, name, module, description) VALUES
    ('pos:transact', 'Kasir POS', 'pos', 'Akses kasir POS, penjualan, pembayaran Cash/QRIS, cetak struk'),
    ('products:manage', 'Master Produk & UMKM', 'catalog', 'Kelola data master UMKM dan katalog master produk'),
    ('session_stock:manage', 'Alokasi Stok Sesi', 'catalog', 'Setup sesi mingguan, alokasi produk aktif, harga jual, dan stok awal'),
    ('session:manage', 'Operasional Sesi', 'session', 'Buka sesi, input rekonsiliasi stok fisik, dan tutup sesi'),
    ('session:reset', 'Reset & Buka Ulang Sesi', 'session', 'Buka kembali sesi atau reset data transaksi sesi untuk recovery'),
    ('cashflow:view', 'Lihat Finansial & Kas', 'finance', 'Lihat dashboard finansial sesi, riwayat transaksi, analitik, dan buku kas'),
    ('cashflow:manage', 'Kelola Buku Kas', 'finance', 'Catat kas masuk/keluar manual dan saldo awal kas operasional'),
    ('umkm:payout', 'Pembayaran UMKM', 'finance', 'Catat pelunasan bagi hasil konsinyasi ke mitra UMKM'),
    ('reports:view', 'Laporan WhatsApp', 'reports', 'Generate dan salin ringkasan laporan bagi hasil mitra UMKM'),
    ('users:manage', 'Kelola Pengguna', 'users', 'Buat akun, reset password, dan aktif/nonaktifkan akun kasir'),
    ('roles:manage', 'Kelola Peran & Izin', 'users', 'Konfigurasi peran dan hak akses kustom pengguna')
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, module = EXCLUDED.module, description = EXCLUDED.description;

-- 3. Seed Default System Roles
INSERT INTO public.roles (code, name, description, is_system) VALUES
    ('admin', 'Administrator', 'Akses penuh ke seluruh sistem dan konfigurasi (Superuser bypass)', true),
    ('cashier', 'Kasir', 'Akses operasional POS kasir untuk sesi aktif', true),
    ('treasurer', 'Bendahara', 'Akses laporan keuangan, buku kas, dan pencatatan pembayaran UMKM', false),
    ('stockkeeper', 'Logistik & Stok', 'Akses manajemen stok master, alokasi katalog sesi, dan rekonsiliasi', false)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description, is_system = EXCLUDED.is_system;

-- 4. Seed Role Permissions Mapping
-- Helper CTE to insert mappings cleanly
WITH role_perm_data AS (
    -- Admin has all permissions mapped
    SELECT 'admin' AS role_code, code AS perm_code FROM public.permissions
    UNION ALL
    -- Cashier
    SELECT 'cashier', 'pos:transact'
    UNION ALL
    -- Treasurer
    SELECT 'treasurer', 'cashflow:view'
    UNION ALL
    SELECT 'treasurer', 'cashflow:manage'
    UNION ALL
    SELECT 'treasurer', 'umkm:payout'
    UNION ALL
    SELECT 'treasurer', 'reports:view'
    UNION ALL
    -- Stockkeeper
    SELECT 'stockkeeper', 'products:manage'
    UNION ALL
    SELECT 'stockkeeper', 'session_stock:manage'
    UNION ALL
    SELECT 'stockkeeper', 'session:manage'
    UNION ALL
    SELECT 'stockkeeper', 'reports:view'
)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM role_perm_data d
JOIN public.roles r ON r.code = d.role_code
JOIN public.permissions p ON p.code = d.perm_code
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Stored Function: public.authorize(p_permission TEXT)
CREATE OR REPLACE FUNCTION public.authorize(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_has_override BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Direct User Permission Override (Precedence Tertinggi)
  SELECT up.is_granted INTO v_has_override
  FROM public.user_permissions up
  JOIN public.permissions p ON p.id = up.permission_id
  WHERE up.user_id = v_user_id AND p.code = p_permission;

  IF v_has_override IS NOT NULL THEN
    RETURN v_has_override;
  END IF;

  -- 2. Role Permissions Evaluation (Termasuk role 'admin' bypass)
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

  -- 3. Legacy Metadata Fallback (Backward Compatibility saat Deploy)
  IF (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 6. Stored Function: public.get_user_effective_permissions(p_user_id UUID)
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(p_user_id UUID)
RETURNS TABLE (permission_code VARCHAR)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Cek apakah user adalah admin
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id AND r.code = 'admin'
  ) INTO v_is_admin;

  -- Cek metadata jika belum ter-assign
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

  -- Kembalikan izin berbasis role dikurangi revoke override ditambah grant override
  RETURN QUERY
  WITH base_permissions AS (
    SELECT DISTINCT p.code
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON rp.role_id = ur.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = p_user_id
  ),
  granted_overrides AS (
    SELECT p.code
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id AND up.is_granted = TRUE
  ),
  revoked_overrides AS (
    SELECT p.code
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id AND up.is_granted = FALSE
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

-- 7. Auto-Backfill: Sync Existing auth.users to user_roles
INSERT INTO public.user_roles (user_id, role_id)
SELECT 
    u.id, 
    r.id
FROM auth.users u
JOIN public.roles r ON r.code = COALESCE(
    NULLIF(u.raw_user_meta_data->>'role', ''), 
    'cashier'
)
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 8. Row Level Security (RLS)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Read policies for authenticated users
CREATE POLICY "Authenticated users can read roles"
    ON public.roles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read permissions"
    ON public.permissions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read role_permissions"
    ON public.role_permissions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can read their own user_roles or admin can read all"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.authorize('roles:manage') OR public.authorize('users:manage'));

CREATE POLICY "Users can read their own user_permissions or admin can read all"
    ON public.user_permissions FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR public.authorize('roles:manage') OR public.authorize('users:manage'));

-- Write policies (Service role always bypasses RLS, but for client admin we check authorize('roles:manage'))
CREATE POLICY "Admins can manage roles"
    ON public.roles FOR ALL
    TO authenticated
    USING (public.authorize('roles:manage'))
    WITH CHECK (public.authorize('roles:manage'));

CREATE POLICY "Admins can manage role_permissions"
    ON public.role_permissions FOR ALL
    TO authenticated
    USING (public.authorize('roles:manage'))
    WITH CHECK (public.authorize('roles:manage'));

CREATE POLICY "Admins can manage user_roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.authorize('users:manage') OR public.authorize('roles:manage'))
    WITH CHECK (public.authorize('users:manage') OR public.authorize('roles:manage'));

CREATE POLICY "Admins can manage user_permissions"
    ON public.user_permissions FOR ALL
    TO authenticated
    USING (public.authorize('roles:manage') OR public.authorize('users:manage'))
    WITH CHECK (public.authorize('roles:manage') OR public.authorize('users:manage'));
