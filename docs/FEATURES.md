# FEATURES.md — Implemented Features Catalog for OMK POS

This document is the official registry of all features that are **fully implemented, tested, and marked as stable (LOCKED)** in the OMK POS system.

> ### 🔒 FEATURE FREEZE & PROTECTION RULE
> **AI Agents and developers are STRICTLY FORBIDDEN from refactoring, removing, or altering the business logic, financial formulas, or user interface flows of the features below without explicit written authorization from the user!**

---

## List of Implemented Features (F-01 to F-16)

### F-01: Authentication & Role-Based Access Control (RBAC)
- **Status:** `LOCKED`
- **Routes:** `/login`, `/change-password`, `/reset-password`
- **Middleware:** `app/middleware/auth.ts`, `app/middleware/admin.ts`, `app/middleware/permission.ts`
- **Description:**
  - Email and password login powered by Supabase Auth with Jakarta timezone awareness.
  - Pure database-driven RBAC: Roles (`roles`), granular permissions (`permissions`), and user assignments (`company_users`, `user_roles`, `user_permissions`).
  - Roles supported: `super_admin` (platform super admin), `admin` (parish administrator), `cashier` (POS cashier), and dynamic custom roles.
  - Automated route guards: `auth.ts` (authentication & force password change redirect), `admin.ts` (administrative privilege check), and `permission.ts` (granular `to.meta.permission` evaluation via `authStore.can()`).
  - Self-service password change (`/change-password`) and email recovery password reset flow (`/reset-password`).


### F-02: Real-time POS Cashier Screen
- **Status:** `LOCKED`
- **Routes:** `/pos`
- **Store & RPC:** `app/stores/cart.ts`, `app/stores/products.ts`, RPC `complete_transaction`
- **Description:**
  - Displays catalog of active products for today's session (`CURRENT_DATE`) where `stok_sekarang > 0`.
  - Instant client-side text search and UMKM partner filter tabs.
  - In-memory shopping cart (Pinia) with realtime live stock validation upon adding items.
  - Integrated virtual numpad with quick-cash presets (exact amount, 5k, 10k, 50k, 100k increments).
  - Instant real-time change calculation.
  - Dual payment methods supported: **Cash** and **QRIS**.
  - Atomic database transactions via RPC `complete_transaction` (atomically decrements stock and records transaction details).
  - Realtime stock synchronization across multiple cashiers via Supabase Realtime PubSub.

### F-03: PWA & Offline Transaction Queue
- **Status:** `LOCKED`
- **Components & Composables:** `app/components/ui/OfflineBanner.vue`, `app/composables/useOfflineQueue.ts`
- **Description:**
  - PWA Web App Manifest and Workbox Service Worker for static asset caching and instant phone launching.
  - Local transaction queue in IndexedDB (`idb`) during intermittent church Wi-Fi / cellular dropouts.
  - Automatic background synchronization queue that flushes pending transactions to Supabase upon reconnection.
  - Connection status banner rendered at the top of the POS view.

### F-04: UMKM Partner Master Data Management
- **Status:** `LOCKED`
- **Routes:** `/admin/umkm`, `/admin/umkm/[umkm_id]`
- **Stores & Tables:** `app/stores/umkm.ts`, table `umkm`, table `master_products`
- **Description:**
  - CRUD operations for parish micro-enterprise partners (display name, WhatsApp phone number).
  - Master product catalog per vendor (`nama_produk`, base cost `harga_asli`, active status).
  - Soft-deactivation (`is_active = false`) to preserve historical transaction relations.

### F-05: Weekly Session Setup & Active Catalog
- **Status:** `LOCKED`
- **Routes:** `/admin/setup`, `/admin/setup/[umkm_id]`
- **Store & RPC:** `app/stores/session.ts`, RPC `get_product_stock_recommendation`
- **Description:**
  - Weekly Sunday session initialization and opening.
  - Assigning master products to the active session (`session_products`), setting selling prices, and specifying initial stock counts.
  - Strict validation: `harga_jual >= harga_asli` and `stok_awal > 0`.
  - Weighted-average stock recommendation algorithm based on the last 3 closed sessions via RPC `get_product_stock_recommendation`.

