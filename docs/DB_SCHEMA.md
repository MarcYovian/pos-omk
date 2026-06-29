# DB_SCHEMA.md — Database Schema Reference

# OMK Consignment POS — Supabase (PostgreSQL)

> **Document Status:** Ground-Truth v3.0 — Authoritative source for AI Coding Agent  
> **Database:** Supabase (PostgreSQL 15+)  
> **Critical Rule:** Column names and types defined here are the single source of truth. Do not rename, retype, or add columns without updating this file first.

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [Entity Relationship Diagram](#2-entity-relationship-diagram)
3. [Table Definitions](#3-table-definitions)
   - [umkm](#31-table-umkm)
   - [master_products](#32-table-master_products)
   - [sessions](#33-table-sessions)
   - [session_products](#34-table-session_products)
   - [transactions](#35-table-transactions)
   - [transaction_details](#36-table-transaction_details)
   - [reconciliation](#37-table-reconciliation)
4. [Database Functions (RPC)](#4-database-functions-rpc)
5. [Views](#5-views)
6. [Row-Level Security (RLS) Policies](#6-row-level-security-rls-policies)
7. [Indexes](#7-indexes)
8. [Realtime Configuration](#8-realtime-configuration)
9. [Seed Data & Initial Setup](#9-seed-data--initial-setup)
10. [Migration Notes](#10-migration-notes)

---

## 1. Schema Overview

```
Schema: public (default Supabase schema)
Auth: supabase.auth.users (managed by Supabase Auth)

Tables:
  umkm                — UMKM partner directory
  master_products     — Physical catalog of products per UMKM (independent of sessions)
  sessions            — One record per Sunday sales session
  session_products    — Dynamic product catalog active in a specific session (pivot table)
  transactions        — One record per completed checkout
  transaction_details — Line items within each transaction (immutable after insert)
  reconciliation      — End-of-day physical stock count results

Views:
  products_cashier_view     — Cashier-safe view hiding harga_asli from non-admin roles
  session_history_summary   — Aggregated financial summary per session (used by RPCs)
  top_products_sales        — Top-selling products with sell-through rate across closed sessions
  umkm_profit_contribution  — OMK net profit breakdown by UMKM across closed sessions
```

**Design Principles:**

1. **Price Immutability:** `transaction_details` stores price snapshots at the time of sale. Changing prices later never corrupts historical revenue data.
2. **Session Scoping:** All operational data is anchored to `session_id` (transactions and session_products). Cross-session queries always require an explicit filter.
3. **Soft Operations:** No hard deletes on master tables. Use `is_active = false` flags.
4. **Atomic Stock Deduction:** Stock changes only via the `complete_transaction` RPC function, never via direct UPDATE from the client.

---

## 2. Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────────┐         ┌───────────────────┐
│    umkm     │         │ master_products │         │     sessions      │
│─────────────│         │─────────────────│         │───────────────────│
│ id (PK)     │────┐    │ id (PK)         │         │ id (PK)           │
│ nama_umkm   │    └───>│ umkm_id (FK)    │    ┌───>│ session_date (UQ) │
│ kontak_wa   │         │ nama_produk     │    │    │ status            │
│ is_active   │         │ harga_asli      │    │    │ opened_by         │
│ created_at  │         │ is_active       │    │    │ closed_by         │
└─────────────┘         │ created_at      │    │    │ opened_at         │
                        │ updated_at      │    │    │ closed_at         │
                        └─────────────────┘    │    │ created_at        │
                                 │             │    └───────────────────┘
                                 │             │              │
                                 └───────┐     │              │
                                         ▼     │              │
                                ┌──────────────────┐          │
                                │ session_products │          │
                                │──────────────────│          │
                                │ id (PK)          │          │
                                │ session_id (FK)  │◄─────────┘
                                │ master_product_  │
                                │   id (FK)        │
                                │ harga_asli       │
                                │ harga_jual       │
                                │ stok_awal        │
                                │ stok_sekarang    │
                                │ is_active        │
                                │ created_at       │
                                └──────────────────┘
                                   │            │
             ┌─────────────────────┘            └─────────────────────┐
             ▼                                                        ▼
┌──────────────────────┐                                   ┌──────────────────────┐
│ transaction_details  │                                   │    reconciliation    │
│──────────────────────│                                   │──────────────────────│
│ id (PK)              │        ┌──────────────┐           │ id (PK)              │
│ transaction_id (FK) ─│───────►│ transactions │           │ session_product_     │
│ session_product_     │        │──────────────│           │   id (FK)            │
│   id (FK)            │        │ id (PK)      │           │ session_id (FK)      │
│ qty                  │        │ session_id   │           │ stok_fisik           │
│ harga_jual_snapshot  │        │ cashier_id   │           │ stok_sekarang_snap   │
│ harga_asli_snapshot  │        │ total_harga_ │           │ selisih              │
│ subtotal_harga_jual  │        │   jual       │           │ recorded_by          │
│ subtotal_harga_asli  │        │ nominal_     │           │ created_at           │
│ created_at           │        │   diterima   │           └──────────────────────┘
└──────────────────────┘        │ kembalian    │
                                │ metode_      │
                                │   pembayaran │
                                │ created_at   │
                                └──────────────┘
```

---

## 3. Table Definitions

### 3.1 Table: `umkm`

Stores the UMKM partner businesses. This is a master data table.

```sql
CREATE TABLE public.umkm (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_umkm   VARCHAR(100)  NOT NULL,
  kontak_wa   VARCHAR(20)   NOT NULL,           -- WhatsApp number, format: 628xxxxxxxxx
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

---

### 3.2 Table: `master_products`

Katalog produk fisik per UMKM. Satu baris mewakili satu jenis barang fisik (katalog), independen dari sesi penjualan.

```sql
CREATE TABLE public.master_products (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  umkm_id      UUID          NOT NULL REFERENCES public.umkm(id) ON DELETE RESTRICT,
  nama_produk  VARCHAR(100)  NOT NULL,
  harga_asli   INTEGER       NOT NULL CHECK (harga_asli > 0),  -- Default cost
  is_active    BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT master_products_unique_per_umkm UNIQUE (umkm_id, nama_produk)
);
```

---

### 3.3 Table: `sessions`

One record per Sunday sales session. Controls session lifecycle state.

```sql
CREATE TABLE public.sessions (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date  DATE          NOT NULL UNIQUE,    -- Enforces one session per Sunday
  status        VARCHAR(20)   NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_by     UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by     UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  closed_at     TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

---

### 3.4 Table: `session_products`

Pivot table. Menghubungkan produk master ke suatu sesi penjualan tertentu dengan harga khusus dan stok sesi tersebut.

```sql
CREATE TABLE public.session_products (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id          UUID          NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  master_product_id   UUID          NOT NULL REFERENCES public.master_products(id) ON DELETE RESTRICT,
  harga_asli          INTEGER       NOT NULL CHECK (harga_asli > 0),  -- Overridden session cost
  harga_jual          INTEGER       NOT NULL CHECK (harga_jual >= harga_asli),
  stok_awal           INTEGER       NOT NULL CHECK (stok_awal > 0),
  stok_sekarang       INTEGER       NOT NULL,
  is_active           BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT session_products_stok_check CHECK (stok_sekarang >= 0 AND stok_sekarang <= stok_awal),
  CONSTRAINT session_products_unique_per_session UNIQUE (session_id, master_product_id)
);
```

**Trigger — Auto-initialize `stok_sekarang`:**
```sql
CREATE OR REPLACE FUNCTION public.set_stok_sekarang()
RETURNS TRIGGER AS $$
BEGIN
  NEW.stok_sekarang := NEW.stok_awal;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_init_stok_session_products
  BEFORE INSERT ON public.session_products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_stok_sekarang();
```

---

### 3.5 Table: `transactions`

One record per completed checkout.

```sql
CREATE TABLE public.transactions (
  id                  UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id          UUID          NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  cashier_id          UUID          NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  total_harga_jual    INTEGER       NOT NULL CHECK (total_harga_jual > 0),
  nominal_diterima    INTEGER       NOT NULL CHECK (nominal_diterima >= total_harga_jual),
  kembalian           INTEGER       NOT NULL GENERATED ALWAYS AS (nominal_diterima - total_harga_jual) STORED,
  metode_pembayaran   VARCHAR(20)   DEFAULT 'cash' CHECK (metode_pembayaran IN ('cash', 'qris')),
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
```

---

### 3.6 Table: `transaction_details`

Immutable line items for each transaction.

```sql
CREATE TABLE public.transaction_details (
  id                    UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id        UUID      NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  session_product_id    UUID      NOT NULL REFERENCES public.session_products(id) ON DELETE RESTRICT,
  qty                   INTEGER   NOT NULL CHECK (qty > 0),
  harga_jual_snapshot   INTEGER   NOT NULL CHECK (harga_jual_snapshot > 0),
  harga_asli_snapshot   INTEGER   NOT NULL CHECK (harga_asli_snapshot > 0),
  subtotal_harga_jual   INTEGER   NOT NULL GENERATED ALWAYS AS (qty * harga_jual_snapshot) STORED,
  subtotal_harga_asli   INTEGER   NOT NULL GENERATED ALWAYS AS (qty * harga_asli_snapshot) STORED,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### 3.7 Table: `reconciliation`

Records physical stock count per product at the end-of-day.

```sql
CREATE TABLE public.reconciliation (
  id                    UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id            UUID      NOT NULL REFERENCES public.sessions(id) ON DELETE RESTRICT,
  session_product_id    UUID      NOT NULL REFERENCES public.session_products(id) ON DELETE RESTRICT,
  stok_fisik            INTEGER   NOT NULL CHECK (stok_fisik >= 0),
  stok_sekarang_snap    INTEGER   NOT NULL CHECK (stok_sekarang_snap >= 0),
  selisih               INTEGER   NOT NULL GENERATED ALWAYS AS (stok_fisik - stok_sekarang_snap) STORED,
  recorded_by           UUID      NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT reconciliation_unique UNIQUE (session_id, session_product_id)
);
```

---

## 4. Database Functions (RPC)

### 4.1 `complete_transaction`

```sql
CREATE OR REPLACE FUNCTION public.complete_transaction(
  p_session_id        UUID,
  p_cashier_id        UUID,
  p_nominal_diterima  INTEGER,
  p_cart_items        JSONB,         -- Array of {product_id, qty, harga_jual} where product_id = session_products.id
  p_metode_pembayaran VARCHAR DEFAULT 'cash'
)
RETURNS JSONB;
```

### 4.2 `reset_session`

```sql
CREATE OR REPLACE FUNCTION public.reset_session(
  p_session_id  UUID,
  p_admin_id    UUID
)
RETURNS JSONB;
```

### 4.3 `get_session_financial_summary`

```sql
CREATE OR REPLACE FUNCTION public.get_session_financial_summary(
  p_session_id UUID
)
RETURNS JSONB;
```

### 4.4 `get_product_stock_recommendation`

```sql
CREATE OR REPLACE FUNCTION public.get_product_stock_recommendation(
  p_master_product_id UUID
)
RETURNS TABLE(recommendation INTEGER, s1_sold INTEGER, s2_sold INTEGER, s3_sold INTEGER);
```

---

## 5. Views

### 5.1 `products_cashier_view`

```sql
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
  FROM public.session_products sp
  JOIN public.master_products mp ON mp.id = sp.master_product_id;
```

---

## 6. Row-Level Security (RLS) Policies

```sql
-- RLS enabled on all tables:
ALTER TABLE public.umkm               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation      ENABLE ROW LEVEL SECURITY;
```

---

## 7. Indexes

```sql
CREATE INDEX idx_master_products_umkm ON public.master_products(umkm_id);
CREATE INDEX idx_master_products_active ON public.master_products(umkm_id, is_active) WHERE is_active = TRUE;

CREATE INDEX idx_session_products_session ON public.session_products(session_id);
CREATE INDEX idx_session_products_master ON public.session_products(master_product_id);
CREATE INDEX idx_session_products_active ON public.session_products(session_id, is_active) WHERE is_active = TRUE;

CREATE INDEX idx_td_session_product ON public.transaction_details(session_product_id);
```

---

## 8. Realtime Configuration

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.umkm;
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_products;
```
