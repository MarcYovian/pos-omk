-- Migration: 20261005000000_pure_rbac_platform_super_admin.sql
-- Description: Pure Relational RBAC, Platform Super Admin, and Complete Removal of Metadata Fallback

BEGIN;

-- ==============================================================================
-- 1. SEED PLATFORM SUPER ADMIN ROLE & PERMISSIONS
-- ==============================================================================

-- 1.1 Insert 'super_admin' Role
INSERT INTO public.roles (code, name, description, is_system)
VALUES (
  'super_admin',
  'Platform Super Administrator',
  'Akses penuh tanpa batas ke seluruh platform, paroki, dan konfigurasi sistem',
  true
)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, description = EXCLUDED.description, is_system = EXCLUDED.is_system;

-- 1.2 Insert Platform-Level Permissions
INSERT INTO public.permissions (code, name, module, description) VALUES
  ('platform:manage', 'Kelola Platform & Paroki', 'platform', 'Kelola paroki/organisasi, aktivasi status paroki, dan konfigurasi global platform'),
  ('users:manage_platform', 'Kelola Status Pengguna Global', 'users', 'Aktivasi dan deaktivasi akun pengguna di tingkat auth platform'),
  ('session:reset', 'Reset Darurat Sesi', 'session', 'Reset data transaksi dan stok sesi saat pengujian atau kondisi darurat')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name, module = EXCLUDED.module, description = EXCLUDED.description;

-- 1.3 Map All Permissions to 'super_admin' Role
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 1.4 Backfill Existing Admin User to 'super_admin' in user_roles
INSERT INTO public.user_roles (user_id, role_id)
SELECT u.id, r.id
FROM auth.users u
CROSS JOIN public.roles r
WHERE (u.email = 'marcellinusyovian@gmail.com' OR u.email = 'admin@pos.com')
  AND r.code = 'super_admin'
ON CONFLICT (user_id, role_id) DO NOTHING;


-- ==============================================================================
-- 2. REVISE DATABASE FUNCTIONS (DYNAMIC RBAC - NO METADATA / NO HARDCODED EMAIL)
-- ==============================================================================

-- 2.0 Drop Ambiguous Overloaded Functions
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.get_user_effective_permissions(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_weekly_trends(integer, uuid);
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);

-- 2.1 Dynamic Super Admin Identifier (Queries public.user_roles)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.code = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND r.code = 'super_admin'
  );
$$;

-- 2.2 Tenant Context Resolver (Pure Relational - No Hardcoded Email)
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
  v_fallback_id    UUID;
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
    
    -- Super Admin bebas mengakses company manapun yang valid
    IF public.is_super_admin(v_user_id) THEN
      IF EXISTS (SELECT 1 FROM public.companies c WHERE c.id = v_company_uuid AND c.is_active = TRUE) THEN
        RETURN v_company_uuid;
      END IF;
    END IF;

    -- Pengguna reguler harus terdaftar aktif di company_users tersebut
    IF EXISTS (
      SELECT 1 
      FROM public.company_users cu
      JOIN public.companies c ON c.id = cu.company_id
      WHERE cu.user_id = v_user_id 
        AND cu.company_id = v_company_uuid 
        AND cu.is_active = TRUE 
        AND c.is_active = TRUE
    ) THEN
      RETURN v_company_uuid;
    END IF;
  END IF;

  -- 3. Fallback: Ambil default company atau company pertama milik user
  SELECT cu.company_id INTO v_fallback_id
  FROM public.company_users cu
  JOIN public.companies c ON c.id = cu.company_id
  WHERE cu.user_id = v_user_id 
    AND cu.is_active = TRUE 
    AND c.is_active = TRUE
  ORDER BY cu.is_default DESC, cu.created_at ASC
  LIMIT 1;

  IF v_fallback_id IS NOT NULL THEN
    RETURN v_fallback_id;
  END IF;

  -- 4. Fallback untuk Super Admin tanpa company_users (default ke company aktif pertama di sistem)
  IF public.is_super_admin(v_user_id) THEN
    SELECT c.id INTO v_fallback_id
    FROM public.companies c
    WHERE c.is_active = TRUE
    ORDER BY c.created_at ASC
    LIMIT 1;

    RETURN v_fallback_id;
  END IF;

  RETURN NULL;
