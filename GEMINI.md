# GEMINI.md — Architecture Guide & Development Standards for OMK POS

This document is the authoritative guide for AI Coding Agents and developers working on the **OMK POS** repository. All instructions, constraints, and conventions below are mandatory.

---

## 1. Project Name
**OMK POS — Cashier System, Product Management, & UMKM Consignment**  
*(Package Name: `pos-omk`)*

---

## 2. Project Overview & Core Purpose

### 2.1 Scope & Core Pillars
This application is **not just a simple consignment tool**, but an integrated platform built on 4 core pillars:
1. **Point of Sale (POS) Cashier System:**  
   Mobile-first Web/PWA cashier designed for the weekly Sunday post-mass marketplace operated by OMK (Catholic Youth Ministry). Supports concurrent cashiers (*multi-cashier*), Cash and QRIS payments, instant change calculation, and an offline transaction queue for intermittent church internet.
2. **Product Management:**  
   Management of UMKM master product catalogs, weekly active session catalogs (`session_products`), base cost vs retail price configuration, and automated stock recommendations based on historical sales.
3. **UMKM Vendor Management:**  
   Tracking parish micro-enterprise partners, transparent sales performance monitoring (via a public shareable WhatsApp dashboard), and logging consignment debt settlements from OMK to vendors.
4. **Consignment Model & Cash Flow:**  
   Automated revenue split between UMKM base capital and OMK net profit, end-of-day physical stock reconciliation, and organizational cash flow ledger.

### 2.2 Consignment Financial Rules (Single Source of Truth)
- `harga_asli`: Base cost from UMKM (100% remitted for units sold). Cashiers are **STRICTLY FORBIDDEN** from viewing this value.
- `harga_jual`: Retail selling price to parish buyers (`harga_asli + OMK markup`).
- `OMK Net Profit`: Computed as `(harga_jual - harga_asli) × units_sold`.
- `Unsold Stock`: Physically returned to the UMKM partner at session close without cost to OMK.

---

## 3. Locked Tech Stack & Design System

### 3.1 Tech Stack
| Layer | Technology | Version | Role & Description |
|---|---|---|---|
| **Language** | TypeScript | `^5.4.5` | Strict mode enabled (`strict: true`), `any` type is strictly forbidden. |
| **Framework** | Nuxt 4 | `^4.4.8` | SPA mode (`ssr: false`), Nitro server engine for backend REST APIs. |
| **UI Runtime** | Vue 3 | `^3.4.31` | Composition API exclusively with `<script setup lang="ts">`. |
| **State** | Pinia | `^3.0.4` | In-memory stores (Cart, Auth, Session, Products, UMKM, Cash Flow, Payments). |
| **Backend & DB** | Supabase | `^2.107.0` | PostgreSQL, Auth, Row-Level Security (RLS), Realtime PubSub, Stored Procedures (RPC). |
| **PWA & Offline**| @vite-pwa/nuxt + idb | `^1.1.1` / `^8.0.1` | Workbox Service Worker + IndexedDB queue for offline transactions. |
| **Styling** | Tailwind CSS | `^3.4.x` | Utility-first CSS via `@nuxtjs/tailwindcss`. |
| **Iconography** | @nuxt/icon | `^1.1.0` | SVG icons via Iconify (Heroicons collection). |
| **Charts** | Chart.js + vue-chartjs | `^4.5.1` / `^5.3.3` | Weekly sales trends, UMKM profit contribution, and top products. |

*Locked Stack:* Installing third-party UI component libraries (PrimeVue, Vuetify, DaisyUI, etc.) or Axios is **STRICTLY PROHIBITED**.

### 3.2 Design System & Cashier UI Specifications
- **Brand Palette:** Primary Dark Navy `#1e3a5f` (`brand-900`), `brand-50` through `brand-700`. Semantic colors: `success` (`#16a34a`), `warning` (`#d97706`), `danger` (`#dc2626`).
- **POS Typography:** Monospaced font (`JetBrains Mono`, `Geist Mono`) for prices and change amounts. Preset classes: `text-pos-price` (1.5rem bold) & `text-pos-change` (2rem extra-bold).
- **Touch Ergonomics:** Minimum tap target of **48×48px** (`min-h-touch`, `min-w-touch`) for all buttons, numpad keys, and product cards.
- **Custom Primitive Components (`app/components/ui/`):** `AppButton`, `AppInput` (with show/hide password toggle), `AppModal`, `AppToast`, `OfflineBanner`, `ProfileDropdown`.

---

## 4. Folder Structure & Architectural Patterns

The codebase adopts a **Nuxt 4 Layered Architecture with Feature Grouping**:

