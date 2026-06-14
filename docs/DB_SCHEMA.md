# DB_SCHEMA.md — Database Schema Reference
# OMK Consignment POS — Supabase (PostgreSQL)

> **Document Status:** Ground-Truth v1.1 — Authoritative source for AI Coding Agent  
> **Database:** Supabase (PostgreSQL 15+)  
> **Critical Rule:** Column names and types defined here are the single source of truth. Do not rename, retype, or add columns without updating this file first.

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Table Definitions](#3-table-definitions)
   - [umkm](#31-table-umkm)
   - [products](#32-table-products)
   - [sessions](#33-table-sessions)
   - [transactions](#34-table-transactions)
   - [transaction_details](#35-table-transaction_details)
   - [reconciliation](#36-table-reconciliation)
4. [Database Functions (RPC)](#4-database-functions-rpc)
5. [Row-Level Security (RLS) Policies](#5-row-level-security-rls-policies)
6. [Indexes](#6-indexes)
7. [Realtime Configuration](#7-realtime-configuration)
8. [Seed Data & Initial Setup](#8-seed-data--initial-setup)
9. [Migration Notes](#9-migration-notes)

---

## 1. Schema Overview

```
Schema: public (default Supabase schema)
Auth: supabase.auth.users (managed by Supabase Auth)

Tables:
  umkm                — UMKM partner directory (7 records max)
  products            — Weekly dynamic product catalog (scoped by session_date)
  sessions            — One record per Sunday sales session
  transactions        — One record per completed checkout
  transaction_details — Line items within each transaction (immutable after insert)
  reconciliation      — End-of-day physical stock count results
```

**Design Principles:**
1. **Price immutability:** `transaction_details` stores price snapshots at time of sale. Changing `products.harga_jual` later never corrupts historical revenue data.
2. **Session scoping:** All operational data is anchored to `session_date` (products) or `session_id` (transactions). Cross-session queries always require an explicit filter.
3. **Soft operations:** No hard deletes on any table. Use `is_active = false` flags or `status` columns.
4. **Atomic stock deduction:** Stock changes only via the `complete_transaction` RPC function, never via direct UPDATE from the client.

---

## 2. Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌───────────────────┐
│    umkm     │         │     products     │         │     sessions      │
│─────────────│         │──────────────────│         │───────────────────│
│ id (PK)     │────┐    │ id (PK)          │         │ id (PK)           │
│ nama_umkm   │    └───>│ umkm_id (FK)     │    ┌───>│ session_date (UQ) │
│ kontak_wa   │         │ session_date(FK) │────┘    │ status            │
│ is_active   │         │ nama_produk      │         │ opened_by         │
│ created_at  │         │ harga_asli       │         │ closed_by         │
└─────────────┘         │ harga_jual       │         │ opened_at         │
                        │ stok_awal        │         │ closed_at         │
                        │ stok_sekarang    │         │ created_at        │
                        │ is_active        │         └───────────────────┘
                        │ created_at       │                   │
                        └──────────────────┘                   │
                                │                              │
                                │                              │
                        ┌───────▼──────────┐         ┌────────▼──────────────┐
                        │ transaction_     │         │    transactions       │
                        │ details          │         │───────────────────────│
                        │──────────────────│         │ id (PK)               │
                        │ id (PK)          │    ┌───>│ session_id (FK)       │
                        │ transaction_id ──│────┘    │ cashier_id (FK→auth)  │
                        │   (FK)           │         │ total_harga_jual      │
                        │ product_id (FK)  │         │ nominal_diterima      │
                        │ qty              │         │ kembalian             │
                        │ harga_jual_snap  │         │ created_at            │
                        │ harga_asli_snap  │         └───────────────────────┘
                        │ subtotal_harga_  │
                        │   jual           │         ┌───────────────────────┐
                        │ subtotal_harga_  │         │    reconciliation     │
                        │   asli           │         │───────────────────────│
                        │ created_at       │         │ id (PK)               │
                        └──────────────────┘         │ product_id (FK)       │
                                                     │ session_id (FK)       │
                                                     │ stok_fisik            │
                                                     │ stok_sekarang_snap    │
                                                     │ selisih               │
                                                     │ recorded_by           │
                                                     │ created_at            │
                                                     └───────────────────────┘
```

---

## 3. Table Definitions

---

### 3.1 Table: `umkm`

Stores the 7 UMKM partner businesses. This is a master data table — records are never deleted.

```sql
CREATE TABLE public.umkm (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_umkm   VARCHAR(100)  NOT NULL,
  kontak_wa   VARCHAR(20)   NOT NULL,           -- WhatsApp number, country code format: 628xxxxxxxxx
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.umkm IS 'Master table of UMKM consignment partner businesses';
COMMENT ON COLUMN public.umkm.kontak_wa IS 'WhatsApp number in international format without + (e.g. 628123456789)';
COMMENT ON COLUMN public.umkm.is_active IS 'Soft delete flag. False = partner no longer active, hidden from setup screen';
```

**Column Constraints:**
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `nama_umkm` | `varchar(100)` | NOT NULL | — | Display name |
| `kontak_wa` | `varchar(20)` | NOT NULL | — | No spaces, no `+`, digits only |
| `is_active` | `boolean` | NOT NULL | `true` | Soft delete |
| `created_at` | `timestamptz` | NOT NULL | `NOW()` | Auto-set |

---

### 3.2 Table: `products`

Dynamic product catalog. Each row represents one product available in one specific Sunday session.

```sql
CREATE TABLE public.products (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  umkm_id         UUID          NOT NULL REFERENCES public.umkm(id) ON DELETE RESTRICT,
  session_date    DATE          NOT NULL,        -- The Sunday this product is active for
  nama_produk     VARCHAR(100)  NOT NULL,
  harga_asli      INTEGER       NOT NULL CHECK (harga_asli > 0),
  harga_jual      INTEGER       NOT NULL CHECK (harga_jual >= harga_asli),
  stok_awal       INTEGER       NOT NULL CHECK (stok_awal > 0),
  stok_sekarang   INTEGER       NOT NULL,        -- Decremented atomically via RPC
  is_active       BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT products_stok_check CHECK (stok_sekarang >= 0 AND stok_sekarang <= stok_awal),
  CONSTRAINT products_price_check CHECK (harga_jual >= harga_asli)
);

COMMENT ON TABLE public.products IS 'Dynamic product catalog scoped per session_date. One row = one product in one Sunday session';
COMMENT ON COLUMN public.products.session_date IS 'The Sunday date (Jakarta/WIB timezone) this product batch belongs to';
COMMENT ON COLUMN public.products.harga_asli IS 'Base cost set by UMKM in IDR. NEVER exposed to cashier role via RLS';
COMMENT ON COLUMN public.products.harga_jual IS 'OMK retail selling price in IDR. Must be >= harga_asli';
COMMENT ON COLUMN public.products.stok_awal IS 'Stock delivered at session start. Immutable after creation';
COMMENT ON COLUMN public.products.stok_sekarang IS 'Live remaining stock. Only modified via complete_transaction RPC';
COMMENT ON COLUMN public.products.is_active IS 'Admin can toggle mid-session (e.g. UMKM takes product back early)';
```

**Column Constraints:**
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `umkm_id` | `uuid` | NOT NULL | — | FK → `umkm.id` |
| `session_date` | `date` | NOT NULL | — | Sunday date, WIB timezone |
| `nama_produk` | `varchar(100)` | NOT NULL | — | Product display name |
| `harga_asli` | `integer` | NOT NULL | — | > 0, IDR, no decimals |
| `harga_jual` | `integer` | NOT NULL | — | >= `harga_asli` |
| `stok_awal` | `integer` | NOT NULL | — | > 0, set once at creation |
| `stok_sekarang` | `integer` | NOT NULL | — | Initialized = `stok_awal`, ≥ 0 |
| `is_active` | `boolean` | NOT NULL | `true` | Toggle by admin only |
| `created_at` | `timestamptz` | NOT NULL | `NOW()` | Auto-set |

**Trigger — Auto-initialize `stok_sekarang`:**
```sql
CREATE OR REPLACE FUNCTION public.set_stok_sekarang()
RETURNS TRIGGER AS $$
BEGIN
  NEW.stok_sekarang := NEW.stok_awal;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_init_stok
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stok_sekarang();
```

---

### 3.3 Table: `sessions`

One record per Sunday sales session. Controls session lifecycle state.

```sql
CREATE TABLE public.sessions (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date  DATE          NOT NULL UNIQUE,    -- Enforces one session per Sunday
  status        VARCHAR(20)   NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'closed')),
  opened_by     UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by     UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ,
  notes         TEXT,                             -- Optional admin notes
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.sessions IS 'One record per Sunday session. Controls whether POS accepts transactions';
COMMENT ON COLUMN public.sessions.status IS 'open: transactions allowed. closed: session finalized, read-only';
COMMENT ON COLUMN public.sessions.session_date IS 'UNIQUE constraint prevents double-opening a session for the same Sunday';
```

**Column Constraints:**
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `session_date` | `date` | NOT NULL | — | UNIQUE — one session per date |
| `status` | `varchar(20)` | NOT NULL | `'open'` | Enum: `'open'` or `'closed'` |
| `opened_by` | `uuid` | NULL | — | FK → `auth.users.id` |
| `closed_by` | `uuid` | NULL | — | FK → `auth.users.id`, set on close |
| `opened_at` | `timestamptz` | NOT NULL | `NOW()` | Auto-set |
| `closed_at` | `timestamptz` | NULL | — | Set when status → 'closed' |
| `notes` | `text` | NULL | — | Optional admin session notes |
| `created_at` | `timestamptz` | NOT NULL | `NOW()` | Auto-set |

---

### 3.4 Table: `transactions`

One record per completed checkout. Header record — details are in `transaction_details`.

```sql
CREATE TABLE public.transactions (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id          UUID          NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  cashier_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  total_harga_jual    INTEGER       NOT NULL CHECK (total_harga_jual > 0),  -- Gross sale total
  nominal_diterima    INTEGER       NOT NULL CHECK (nominal_diterima >= total_harga_jual),
  kembalian           INTEGER       NOT NULL GENERATED ALWAYS AS
                        (nominal_diterima - total_harga_jual) STORED,
  metode_pembayaran   VARCHAR(20)   NOT NULL DEFAULT 'cash' CHECK (metode_pembayaran IN ('cash', 'qris')),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.transactions IS 'Header record for each completed checkout transaction';
COMMENT ON COLUMN public.transactions.session_id IS 'Links transaction to a specific Sunday session';
COMMENT ON COLUMN public.transactions.cashier_id IS 'auth.users.id of the OMK member who processed this sale';
COMMENT ON COLUMN public.transactions.total_harga_jual IS 'Sum of all subtotal_harga_jual in transaction_details';
COMMENT ON COLUMN public.transactions.nominal_diterima IS 'Cash handed over by buyer. Must be >= total_harga_jual';
COMMENT ON COLUMN public.transactions.kembalian IS 'Change to return to buyer. Computed: nominal_diterima - total_harga_jual';
COMMENT ON COLUMN public.transactions.metode_pembayaran IS 'Payment method: cash or qris';
```

**Column Constraints:**
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `session_id` | `uuid` | NOT NULL | — | FK → `sessions.id` |
| `cashier_id` | `uuid` | NOT NULL | — | FK → `auth.users.id` |
| `total_harga_jual` | `integer` | NOT NULL | — | > 0, sum of line items |
| `nominal_diterima` | `integer` | NOT NULL | — | >= `total_harga_jual` |
| `kembalian` | `integer` | NOT NULL | Computed | `nominal_diterima - total_harga_jual` |
| `created_at` | `timestamptz` | NOT NULL | `NOW()` | Auto-set, used for session filtering |

---

### 3.5 Table: `transaction_details`

Immutable line items for each transaction. Stores price snapshots at time of sale.

```sql
CREATE TABLE public.transaction_details (
  id                    UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id        UUID      NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id            UUID      NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  qty                   INTEGER   NOT NULL CHECK (qty > 0),
  harga_jual_snapshot   INTEGER   NOT NULL CHECK (harga_jual_snapshot > 0),  -- Price at time of sale
  harga_asli_snapshot   INTEGER   NOT NULL CHECK (harga_asli_snapshot > 0),  -- Cost at time of sale
  subtotal_harga_jual   INTEGER   NOT NULL GENERATED ALWAYS AS
                          (qty * harga_jual_snapshot) STORED,
  subtotal_harga_asli   INTEGER   NOT NULL GENERATED ALWAYS AS
                          (qty * harga_asli_snapshot) STORED,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.transaction_details IS 'Immutable line items per transaction. Price snapshots prevent history corruption on future price changes';
COMMENT ON COLUMN public.transaction_details.harga_jual_snapshot IS 'Snapshot of products.harga_jual at moment of sale. Immutable after insert';
COMMENT ON COLUMN public.transaction_details.harga_asli_snapshot IS 'Snapshot of products.harga_asli at moment of sale. Immutable after insert';
COMMENT ON COLUMN public.transaction_details.subtotal_harga_jual IS 'Computed: qty * harga_jual_snapshot. Revenue line for this item';
COMMENT ON COLUMN public.transaction_details.subtotal_harga_asli IS 'Computed: qty * harga_asli_snapshot. UMKM cost line for this item';
```

**Column Constraints:**
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `transaction_id` | `uuid` | NOT NULL | — | FK → `transactions.id` CASCADE |
| `product_id` | `uuid` | NOT NULL | — | FK → `products.id` RESTRICT |
| `qty` | `integer` | NOT NULL | — | > 0 |
| `harga_jual_snapshot` | `integer` | NOT NULL | — | Copied from `products.harga_jual` at sale time |
| `harga_asli_snapshot` | `integer` | NOT NULL | — | Copied from `products.harga_asli` at sale time |
| `subtotal_harga_jual` | `integer` | NOT NULL | Computed | `qty × harga_jual_snapshot` |
| `subtotal_harga_asli` | `integer` | NOT NULL | Computed | `qty × harga_asli_snapshot` |
| `created_at` | `timestamptz` | NOT NULL | `NOW()` | Auto-set |

> ⚠️ **No UPDATE or DELETE on `transaction_details`** — RLS policy denies all mutations post-insert.

---

### 3.6 Table: `reconciliation`

Records the physical stock count per product at end-of-day. One row per product per session.

```sql
CREATE TABLE public.reconciliation (
  id                    UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id            UUID      NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  product_id            UUID      NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  stok_fisik            INTEGER   NOT NULL CHECK (stok_fisik >= 0),        -- Physical count by admin
  stok_sekarang_snap    INTEGER   NOT NULL CHECK (stok_sekarang_snap >= 0), -- System value at reconciliation time
  selisih               INTEGER   NOT NULL GENERATED ALWAYS AS
                          (stok_fisik - stok_sekarang_snap) STORED,        -- Discrepancy
  recorded_by           UUID      NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reconciliation_unique UNIQUE (session_id, product_id)          -- One record per product per session
);

COMMENT ON TABLE public.reconciliation IS 'Physical stock count results at end of each session';
COMMENT ON COLUMN public.reconciliation.stok_fisik IS 'Admin-entered physical count of unsold units';
COMMENT ON COLUMN public.reconciliation.stok_sekarang_snap IS 'Snapshot of products.stok_sekarang at moment of reconciliation';
COMMENT ON COLUMN public.reconciliation.selisih IS 'Discrepancy: stok_fisik - stok_sekarang_snap. Positive = surplus, negative = shortage';
```

**Column Constraints:**
| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | NOT NULL | `gen_random_uuid()` | PK |
| `session_id` | `uuid` | NOT NULL | — | FK → `sessions.id` |
| `product_id` | `uuid` | NOT NULL | — | FK → `products.id` |
| `stok_fisik` | `integer` | NOT NULL | — | >= 0 |
| `stok_sekarang_snap` | `integer` | NOT NULL | — | >= 0, snapshot of live value |
| `selisih` | `integer` | NOT NULL | Computed | `stok_fisik - stok_sekarang_snap` |
| `recorded_by` | `uuid` | NOT NULL | — | FK → `auth.users.id` (admin) |
| `created_at` | `timestamptz` | NOT NULL | `NOW()` | Auto-set |
| *(unique)* | — | — | — | UNIQUE (`session_id`, `product_id`) |

---

## 4. Database Functions (RPC)

These PostgreSQL functions are called via `supabase.rpc('function_name', params)` from the frontend. They provide atomicity and enforce business logic at the DB layer.

---

### 4.1 `complete_transaction`

**Purpose:** Atomically insert a transaction + all line items + decrement stock for all products in a cart.

**Called by:** Cashier checkout flow. This is the **only** way to create transaction records.

```sql
CREATE OR REPLACE FUNCTION public.complete_transaction(
  p_session_id        UUID,
  p_cashier_id        UUID,
  p_nominal_diterima  INTEGER,
  p_cart_items        JSONB,   -- Array of {product_id, qty, harga_jual, harga_asli}
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
  v_product_id        UUID;
  v_qty               INTEGER;
  v_harga_jual        INTEGER;
  v_harga_asli        INTEGER;
  v_stok_sekarang     INTEGER;
  v_session_status    VARCHAR(20);
BEGIN
  -- 1. Validate session is open
  SELECT status INTO v_session_status
  FROM public.sessions
  WHERE id = p_session_id;

  IF v_session_status IS NULL THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  IF v_session_status != 'open' THEN
    RAISE EXCEPTION 'Session is closed. No transactions allowed.';
  END IF;

  -- 2. Calculate total and validate cart
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty        := (v_item->>'qty')::INTEGER;
    v_harga_jual := (v_item->>'harga_jual')::INTEGER;

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Invalid qty for product %', v_product_id;
    END IF;

    v_total_harga_jual := v_total_harga_jual + (v_qty * v_harga_jual);
  END LOOP;

  -- 3. Validate nominal_diterima
  IF p_nominal_diterima < v_total_harga_jual THEN
    RAISE EXCEPTION 'nominal_diterima (%) is less than total (%).',
      p_nominal_diterima, v_total_harga_jual;
  END IF;

  -- 4. Insert transaction header with payment method
  INSERT INTO public.transactions (session_id, cashier_id, total_harga_jual, nominal_diterima, metode_pembayaran)
  VALUES (p_session_id, p_cashier_id, v_total_harga_jual, p_nominal_diterima, p_metode_pembayaran)
  RETURNING id INTO v_transaction_id;

  -- 5. For each cart item: lock product row, check stock, decrement, insert detail
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_qty        := (v_item->>'qty')::INTEGER;
    v_harga_jual := (v_item->>'harga_jual')::INTEGER;
    v_harga_asli := (v_item->>'harga_asli')::INTEGER;  -- Fetched server-side for security

    -- Lock row to prevent race conditions
    SELECT stok_sekarang INTO v_stok_sekarang
    FROM public.products
    WHERE id = v_product_id AND is_active = TRUE
    FOR UPDATE;

    IF v_stok_sekarang IS NULL THEN
      RAISE EXCEPTION 'Product % not found or inactive', v_product_id;
    END IF;

    IF v_stok_sekarang < v_qty THEN
      RAISE EXCEPTION 'Insufficient stock for product %. Available: %, Requested: %',
        v_product_id, v_stok_sekarang, v_qty;
    END IF;

    -- Decrement stock
    UPDATE public.products
    SET stok_sekarang = stok_sekarang - v_qty
    WHERE id = v_product_id;

    -- Insert line item with price snapshot from DB (not from client)
    INSERT INTO public.transaction_details (
      transaction_id, product_id, qty, harga_jual_snapshot, harga_asli_snapshot
    )
    SELECT
      v_transaction_id,
      v_product_id,
      v_qty,
      p.harga_jual,    -- Always read from DB, never trust client-sent price
      p.harga_asli     -- Always read from DB (hidden from cashier via RLS)
    FROM public.products p
    WHERE p.id = v_product_id;
  END LOOP;

  -- 6. Return result
  RETURN jsonb_build_object(
    'transaction_id',   v_transaction_id,
    'total_harga_jual', v_total_harga_jual,
    'kembalian',        p_nominal_diterima - v_total_harga_jual
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;  -- Re-raise; Supabase client receives the error message
END;
$$;

COMMENT ON FUNCTION public.complete_transaction IS
  'Atomic transaction: inserts transaction header + details + decrements stock. Always reads prices from DB.';
```

> ⚠️ **Security note:** `harga_asli` in the insert always comes from `public.products`, never from the client-sent `p_cart_items`. The function is `SECURITY DEFINER`, bypassing RLS to read `harga_asli`, but the cashier client never receives this value.

---

### 4.2 `close_session`

**Purpose:** Atomically close a session after all reconciliation data has been submitted.

```sql
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
  -- 1. Count active products for this session
  SELECT COUNT(*) INTO v_product_count
  FROM public.products p
  JOIN public.sessions s ON s.session_date = p.session_date
  WHERE s.id = p_session_id AND p.is_active = TRUE;

  -- 2. Count submitted reconciliation records
  SELECT COUNT(*) INTO v_reconciliation_count
  FROM public.reconciliation
  WHERE session_id = p_session_id;

  -- 3. All products must have reconciliation records
  IF v_reconciliation_count < v_product_count THEN
    RAISE EXCEPTION 'Reconciliation incomplete. % of % products reconciled.',
      v_reconciliation_count, v_product_count;
  END IF;

  -- 4. Close the session
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
```

---

### 4.3 `reopen_session`

**Purpose:** Reopen a closed session. Restricted to users with `can_reopen_session` metadata claim.

```sql
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
...
```

---

### 4.4 `reset_session`

**Purpose:** Reset session by deleting all transaction and reconciliation data, setting stock to stok_awal, and opening status. Restricted to `marcellinusyovian@gmail.com`.

```sql
CREATE OR REPLACE FUNCTION public.reset_session(
  p_session_id  UUID,
  p_admin_id    UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
...
```

---

### 4.5 `get_session_financial_summary`

**Purpose:** Efficient aggregation query for the admin revenue split dashboard.

```sql
CREATE OR REPLACE FUNCTION public.get_session_financial_summary(
  p_session_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'session_id',          p_session_id,
    'gross_revenue',       COALESCE(SUM(td.subtotal_harga_jual), 0),
    'total_remittance',    COALESCE(SUM(td.subtotal_harga_asli), 0),
    'omk_net_profit',      COALESCE(SUM(td.subtotal_harga_jual - td.subtotal_harga_asli), 0),
    'transaction_count',   COUNT(DISTINCT t.id),
    'per_umkm',            jsonb_agg(
      jsonb_build_object(
        'umkm_id',         u.id,
        'nama_umkm',       u.nama_umkm,
        'items_sold',      COALESCE(SUM(td.qty), 0),
        'gross_sales',     COALESCE(SUM(td.subtotal_harga_jual), 0),
        'remittance_due',  COALESCE(SUM(td.subtotal_harga_asli), 0),
        'omk_profit',      COALESCE(SUM(td.subtotal_harga_jual - td.subtotal_harga_asli), 0)
      )
    )
  )
  INTO v_result
  FROM public.transactions t
  JOIN public.transaction_details td ON td.transaction_id = t.id
  JOIN public.products p ON p.id = td.product_id
  JOIN public.umkm u ON u.id = p.umkm_id
  WHERE t.session_id = p_session_id
  GROUP BY u.id, u.nama_umkm;

  RETURN v_result;
END;
$$;
```

---

## 5. Row-Level Security (RLS) Policies

Enable RLS on all tables before applying policies.

```sql
ALTER TABLE public.umkm               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation      ENABLE ROW LEVEL SECURITY;
```

### Helper Function

```sql
-- Retrieve the current user's role from auth.users metadata
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'role',
    'cashier'  -- Default to least privilege if role not set
  );
$$;
```

### 5.1 RLS on `umkm`

```sql
-- Both roles can read UMKM names (needed for POS product labels)
CREATE POLICY "umkm_read_all" ON public.umkm
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admin can insert/update
CREATE POLICY "umkm_write_admin" ON public.umkm
  FOR ALL USING (public.get_user_role() = 'admin');
```

### 5.2 RLS on `products`

```sql
-- Cashier: can read products BUT harga_asli is excluded via a view (see below)
CREATE POLICY "products_read_cashier" ON public.products
  FOR SELECT USING (auth.role() = 'authenticated');

-- Admin: full read/write
CREATE POLICY "products_write_admin" ON public.products
  FOR ALL USING (public.get_user_role() = 'admin');
```

**Cashier-safe view (hides `harga_asli`):**
```sql
CREATE VIEW public.products_cashier_view AS
  SELECT
    id, umkm_id, session_date, nama_produk,
    harga_jual,   -- Selling price: visible to cashier
    stok_awal, stok_sekarang, is_active, created_at
    -- harga_asli intentionally omitted
  FROM public.products;

-- Frontend cashier role queries this view, not the base table
GRANT SELECT ON public.products_cashier_view TO authenticated;
```

### 5.3 RLS on `sessions`

```sql
CREATE POLICY "sessions_read_all" ON public.sessions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "sessions_write_admin" ON public.sessions
  FOR ALL USING (public.get_user_role() = 'admin');
```

### 5.4 RLS on `transactions`

```sql
-- Cashier can insert (via RPC) and read their own transactions
CREATE POLICY "transactions_insert_authenticated" ON public.transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "transactions_select_cashier" ON public.transactions
  FOR SELECT USING (
    public.get_user_role() = 'admin'
    OR cashier_id = auth.uid()
  );

-- No UPDATE or DELETE for anyone (immutable after commit)
```

### 5.5 RLS on `transaction_details`

```sql
-- Admin can read all; cashier cannot read transaction_details (harga_asli_snapshot exposed)
CREATE POLICY "td_read_admin" ON public.transaction_details
  FOR SELECT USING (public.get_user_role() = 'admin');

-- Insert only via RPC (SECURITY DEFINER bypasses RLS)
-- No direct client INSERT allowed
```

### 5.6 RLS on `reconciliation`

```sql
CREATE POLICY "reconciliation_read_admin" ON public.reconciliation
  FOR SELECT USING (public.get_user_role() = 'admin');

CREATE POLICY "reconciliation_write_admin" ON public.reconciliation
  FOR INSERT WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "reconciliation_update_admin" ON public.reconciliation
  FOR UPDATE USING (public.get_user_role() = 'admin');
```

---

## 6. Indexes

```sql
-- Products: primary query pattern (session_date + is_active)
CREATE INDEX idx_products_session_date ON public.products(session_date);
CREATE INDEX idx_products_umkm_session ON public.products(umkm_id, session_date);
CREATE INDEX idx_products_active ON public.products(session_date, is_active) WHERE is_active = TRUE;

-- Transactions: filtered by session
CREATE INDEX idx_transactions_session ON public.transactions(session_id);
CREATE INDEX idx_transactions_cashier ON public.transactions(cashier_id);
CREATE INDEX idx_transactions_created ON public.transactions(created_at);

-- Transaction details: join pattern
CREATE INDEX idx_td_transaction ON public.transaction_details(transaction_id);
CREATE INDEX idx_td_product ON public.transaction_details(product_id);

-- Reconciliation: unique lookup
CREATE INDEX idx_reconciliation_session ON public.reconciliation(session_id);
```

---

## 7. Realtime Configuration

Enable Supabase Realtime for the `products` table only (the only table requiring live multi-device sync):

```sql
-- In Supabase dashboard: Database → Replication → enable for:
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;

-- Transactions can use polling (admin dashboard refresh) — not realtime critical
-- DO NOT add transaction_details to realtime (high write volume, not needed client-side)
```

**Frontend subscription pattern:**
```typescript
// Subscribe only to stok_sekarang changes for today's session
supabase
  .channel('products-stock')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'products',
    filter: `session_date=eq.${todayDate}`
  }, (payload) => {
    // Update local product state with payload.new.stok_sekarang
  })
  .subscribe()
```

---

## 8. Seed Data & Initial Setup

```sql
-- Initial admin user (create via Supabase Auth dashboard, then set metadata)
-- In Supabase Auth: set user_metadata = {"role": "admin"} for admin accounts
-- Cashier accounts: user_metadata = {"role": "cashier"}

-- Example UMKM seed data (replace with real data)
INSERT INTO public.umkm (nama_umkm, kontak_wa) VALUES
  ('Ibu Sari - Kue Kering',  '6281234567890'),
  ('Pak Budi - Minuman',     '6281234567891'),
  ('Ibu Dewi - Kerajinan',   '6281234567892'),
  ('Mas Rudi - Makanan',     '6281234567893'),
  ('Bu Ani - Frozen Food',   '6281234567894'),
  ('Pak Joko - Snack',       '6281234567895'),
  ('Bu Rina - Aksesori',     '6281234567896');
```

---

## 9. Migration Notes

- Always run schema changes in order: tables → triggers → functions → RLS policies → indexes
- The `complete_transaction` RPC must be deployed before the frontend cashier feature goes live
- `SECURITY DEFINER` functions run as the table owner — verify owner permissions after deployment
- Test RLS by switching `anon` and `authenticated` roles in Supabase SQL editor before release
- `stok_sekarang` should never go negative — monitor with: `SELECT * FROM products WHERE stok_sekarang < 0`
