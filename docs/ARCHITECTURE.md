# ARCHITECTURE.md — Architecture Guide & Design System Specifications

This document outlines the complete directory layout, architectural layer boundaries, and the UI Design System specifications for the OMK POS system.

---

## 1. Project Directory Structure

The repository follows a **Nuxt 4 Layered Architecture with Feature Grouping**. All client-side code resides within the `app/` directory (the standard Nuxt 4 `srcDir`).

```
pos-omk/
├── app/                              # Nuxt 4 Client Source (Frontend UI & Client Logic)
│   ├── app.vue                       # Root Vue component (VitePwaManifest, layout wrapper, toast host)
│   ├── assets/css/main.css           # Global stylesheet & Tailwind CSS directives
│   ├── components/                   # Reusable UI components
│   │   └── ui/                       # Atomic primitives (AppButton, AppInput, Modal, Toast, CompanySwitcher, ProfileDropdown, OfflineBanner)
│   ├── composables/                  # Vue composables (useApi, useNetworkStatus, useOfflineQueue, useSessionDate, useSupabase, useToast, useCurrencyFormat)
│   ├── layouts/                      # Page layout templates
│   │   └── admin.vue                 # Admin layout (grouped navigation sidebar, parish switcher, & session status widget)
│   ├── middleware/                   # Route guards (auth.ts, admin.ts, permission.ts)
│   ├── pages/                        # File-based routing (/pos.vue, /admin/*, /admin/roles.vue, /admin/permissions.vue, /admin/settings/company.vue, /login.vue, /umkm/performance/*)
│   ├── stores/                       # Pinia stores in-memory (auth, cart, session, products, umkm, company, cashFlow, payment, history)
│   ├── types/                        # Client-side TypeScript contracts (app.ts, database.types.ts, pos.ts)
│   └── utils/                        # Pure stateless helper functions (currency.ts, date.ts, report.ts)
├── server/                           # Nitro Backend Server (Nuxt 4)
│   ├── api/                          # Server REST endpoints (Supabase Service Role)
│   │   ├── users/                    # User account provisioning, status toggle, passwords & permission overrides
│   │   ├── companies/                # Multi-parish management, active company profile & settings
│   │   ├── roles/                    # Custom & system roles CRUD and permission mapping
│   │   ├── permissions/              # System permissions catalog CRUD
│   │   └── public/                   # Public unauthenticated endpoints (umkm-performance)
│   └── utils/                        # Server utilities (requireAdmin.ts, requirePermission.ts, tenantResolver.ts, rbacCache.ts, password.ts)
├── shared/types/                     # Shared TypeScript schemas (tenant.ts, users.ts)
├── public/                           # Public static web assets (PWA icons, manifest, favicon)
├── docs/                             # Ground-truth documentation & plans (FEATURES, ARCHITECTURE, DB_SCHEMA, USER_FLOWS)
├── test/                             # Mocks & Vitest test utilities
├── nuxt.config.ts                    # Main Nuxt 4 configuration file
├── tailwind.config.ts                # Tailwind CSS theme, font, and color configuration
├── vitest.config.ts                  # Vitest test runner configuration
└── tsconfig.json                     # TypeScript compiler configuration
```

---

## 2. Folder Responsibility Boundaries (Layer Boundaries)

- **`app/components/ui/`**: 
  - Strictly for pure presentational atomic UI components without *business logic*.
  - **Forbidden** from invoking Pinia stores or the Supabase client directly (with the ergonomic exception of `CompanySwitcher` and `ProfileDropdown` that trigger store actions via UI events).
  - Components receive data via `props` and communicate interactions via `emits`.
- **`app/composables/`**: 
  - Encapsulates stateful reactive logic, browser API bindings (IndexedDB, online/offline events), or UI toast controllers.
  - `useApi()` provides a unified `$fetch` wrapper that automatically propagates the user's `Bearer` authorization token and the active tenant header `X-Company-Id`.
  - Must follow the `use*` prefix naming convention (e.g. `useNetworkStatus`, `useOfflineQueue`, `useApi`).
