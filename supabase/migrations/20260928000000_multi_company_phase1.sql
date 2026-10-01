-- Migration: 20260928000000_multi_company_phase1.sql
-- Description: Multi-Company Phase 1 - Tables, Columns, Backfill, and Constraints

BEGIN;

-- 1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(50)  NOT NULL UNIQUE,
  logo_url    TEXT,
  address     TEXT,
  phone       VARCHAR(20),
  email       VARCHAR(100),
  settings    JSONB NOT NULL DEFAULT '{
    "report_signature": "Sie Kewirausahaan OMK",
    "currency": "IDR",
    "timezone": "Asia/Jakarta"
  }',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create company_users table
CREATE TABLE IF NOT EXISTS public.company_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_users_unique_membership UNIQUE (company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_users_user ON public.company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company ON public.company_users(company_id);

-- 3. Seed Default Company for Existing Data
INSERT INTO public.companies (
  id,
  name,
  slug,
  settings,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'OMK Paroki Default',
  'omk-default',
  '{"report_signature": "Sie Kewirausahaan OMK", "currency": "IDR", "timezone": "Asia/Jakarta"}',
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- 4. Add company_id columns as NULLABLE
ALTER TABLE public.umkm ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.master_products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.session_products ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.cash_flows ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.umkm_payments ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.reconciliation ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 5. Backfill Existing Data
UPDATE public.umkm SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.master_products SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.sessions SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.session_products SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.transactions SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.cash_flows SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.umkm_payments SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.reconciliation SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;
UPDATE public.user_permissions SET company_id = '00000000-0000-0000-0000-000000000001' WHERE company_id IS NULL;

-- 6. Backfill company_users from user_roles
INSERT INTO public.company_users (company_id, user_id, role_id, is_default, is_active)
SELECT 
  '00000000-0000-0000-0000-000000000001',
  ur.user_id,
  ur.role_id,
  TRUE,
  TRUE
FROM public.user_roles ur
ON CONFLICT (company_id, user_id) DO NOTHING;

-- 7. Apply NOT NULL Constraints
ALTER TABLE public.umkm ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.master_products ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.sessions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.session_products ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.transactions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.cash_flows ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.umkm_payments ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.reconciliation ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.user_permissions ALTER COLUMN company_id SET NOT NULL;

-- Penyesuaian Primary Key user_permissions
ALTER TABLE public.user_permissions DROP CONSTRAINT IF EXISTS user_permissions_pkey;
ALTER TABLE public.user_permissions ADD PRIMARY KEY (company_id, user_id, permission_id);

-- 8. Update Unique Constraints
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_session_date_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_company_date_unique') THEN
    ALTER TABLE public.sessions ADD CONSTRAINT sessions_company_date_unique UNIQUE (company_id, session_date);
  END IF;
END $$;

ALTER TABLE public.umkm DROP CONSTRAINT IF EXISTS umkm_nama_umkm_key;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'umkm_company_nama_unique') THEN
    ALTER TABLE public.umkm ADD CONSTRAINT umkm_company_nama_unique UNIQUE (company_id, nama_umkm);
  END IF;
END $$;

ALTER TABLE public.master_products DROP CONSTRAINT IF EXISTS master_products_unique_per_umkm;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'master_products_company_umkm_nama_unique') THEN
    ALTER TABLE public.master_products ADD CONSTRAINT master_products_company_umkm_nama_unique UNIQUE (company_id, umkm_id, nama_produk);
  END IF;
END $$;

-- 9. Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_umkm_company ON public.umkm(company_id);
CREATE INDEX IF NOT EXISTS idx_master_products_company ON public.master_products(company_id);
CREATE INDEX IF NOT EXISTS idx_sessions_company ON public.sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_session_products_company ON public.session_products(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_flows_company ON public.cash_flows(company_id);
CREATE INDEX IF NOT EXISTS idx_umkm_payments_company ON public.umkm_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_company ON public.reconciliation(company_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_company ON public.user_permissions(company_id);

COMMIT;