END;
$$;

-- 2.3 User Role Resolver (Pure Relational - No Metadata Fallback)
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
  -- 1. Super Admin is always 'super_admin'
  IF public.is_super_admin() THEN
    RETURN 'super_admin';
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

  -- 3. Fallback to global user_roles
  SELECT r.code INTO v_role_code
  FROM public.user_roles ur
  JOIN public.roles r ON r.id = ur.role_id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

  IF v_role_code IS NOT NULL THEN
    RETURN v_role_code;
  END IF;

  -- 4. Default safe fallback
  RETURN 'cashier';
END;
$$;

-- 2.4 Granular Permission Authorizer (Pure Relational - No Metadata Fallback)
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

  -- 0. Super Admin bypasses all checks
  IF public.is_super_admin(v_user_id) THEN
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

  -- 3. Fallback: Evaluasi user_roles
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

  RETURN FALSE;
END;
$$;

-- 2.5 Effective Permissions Fetcher
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(p_user_id UUID)
RETURNS TABLE (permission_code VARCHAR)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_is_super BOOLEAN := FALSE;
  v_is_admin BOOLEAN := FALSE;
  v_cid UUID := public.get_current_user_company_id();
BEGIN
  -- 0. Super Admin gets ALL permissions
  IF public.is_super_admin(p_user_id) THEN
    RETURN QUERY SELECT p.code::VARCHAR FROM public.permissions p;
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
      WHERE ur.user_id = p_user_id
        AND r.code = 'admin'
    ) INTO v_is_admin;
  END IF;

  IF v_is_admin THEN
    RETURN QUERY SELECT p.code FROM public.permissions p;
    RETURN;
  END IF;

  -- 2. Regular user: role permissions + user_permissions overrides
  RETURN QUERY
  WITH role_perms AS (
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
  ),
  user_overrides AS (
    SELECT p.code, up.is_granted
    FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id
      AND (v_cid IS NULL OR up.company_id = v_cid)
  )
  SELECT rp.code FROM role_perms rp
  WHERE rp.code NOT IN (SELECT uo.code FROM user_overrides uo WHERE uo.is_granted = FALSE)
  UNION
  SELECT uo.code FROM user_overrides uo WHERE uo.is_granted = TRUE;
END;
$$;

-- Overload for single parameter (backward compatibility)
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
  p_user_id UUID
)
RETURNS TABLE (permission_code VARCHAR)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.get_user_effective_permissions(p_user_id, NULL);
END;
$$;

-- 2.6 Emergency Reset Session RPC (Guarded by is_super_admin OR session:reset permission)
CREATE OR REPLACE FUNCTION public.reset_session(
  p_session_id  UUID,
  p_admin_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_super_admin() AND NOT public.authorize('session:reset') THEN
    RAISE EXCEPTION 'Access Denied: Memerlukan hak akses Reset Sesi (Platform Super Admin).';
  END IF;

  -- Hapus detail transaksi dan transaksi sesi
  DELETE FROM public.transaction_details
  WHERE transaction_id IN (SELECT id FROM public.transactions WHERE session_id = p_session_id);

  DELETE FROM public.transactions WHERE session_id = p_session_id;
  DELETE FROM public.reconciliation WHERE session_id = p_session_id;

  -- Kembalikan stok_sekarang ke stok_awal
  UPDATE public.session_products
  SET stok_sekarang = stok_awal
  WHERE session_id = p_session_id;

  -- Reset status sesi ke open
  UPDATE public.sessions
  SET status = 'open',
      closed_at = NULL,
      closed_by = NULL
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'message', 'Session successfully reset'
  );
END;
$$;

COMMIT;
