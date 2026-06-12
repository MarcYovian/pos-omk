# PRD.md — Product Requirements Document
# OMK Consignment Point of Sale System

> **Document Status:** Ground-Truth v1.0 — Authoritative source for AI Coding Agent  
> **Last Updated:** June 2025  
> **Scope:** MVP (Version 1.0)

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Business Context & Consignment Model](#2-business-context--consignment-model)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Feature Specifications](#4-feature-specifications)
   - [F-01: Weekly Session Setup (Admin)](#f-01-weekly-session-setup-admin)
   - [F-02: Cashier POS Screen](#f-02-cashier-pos-screen)
   - [F-03: Automated Revenue Split Dashboard](#f-03-automated-revenue-split-dashboard)
   - [F-04: End-of-Day Stock Reconciliation](#f-04-end-of-day-stock-reconciliation)
   - [F-05: WhatsApp Report Generator](#f-05-whatsapp-report-generator)
5. [Business Logic & Calculation Rules](#5-business-logic--calculation-rules)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [Out-of-Scope (MVP Exclusions)](#7-out-of-scope-mvp-exclusions)
8. [Glossary](#8-glossary)

---

## 1. Product Vision

**One-line vision:** Replace WhatsApp price lists and paper tally sheets with a real-time, mobile-first POS that handles the full Sunday consignment cycle — from stock intake to UMKM remittance — in one application.

**Problem Statement:**

Every Sunday afternoon, OMK (Orang Muda Katolik — Catholic Youth Ministry) operates a post-mass marketplace. Seven local parish micro-enterprises (UMKM) supply goods on consignment. The current workflow has three critical failure points:

| Pain Point | Impact |
|---|---|
| Cashiers look up prices from WhatsApp or sticky notes | Slow queues, frequent mispricings |
| Manual end-of-day calculation of consignment splits | Takes 60+ minutes, prone to arithmetic errors |
| No structured report per UMKM | Admin manually types WhatsApp messages for each of 7 partners |

**Success Criteria for MVP:**

- A cashier completes a transaction (from first tap to cart reset) in **under 10 seconds**
- End-of-day reconciliation generates per-UMKM reports in **under 2 minutes**
- Zero arithmetic errors on consignment split calculations (system-enforced)
- App is usable on a **mid-range Android phone with intermittent Wi-Fi**

---

## 2. Business Context & Consignment Model

### 2.1 How Consignment Works in This Context

This is **not** a standard retail POS. Understanding the consignment model is critical for correct business logic implementation.

```
UMKM Partner                 OMK Cashier               Buyer
     │                            │                       │
     │  Delivers N units          │                       │
     │  at base_price per unit ──>│                       │
     │                            │<── Pays selling_price │
     │                            │    (base + markup)    │
     │<── Receives base_price     │                       │
     │    × units_sold ───────────│                       │
     │                            │  Keeps markup × sold  │
```

**Key Financial Relationship:**

- Each product has **two prices**: `harga_asli` (base cost, set by UMKM) and `harga_jual` (retail price, set by OMK = base + markup)
- OMK acts as consignment agent. It collects gross revenue from buyers, then **remits `harga_asli × qty_sold` back to each UMKM**
- OMK's profit = `(harga_jual - harga_asli) × qty_sold` per product
- Unsold items are **physically returned** to the UMKM at session close (no cost to OMK)

### 2.2 Weekly Session Cycle

Each operational cycle maps to **one Sunday**. The system must support:

1. **Morning Setup Phase** — Admin configures which products are active for this Sunday
2. **Sales Phase** — One or more cashiers process transactions concurrently
3. **Reconciliation Phase** — Admin counts physical stock, closes the session
4. **Reporting Phase** — System generates per-UMKM WhatsApp reports

### 2.3 Product Variability

> ⚠️ **Critical constraint for the AI Agent:** Product availability is **highly volatile**.

- UMKM partners may bring entirely different products each Sunday
- A product that existed last Sunday may not exist this Sunday
- New products appear with no advance notice
- The same product may be sold at different prices on different Sundays
- A product can be **deactivated mid-session** (e.g., UMKM decides to take it back)

**Implication:** The system must never hard-code product assumptions. Every product is scoped to a `session_date` and an `is_active` flag. Do not cache product data across sessions.

### 2.4 Concurrent Cashiers

Multiple OMK members may act as cashiers simultaneously on their own phones. Stock deduction **must be atomic** — two cashiers selling the last unit of a product simultaneously must not result in negative stock. This is enforced at the database layer via a Supabase RPC function, not in frontend code.

---

## 3. User Roles & Permissions

The system has exactly two roles. Role is stored in Supabase Auth's `user_metadata.role` field.

### Role: `admin`

| Capability | Description |
|---|---|
| Manage UMKM partners | Create, edit UMKM records |
| Configure weekly session | Set active products, stock counts, prices per Sunday |
| Activate / deactivate products | Toggle `is_active` during or before a session |
| View revenue split dashboard | See gross revenue, UMKM remittance totals, OMK profit |
| Perform stock reconciliation | Input physical stock counts at session close |
| Generate & copy WA reports | Access and copy per-UMKM WhatsApp report text |
| Close session | Mark a session as `closed` (irreversible in MVP) |
| Access all cashier functions | Admins can also process transactions |

### Role: `cashier`

| Capability | Description |
|---|---|
| View POS screen | See active products for today's session |
| Process transactions | Add items to cart, complete checkout |
| View own transaction history | See transactions processed in current session only |
| ❌ Cannot view prices breakdown | `harga_asli` is never exposed to cashier role |
| ❌ Cannot modify products | Read-only access to product catalog |
| ❌ Cannot view financial dashboard | No access to revenue split data |
| ❌ Cannot close session | Admin-only action |

> **Security note for AI Agent:** Row-Level Security (RLS) on Supabase enforces these boundaries at the database level. Frontend role-gating is a UX convenience only — never rely on it for security. See `DB_SCHEMA.md` for RLS policy definitions.

---

## 4. Feature Specifications

---

### F-01: Weekly Session Setup (Admin)

**Purpose:** Allow the admin to configure the product catalog for a specific Sunday session before sales begin.

**Access:** Admin role only. Accessible from the Admin Dashboard → "Setup Minggu Ini" (Set Up This Week).

#### F-01.1 UMKM Management

- Admin can view a list of all registered UMKM partners
- Admin can add a new UMKM with: `nama_umkm` (display name), `kontak_wa` (WhatsApp number with country code, e.g., `628123456789`)
- Admin can edit existing UMKM name or WhatsApp number
- **No hard delete of UMKM** in MVP — deactivate with a flag if needed (avoids breaking historical transaction references)
- Maximum 7 UMKM partners (business constraint, not a technical limit)

#### F-01.2 Product Configuration Per Session

For each session (identified by `session_date = today's date`):

1. Admin selects a UMKM partner
2. Admin adds products for that UMKM, specifying:
   - `nama_produk` — product name (free text, max 100 chars)
   - `harga_asli` — base cost in IDR (integer, no decimals, must be > 0)
   - `harga_jual` — selling price in IDR (integer, must be ≥ `harga_asli`)
   - `stok_awal` — initial stock count (integer, must be > 0)
3. System auto-sets `stok_sekarang = stok_awal` and `is_active = true` on creation
4. Admin can toggle `is_active` on any product at any time during setup or during sales

**Validation rules (enforced in both UI and DB):**
- `harga_jual >= harga_asli` — selling price cannot be below cost
- `stok_awal > 0` — cannot add a product with zero stock
- `nama_produk` cannot be empty
- `harga_asli` and `harga_jual` must be positive integers
- A product name + UMKM combination **can repeat across different session dates** (same product sold again next Sunday)

#### F-01.3 Session Date Scoping

- Each product row has a `session_date` (type: `date`) that anchors it to a specific Sunday
- The POS screen automatically shows only products where `session_date = CURRENT_DATE` and `is_active = true`
- Admin cannot modify products from past sessions (read-only after session close)

---

### F-02: Cashier POS Screen

**Purpose:** The primary real-time interface for processing buyer transactions during the sales phase.

**Access:** Both `admin` and `cashier` roles. This is the default landing screen after login for cashier role.

#### F-02.1 Product Grid Display

- Display all products where `session_date = CURRENT_DATE` AND `is_active = true` AND `stok_sekarang > 0`
- Each product card must show:
  - `nama_produk`
  - `harga_jual` formatted as `Rp X.XXX` (Indonesian Rupiah format with dot separator)
  - `nama_umkm` (UMKM partner name, shown as a label/badge)
  - `stok_sekarang` (remaining stock count)
- Products with `stok_sekarang = 0` are hidden or shown as disabled (grayed out, not tappable)
- Product cards subscribe to real-time updates on the `products` table — stock changes from other cashier sessions appear immediately without page refresh

#### F-02.2 Filter & Search

- Filter tabs by UMKM name — tapping a tab shows only that UMKM's products
- "Semua" (All) tab shows all active products regardless of UMKM
- Text search input filters product names in real-time (client-side, no DB call)
- Search and filter state resets after each completed transaction

#### F-02.3 Cart Mechanics

- Tapping a product adds 1 unit to the cart
- Tapping the same product again increments quantity by 1
- Cart shows: product name, qty, subtotal (`qty × harga_jual`)
- Each cart line has a minus button (decrements qty) and a remove button (removes line entirely)
- Cart subtotal updates live as items are added/removed
- **Stock check on add:** If tapping would exceed `stok_sekarang`, show an inline error and do not add to cart. Re-check against the live DB value at this point.
- Cart persists if the user navigates away momentarily (store in component state, not localStorage)

#### F-02.4 Checkout Flow

1. Cashier taps "Checkout" / "Bayar"
2. System displays:
   - Order summary (item list, quantities, subtotals)
   - **Total Amount** (sum of all `qty × harga_jual`)
   - Input field: "Uang Diterima" (cash received from buyer)
3. As cashier types the cash amount, **kembalian** (change) = `uang_diterima - total` is displayed instantly
4. If `uang_diterima < total`, show an error — cannot complete transaction
5. Cashier taps "Selesai" (Complete):
   - System calls Supabase RPC `complete_transaction(cart_items, nominal_diterima)` atomically
   - RPC inserts `transactions` row + all `transaction_details` rows + decrements `stok_sekarang` for each product
   - On success: show change amount prominently for 3 seconds, then reset cart
   - On RPC failure (e.g., stock ran out between cart-add and checkout): show specific error, refresh product stock display

#### F-02.5 Real-Time Stock Sync

- Subscribe to Supabase Realtime on `products` table filtered to `session_date = CURRENT_DATE`
- When `stok_sekarang` changes (from another cashier's transaction), update the product card immediately
- If a product in the current cart has its stock depleted by another cashier, show a cart warning but **do not auto-remove** — let cashier decide

---

### F-03: Automated Revenue Split Dashboard

**Purpose:** Give the admin a real-time financial overview of the session's performance and consignment split.

**Access:** Admin role only.

#### F-03.1 Session Summary Cards

Display at the top of the dashboard:

| Card | Formula | Description |
|---|---|---|
| **Gross Revenue** | `SUM(td.subtotal_harga_jual)` | Total cash collected from buyers |
| **Total UMKM Remittance** | `SUM(td.subtotal_harga_asli)` | Total to be paid back to all UMKM |
| **OMK Net Profit** | `Gross Revenue - Total UMKM Remittance` | Money OMK keeps |
| **Transactions** | `COUNT(DISTINCT transaction_id)` | Number of completed sales |

All values update in real-time as transactions are processed.

#### F-03.2 Per-UMKM Breakdown Table

Below the summary cards, show a table with one row per UMKM:

| Column | Formula |
|---|---|
| UMKM Name | `umkm.nama_umkm` |
| Items Sold | `SUM(td.qty)` for this UMKM's products |
| Gross Sales | `SUM(td.subtotal_harga_jual)` for this UMKM |
| Remittance Due | `SUM(td.subtotal_harga_asli)` for this UMKM |
| OMK Profit | `SUM(td.subtotal_harga_jual - td.subtotal_harga_asli)` for this UMKM |

Clicking a UMKM row expands to show per-product breakdown.

#### F-03.3 Per-Product Detail (Expandable)

When a UMKM row is expanded:

| Column | Formula |
|---|---|
| Product Name | `products.nama_produk` |
| Initial Stock | `products.stok_awal` |
| Sold | `SUM(td.qty)` for this product |
| Remaining (System) | `products.stok_sekarang` |
| Revenue | `SUM(td.subtotal_harga_jual)` |
| Cost | `SUM(td.subtotal_harga_asli)` |
| Profit | Revenue - Cost |

---

### F-04: End-of-Day Stock Reconciliation

**Purpose:** Allow the admin to verify physical stock counts against system-calculated remaining stock and record any discrepancies.

**Access:** Admin role only. Accessible after session close is initiated.

#### F-04.1 Reconciliation Input Screen

- For each active product in today's session, show:
  - Product name
  - UMKM name
  - `stok_sekarang` (system-calculated remaining) — labeled "Sisa Sistem"
  - Input field: `stok_fisik` (physically counted units) — labeled "Sisa Fisik"
- Admin inputs the physical count for each product
- System calculates: `selisih = stok_fisik - stok_sekarang`
  - `selisih = 0` → green indicator, labeled "Cocok" (Match)
  - `selisih ≠ 0` → red indicator, labeled "Selisih: [±N]" (Discrepancy: [±N])

#### F-04.2 Reconciliation Rules

- `stok_fisik` cannot be negative
- `stok_fisik` cannot exceed `stok_awal` (caught as a warning, not a hard block)
- Admin must input a value for all products before confirming close
- Partial save is not supported — reconciliation is an all-or-nothing action

#### F-04.3 Session Close

1. Admin reviews all reconciliation entries
2. Taps "Tutup Sesi" (Close Session)
3. Confirmation dialog: "Sesi ini akan ditutup dan tidak dapat diubah. Lanjutkan?"
4. On confirm:
   - System sets `sessions.status = 'closed'` (see `DB_SCHEMA.md` for `sessions` table)
   - System records `stok_fisik` and `selisih` in `reconciliation` table
   - No further transactions can be recorded for this session date
   - POS screen becomes read-only / shows "Sesi Ditutup" banner

---

### F-05: WhatsApp Report Generator

**Purpose:** Generate ready-to-paste WhatsApp text for each UMKM partner after session close.

**Access:** Admin role only. Available after session close.

#### F-05.1 Report Content

For each UMKM, generate the following text block:

```
Halo [nama_umkm]! 👋

Berikut laporan penjualan hari ini:
📅 Minggu, [DD MMMM YYYY]

DETAIL PENJUALAN:
• [nama_produk]: [qty_sold] terjual, [stok_fisik] dikembalikan
• [nama_produk]: [qty_sold] terjual, [stok_fisik] dikembalikan

RINGKASAN:
Total terjual: [total_units_sold] item
Total setoran ke [nama_umkm]: Rp[total_remittance]

Mohon konfirmasi penerimaan. Terima kasih atas kerja samanya! 🙏
— Tim OMK
```

**Template variables:**
- `[nama_umkm]` → `umkm.nama_umkm`
- `[DD MMMM YYYY]` → formatted session date in Indonesian (e.g., `15 Juni 2025`)
- `[nama_produk]` → one line per product belonging to this UMKM that had `stok_awal > 0`
- `[qty_sold]` → `stok_awal - stok_sekarang` (or from `SUM(td.qty)`)
- `[stok_fisik]` → physically counted return quantity from reconciliation
- `[total_units_sold]` → sum of all qty_sold for this UMKM
- `[total_remittance]` → `SUM(td.subtotal_harga_asli)` formatted as `Rp X.XXX`

**Important:** Products with `qty_sold = 0` (nothing sold) are **still listed** with "0 terjual, [stok_awal] dikembalikan" — UMKM needs to know the full picture.

#### F-05.2 Copy Mechanism

- Each UMKM has its own "Salin Laporan WA" (Copy WA Report) button
- Tapping the button calls `navigator.clipboard.writeText(reportText)`
- Show a toast notification: "Laporan [nama_umkm] berhasil disalin!" for 2 seconds
- On clipboard API failure (non-HTTPS or permission denied): show the full text in a modal with a manual select-all instruction

---

## 5. Business Logic & Calculation Rules

> ⚠️ These formulas are the single source of truth. All calculations in frontend and backend must conform exactly.

### 5.1 Core Consignment Formulas

```
# Per product, per transaction line:
profit_omk_per_item  = harga_jual - harga_asli
subtotal_harga_jual  = qty × harga_jual         # stored in transaction_details
subtotal_harga_asli  = qty × harga_asli          # stored in transaction_details

# Per UMKM, for the full session:
umkm_remittance      = SUM(subtotal_harga_asli)  # across all transaction_details for this UMKM
umkm_gross_sales     = SUM(subtotal_harga_jual)
umkm_omk_profit      = umkm_gross_sales - umkm_remittance

# Session total:
gross_revenue        = SUM(ALL subtotal_harga_jual)
total_remittance     = SUM(ALL subtotal_harga_asli)
omk_net_profit       = gross_revenue - total_remittance
```

### 5.2 Stock Deduction

```
# At transaction completion (atomic RPC):
FOR EACH item IN cart:
  stok_sekarang[item.product_id] -= item.qty

# System remaining stock (used in reconciliation):
sisa_sistem = stok_awal - stok_sekarang   # stok_sekarang after all transactions
```

### 5.3 Reconciliation

```
selisih = stok_fisik - stok_sekarang
# selisih > 0: more physical stock than system expected (undercount in sales)
# selisih < 0: less physical stock than system expected (overcount in sales or loss)
# selisih = 0: perfect match
```

### 5.4 Currency Formatting

- All IDR amounts displayed with dot as thousands separator: `Rp 12.500`
- No decimal places (IDR does not use cents in this context)
- Input fields accept raw integers only (no formatting during input, format on display)

### 5.5 Date & Locale

- Application timezone: **Asia/Jakarta (WIB, UTC+7)**
- All date operations use Jakarta timezone, not server/browser UTC
- `session_date` is always the current Sunday's date in Jakarta time
- Indonesian day/month names used in WA reports (use `id-ID` locale in `Intl.DateTimeFormat`)

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target |
|---|---|
| Time-to-Interactive (mobile, 3G throttled) | < 3 seconds |
| Transaction completion (tap to cart reset) | < 2 seconds |
| Real-time stock update propagation | < 500ms after DB write |
| WA report generation (text copy to clipboard) | < 200ms |

### 6.2 Reliability & Offline

- **Must work with intermittent Wi-Fi.** The church area has unreliable connectivity.
- App shell (HTML, CSS, JS) must be cached by Service Worker (Workbox) for offline launch
- Product catalog cached locally after morning setup (for offline POS use)
- Transactions attempted offline: queued in IndexedDB, synced to Supabase on reconnect
- **Conflict resolution for offline sync:** Last-write-wins for stock deduction, with a server-side check that `stok_sekarang >= 0` after apply. If stock goes negative on sync, reject the queued transaction and notify admin.
- Visible offline indicator banner at top of POS screen

### 6.3 Mobile-First UI

- Primary target device: mid-range Android smartphone (e.g., Redmi 9, Samsung A14)
- Minimum supported viewport: 360px wide
- All tap targets: minimum 48×48px
- POS product grid: 2 columns on 360–480px, 3 columns on 480px+
- No horizontal scrolling on any screen
- Large numeric displays for currency amounts (cashier must read at a glance)

### 6.4 Security

- HTTPS required (no HTTP serving)
- All API calls authenticated via Supabase JWT
- `harga_asli` column never returned to `cashier` role by RLS policies
- Session tokens expire after 8 hours (standard Supabase Auth behavior)
- No sensitive financial data stored in browser beyond the current active cart

---

## 7. Out-of-Scope (MVP Exclusions)

The following are explicitly **not** part of MVP. Do not implement, do not leave TODO stubs for:

- Digital payment integration (QRIS, GoPay, OVO, ShopeePay) — cash only
- QR code / barcode scanning for product lookup
- Historical analytics or cross-session trend dashboards
- Multi-parish or multi-branch support
- Native iOS/Android app — PWA only
- Customer-facing receipt printing
- Supplier/UMKM login portal (reports delivered via WhatsApp only)
- Product photo uploads
- Inventory forecasting or reorder alerts
- Discount or voucher system
- Tax (PPN) calculation

---

## 8. Glossary

| Term | Definition |
|---|---|
| **OMK** | Orang Muda Katolik — Catholic Youth Ministry, the operator of the marketplace |
| **UMKM** | Usaha Mikro, Kecil, dan Menengah — micro/small business partner that supplies goods |
| **Konsinyasi** | Consignment — OMK sells UMKM goods and remits base cost after sales |
| **harga_asli** | Base cost per unit (set by UMKM); never shown to buyers or cashier role |
| **harga_jual** | Retail selling price (set by OMK = harga_asli + markup); shown on POS |
| **stok_awal** | Initial stock count when UMKM delivers goods at session start |
| **stok_sekarang** | Live remaining stock count; decremented atomically per transaction |
| **stok_fisik** | Physically counted unsold units at session close (input by admin) |
| **selisih** | Discrepancy between stok_fisik and stok_sekarang |
| **session_date** | The Sunday date (Jakarta timezone) that scopes a set of products |
| **Sesi** | One complete Sunday sales cycle (setup → sales → reconciliation → close) |
| **Setor / Remittance** | Amount OMK pays back to UMKM: harga_asli × units_sold |
| **Kembalian** | Change returned to buyer: uang_diterima - total_belanja |
| **Laporan WA** | WhatsApp text report generated for each UMKM at session close |