### F-06: Financial Session Dashboard
- **Status:** `LOCKED`
- **Routes:** `/admin/dashboard`
- **RPCs:** `get_session_financial_summary`, `get_umkm_product_breakdown`, `reopen_session`, `reset_session`
- **Description:**
  - Summary metric cards for Gross Revenue, UMKM Remittance Due, OMK Net Profit, and transaction count.
  - Expandable per-UMKM accordion tables showing per-product breakdowns (sold, remaining, revenue, cost, profit).
  - Administrative recovery tools: **Reopen Session** (re-opens a closed session) and **Reset Session** (clears transactions for staging/testing).

### F-07: End-of-Day Stock Reconciliation
- **Status:** `LOCKED`
- **Routes:** `/admin/reconciliation`
- **RPC & Tables:** RPC `close_session`, table `reconciliation`
- **Description:**
  - Form for inputting physical unsold inventory counts (`stok_fisik`) across all active products.
  - Automatic discrepancy detection (`selisih = stok_fisik - stok_sekarang`) with match / difference indicators.
  - Official session closing (*Close Session*) locking out further cashier transactions for the date.

### F-08: WhatsApp Report Generator
- **Status:** `LOCKED`
- **Routes:** `/admin/reports`
- **Utils:** `app/utils/report.ts`
- **Description:**
  - Automated generation of structured, copy-ready WhatsApp messages per vendor (units sold, returned stock, total payout).
  - 1-click "Copy WA Report" to system clipboard with fallback modal.
  - Support for querying and generating historical session reports via URL parameter `?session_id=...`.

### F-09: Session History & Cashier Transaction Logs
- **Status:** `LOCKED`
- **Routes:** `/admin/history`
- **Store & Views:** `app/stores/history.ts`, view `session_history_summary`
- **Description:**
  - Historical session directory with status badges and revenue summaries.
  - Product performance breakdown modal per historical session.
  - Cashier transaction audit log tab showing line-item details per individual checkout basket.

### F-10: Sales Analytics & Data Visualization
- **Status:** `LOCKED`
- **Routes:** `/admin/analytics`
- **Libraries & RPCs:** `chart.js`, `vue-chartjs`, RPC `get_weekly_trends`, view `umkm_profit_contribution`, view `top_products_sales`
- **Description:**
  - Line Chart: Weekly trend of gross revenue, remittance, and OMK profit across the last 10 closed sessions.
  - Doughnut Chart: Net profit contribution distribution across UMKM partners.
  - Bar Chart: Top selling products ranked by volume and sell-through rate.

### F-11: Cash Flow Ledger
- **Status:** `LOCKED`
- **Routes:** `/admin/cash-flow`
- **Store & RPCs:** `app/stores/cashFlow.ts`, RPC `get_cash_flow_summary`, `get_cash_flow_list`, `add_cash_flow`
- **Description:**
  - Automated income entries generated from POS transactions via database trigger.
  - Manual cash income and expense logging for operational costs.
  - Summary cards for total income, total expense, running cash balance, and paginated history table with date filtering.

### F-12: UMKM Settlements & Payments
- **Status:** `LOCKED`
- **Routes:** `/admin/payments`
- **Store & RPCs:** `app/stores/payment.ts`, RPC `get_umkm_payment_summary`, `mark_umkm_as_paid`, `get_umkm_payment_history_all`
- **Description:**
  - Aggregate outstanding debt tracking per UMKM partner (total remittance due minus verified payouts).
  - Payment entry dialog to record settlement payouts via RPC `mark_umkm_as_paid`.
  - Automated ledger integration: UMKM payouts automatically record an expense entry in `cash_flows`.