```
pos-omk/
├── app/                              # Nuxt 4 Client Source (Frontend UI & Client Logic)
│   ├── app.vue                       # Root component (VitePwaManifest, layout wrapper)
│   ├── assets/css/main.css           # Global stylesheet & Tailwind directives
│   ├── components/ui/                # Atomic design primitive components (Button, Input, Modal, Toast)
│   ├── composables/                  # Stateful logic & browser APIs (useNetworkStatus, useOfflineQueue, useSessionDate, useSupabase)
│   ├── layouts/admin.vue             # Admin layout: grouped navigation sidebar & session status indicator
│   ├── middleware/                   # Route guards: auth.ts (login guard), admin.ts (admin role guard)
│   ├── pages/                        # File-based routes (/pos, /admin/*, /umkm/performance/*, /login)
│   ├── stores/                       # Pinia stores (auth, cart, session, products, umkm, history, cashFlow, payment)
│   ├── types/                        # Client TypeScript definitions (app.ts, database.types.ts, pos.ts)
│   └── utils/                        # Pure stateless helper functions (currency.ts, date.ts, report.ts)
├── server/                           # Nitro backend server
│   ├── api/users/                    # REST endpoints for user management via Supabase Service Role
│   └── utils/                        # Server helpers (requireAdmin.ts, password.ts)
├── shared/types/                     # Shared TypeScript contracts between client and Nitro server
├── public/                           # Static public assets (PWA icons, manifest, favicon)
└── docs/                             # Ground-truth documentation & plans (FEATURES, ARCHITECTURE, DB_SCHEMA, USER_FLOWS)
```

**Folder Responsibility Boundaries:**
- `app/components/ui/`: Pure visual presentation components only. Accepts `props` and emits events. Never call stores or Supabase directly.
- `app/stores/`: Hosts client-side business logic, Supabase RPC calls, and shared reactive state.
- `app/utils/`: Pure stateless functions without reactive Vue dependencies.
- `server/api/`: Strictly for administrative operations requiring `SUPABASE_SECRET_KEY` (service role). Never leak service role key to the client.

---

## 5. Code Conventions
- **Composition API Mandatory:** Always use `<script setup lang="ts">`. Options API is forbidden.
- **Strict Typing:** Never use `any`. Always use typed schemas from `database.types.ts` or `app.ts`.
- **Western Indonesia Time (WIB / UTC+7):** Never use `new Date().toISOString()`. Always use the `getTodayJakarta()` helper from `app/utils/date.ts` to prevent session dates from rolling over due to UTC timezone offsets.
- **Currency Format:** Always store IDR amounts as pure integers and display them via `formatRupiah()` (no decimals/cents).
- **In-Memory State:** Shopping cart must live exclusively in Pinia memory (never `localStorage`). Offline queue lives in IndexedDB (`idb`).
- **Supabase Instantiation:** In client code, always use auto-imported `useSupabaseClient<Database>()` / `useSupabase()`. Never instantiate manual `createClient()` on the frontend.

---

## 6. Environment Variables
Configured in root `.env` (never commit this file to Git):
- `SUPABASE_URL`: Supabase project endpoint.
- `SUPABASE_ANON_KEY`: Supabase public anon key (governed by Row-Level Security).
- `SUPABASE_SECRET_KEY`: Supabase service role secret key (Nitro server and local admin scripts only, bypasses RLS).
- `NUXT_PUBLIC_APP_ENV`: Environment identifier (`development`, `production`).

---

## 7. Completed & Locked Features (DO NOT MODIFY ARBITRARILY)