- **`app/stores/`**: 
  - Primary home for client-side business logic, global state, and Supabase RPC invocations.
  - RPC calls that mutate database state should be encapsulated within store actions.
  - Multi-tenant state in `useCompanyStore` synchronizes the active company with `localStorage` (`omk_active_company_id`) and cascades store reloads.
- **`app/utils/`**: 
  - Exclusively pure, deterministic, stateless functions without reactive Vue dependencies (no `ref`, `computed`, or side-effects).
  - Examples: currency formatting (`currency.ts`), Jakarta timezone resolution (`date.ts`), WhatsApp text template generator (`report.ts`).
- **`server/api/`**: 
  - Nitro backend endpoints executing sensitive administrative operations with `SUPABASE_SECRET_KEY` (service role).
  - Grouped by resource domain: `users`, `companies`, `roles`, `permissions`, and `public`.
  - **Strictly forbidden** from leaking or importing the service role secret into client-side code (`app/`).
- **`server/utils/`**: 
  - Reusable backend guards and helpers:
    - `tenantResolver.ts`: Resolves and validates caller's active parish context (`TenantContext`) from the `X-Company-Id` header and database memberships.
    - `requirePermission.ts`: Enforces granular permission verification on endpoints.
    - `rbacCache.ts`: High-performance in-memory cache with TTLs and event-driven invalidation to minimize database roundtrips.
    - `requireAdmin.ts`: Validates administrative caller credentials.
    - `password.ts`: Generates secure random passwords for cashier provisioning.

---

## 3. Design System & POS UI Specifications

The interface is built with a **Mobile-First** approach optimized for mid-range Android smartphones:

### 3.1 Brand Color Palette
- **Primary Navy:** `#1e3a5f` (`brand-900`), applied to navigation bars, primary action buttons, and active headers.
- **Brand Scale:** `brand-50` (`#eff6ff`), `brand-100` (`#dbeafe`), `brand-500` (`#3b82f6`), `brand-600` (`#2563eb`), `brand-700` (`#1d4ed8`).
- **Semantic Colors:**
  - Success: `#16a34a` (matching reconciliation, active status badges, successful checkout)
  - Warning: `#d97706` (minor inventory discrepancy, pending payment status)
  - Danger: `#dc2626` (stock discrepancies, validation errors, reset actions)

### 3.2 POS Typography
- **Numeric / Monospace Font:** `JetBrains Mono`, `Geist Mono`, `ui-monospace` for currency amounts, change displays, and receipts.
- **UI / Sans Font:** `Inter`, `system-ui`, `sans-serif` for labels, body copy, and admin panels.
- **Cashier Display Sizes:**
  - `text-pos-price`: `1.5rem` (24px, bold 700) for product unit prices.
  - `text-pos-change`: `2rem` (32px, extra-bold 800) for large change amount readouts.

### 3.3 Touch Ergonomics
- All interactive elements, numpad buttons, and product cards must conform to a minimum tap target size of **48×48px** (`min-h-touch`, `min-w-touch`) to prevent missed taps in busy cashier environments.

### 3.4 Custom Primitive Components (`app/components/ui/`)
- `AppButton.vue`: Button component supporting variants (`primary`, `secondary`, `danger`, `outline`) and built-in loading spinner.
- `AppInput.vue`: Form input supporting standard labels, currency formatting, and an interactive password visibility toggle.
- `AppModal.vue`: Accessible dialog modal featuring backdrop blur and focus trapping.
- `AppToast.vue`: Floating toast notification banner supporting success, warning, and danger types.
- `OfflineBanner.vue`: Real-time network banner indicating offline status.
- `ProfileDropdown.vue`: User session dropdown supporting password management and logout.
- `CompanySwitcher.vue`: Multi-tenant parish organization dropdown switcher supporting `sidebar`, `topbar`, and `mobile` variants.

> ⚠️ **Critical Constraint:** Installing third-party UI libraries (PrimeVue, Vuetify, Quasar, DaisyUI) or Axios is strictly forbidden. The UI is built purely with Tailwind CSS and the custom components above.