### F-13: Public UMKM Sales Performance Portal
- **Status:** `LOCKED`
- **Routes:** `/umkm/performance/[umkm_id]`
- **Nitro Backend & RPCs:** `server/api/public/umkm-performance/[id].get.ts`, RPC `get_umkm_product_performance`, `get_umkm_session_history`
- **Description:**
  - Mobile-first, public dashboard view requiring zero authentication (safe for vendor partners).
  - Shareable directly to UMKM owners via WhatsApp links.
  - Secure data fetching powered by Nitro backend endpoint using Service Role with automatic fallback to direct client RPC queries.
  - Visualizes all-time sold units, cumulative remittance, product sales breakdowns, and expandable session logs with physical count details.

### F-14: User & Cashier Account Management
- **Status:** `LOCKED`
- **Routes:** `/admin/users`
- **Nitro Backend:** `server/api/users/*` (`index.get`, `index.post`, `[id].patch`, `[id].delete`, `[id]/toggle-active`, `[id]/send-reset`, `[id]/send-verification`, `[id]/password-changed`, `[id]/permissions`)
- **Description:**
  - Directory of registered cashier and administrator accounts scoped to the active parish organization.
  - Creation of new accounts with temporary passwords, role selection (`super_admin`, `admin`, `cashier`, custom roles), and verification links.
  - Account status toggle (`is_active`) to deactivate accounts without deleting transaction history.
  - Password reset link distribution directly to user emails and `force_password_change` flag enforcement.
  - **Granular User Permission Overrides Modal**: Allows administrators to explicitly grant (`is_granted: true`), revoke (`is_granted: false`), or inherit (`null`) specific system permissions per user for the active company.

### F-15: Multi-Parish / Multi-Company Tenancy Architecture
- **Status:** `LOCKED`
- **Routes:** `/admin/settings/company`
- **Components & Stores:** `app/components/ui/CompanySwitcher.vue`, `app/stores/company.ts`, `app/composables/useApi.ts`
- **Nitro Backend & Utils:** `server/api/companies/*`, `server/utils/tenantResolver.ts`
- **Database Tables & Security:** Tables `companies`, `company_users`, RLS policies scoped to `company_id`, header injection via `X-Company-Id`.
- **Description:**
  - Multi-tenant architecture allowing multiple parishes/organizations to operate independently on a single codebase and database.
  - Complete data isolation for UMKM partners, products, sessions, transactions, cash flows, and payout records via Row-Level Security (`company_id`).
  - Dropdown `CompanySwitcher` component in admin sidebar and mobile navigation for seamless switching between accessible parishes.
  - Reactive global store `useCompanyStore` that persists active company ID in `localStorage` (`omk_active_company_id`) and automatically reloads session, product, and UMKM stores upon company switch.
  - Parish Profile & Receipt Settings page (`/admin/settings/company`) for configuring parish branding, address, WhatsApp contact, QRIS name, bank information, and receipt footer message.
  - Platform Super Admin management over all registered companies and active status toggles.

### F-16: Dynamic Roles & Permissions Catalog Management
- **Status:** `LOCKED`
- **Routes:** `/admin/roles`, `/admin/permissions`
- **Nitro Backend:** `server/api/roles/*`, `server/api/permissions/*`, `server/utils/requirePermission.ts`, `server/utils/rbacCache.ts`
- **Middleware:** `app/middleware/permission.ts`
- **Database Tables:** `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permissions`
- **Description:**
  - Role management dashboard (`/admin/roles`) allowing creation, editing, and deletion of custom roles with module-based permission allocation (`pos`, `catalog`, `session`, `finance`, `reports`, `users`, `roles`, `platform`).
  - Permissions catalog dashboard (`/admin/permissions`) managing granular system actions with unique code identifiers and module categorization.
  - High-performance in-memory caching tier in Nitro (`server/utils/rbacCache.ts`) with configurable TTLs and event-driven invalidation on permission/role updates.
  - Client-side permission evaluation via `authStore.can(permissionCode)` with in-flight request deduplication and 60-second caching.
  - Server-side endpoint protection via `requirePermission(event, permission)` utility.