The following 14 features are fully implemented, tested, and marked as **LOCKED**. Do not alter their core business logic or UI flows without explicit written instruction:
1. **Auth & RBAC:** Login, role guard `admin` vs `cashier`, self-service password change, password reset.
2. **Real-time POS Cashier Screen (`/pos`):** Today's active products grid, instant search & UMKM filter, in-memory cart, virtual numpad, instant change calculation, Cash & QRIS payment, atomic checkout via RPC `complete_transaction`, and realtime stock sync between cashiers.
3. **PWA & Offline Queue:** Workbox service worker, IndexedDB transaction queue (`idb`), auto-sync on reconnect, connection status banner.
4. **UMKM Master Data (`/admin/umkm`):** Vendor partner CRUD, master product catalog per UMKM, soft-deactivation.
5. **Weekly Session Setup (`/admin/setup`):** Open Sunday sessions, assign products to session (`session_products`), set selling price (`harga_jual >= harga_asli`) & initial stock, 3-session weighted stock recommendations.
6. **Financial Session Dashboard (`/admin/dashboard`):** Gross revenue, UMKM remittance due, OMK net profit, expandable per-UMKM & per-product accordion, Reopen & Reset session controls.
7. **End-of-Day Stock Reconciliation (`/admin/reconciliation`):** Physical stock count input (`stok_fisik`), automated discrepancy detection (`selisih`), and official session closing (*Close Session*).
8. **WhatsApp Report Generator (`/admin/reports`):** Formatted report text per vendor (units sold, returned stock, total remittance), 1-click clipboard copy, historical session report support (`?session_id=...`).
9. **Session History & Transaction Log (`/admin/history`):** Past session listing, product details modal, cashier transaction logs per checkout basket.
10. **Sales Analytics (`/admin/analytics`):** Weekly trend line chart, UMKM profit contribution doughnut chart, top-selling products bar chart.
11. **Cash Flow Ledger (`/admin/cash-flow`):** Automated income entries from cashier sales, manual income/expense entries, running balance, paginated history.
12. **UMKM Settlements & Payments (`/admin/payments`):** Outstanding remittance tracking per vendor, payment entry, automated expense trigger to cash flow ledger.
13. **Public UMKM Performance Dashboard (`/umkm/performance/[id]`):** Authentication-free transparent sales dashboard shareable directly to vendors via WhatsApp.
14. **User Management (`/admin/users`):** Create cashier accounts, generate temporary passwords, toggle user active status, send reset password links.

*(For detailed technical specifications of each feature, see [docs/FEATURES.md](./docs/FEATURES.md))*

---

## 8. ⚠️ Do NOT (Forbidden Patterns for AI Agents)

- If my instruction or prompt is ambiguous or underspecified, ALWAYS ask first before modifying code.
- Never modify or refactor completed/locked features (F-01 to F-14 in `./docs/FEATURES.md`) without explicit written instruction.
- Never expose `harga_asli` to cashier context — cashiers must only query safe view `products_cashier_view`.
- Never mutate stock or insert transactions directly from client — always use atomic database RPC `complete_transaction`.
- Never initialize Supabase client manually with `createClient()` in frontend — always use auto-imported `useSupabase()` / `useSupabaseClient<Database>()`.
- Never expose `SUPABASE_SECRET_KEY` (service role) to client code — strictly for Nitro server (`server/`) and administrative scripts.
- Never use `localStorage` for cart or session — cart is in-memory Pinia store, offline queue is in IndexedDB (`idb`).
- Never use `any` type in TypeScript — always use typed schemas from `database.types.ts` or `app.ts`.
- Never use UTC time or `new Date().toISOString()` for session date — always use `getTodayJakarta()` (WIB / UTC+7).
- Never calculate official session financial totals on frontend — always use database RPC `get_session_financial_summary`.
- Never hard-delete UMKM partners with transaction history — always soft-deactivate via `is_active = false`.
- Never install third-party UI component libraries (PrimeVue, Vuetify, DaisyUI) or Axios — use Tailwind CSS and native fetch/Supabase client.
- Never work directly on `master` branch — always create a new branch (`feat/*` or `fix/*`) for each task.
- Never commit `.env` or any file containing secret keys to Git.

---

## 9. Testing & Build Commands
```bash
npm run dev        # Start development server
npm test           # Run Vitest unit & integration tests
npm run build      # Production build (Nitro + PWA Service Worker)
npm run preview    # Preview production build locally
npm run typecheck  # Type check with vue-tsc (has pre-existing test mock errors)
```

---

## 10. Git Rules & Workflow (MANDATORY)
1. **New Branch Required:**  
   Before creating a new feature (`feat`) or fixing a bug (`fix`), **ALWAYS create a new branch** from `master` (e.g. `git checkout -b feat/feature-name` or `fix/bug-name`). Never commit directly to `master`.
2. **Commit & Push Required:**  
   Once the task is verified and passing (`npm test` & `npm run build`), **ALWAYS commit** using Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, etc.) and **ALWAYS push** the branch to remote GitHub (`git push -u origin <branch-name>`).

---

## 11. Deep Documentation Map (Progressive Disclosure)
When in-depth technical context is needed, refer to the corresponding documents in `docs/`:
- [docs/FEATURES.md](./docs/FEATURES.md) — Technical details of the 14 LOCKED features.
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — Full folder tree, layer boundaries & design system specs.
- [docs/DB_SCHEMA.md](./docs/DB_SCHEMA.md) — Database schema, RPC functions, triggers, views, & RLS policies.
- [docs/plans/completed/PRD_v1_MVP.md](./docs/plans/completed/PRD_v1_MVP.md) — Historical MVP v1.0 PRD and original business domain.
- [docs/plans/proposed/](./docs/plans/proposed/) — Future feature proposals and architectural drafts.
- [docs/USER_FLOWS.md](./docs/USER_FLOWS.md) — User interface journey and state flows for cashier & admin.
