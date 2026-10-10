# AGENTS.md — Architecture Guide & Development Standards for OMK POS

This document is the authoritative **Single Source of Truth** for AI Coding Agents and developers working on the **OMK POS** repository (`pos-omk`), structured in accordance with the [Linux Foundation Agentic AI specification (agents.md)](https://agents.md/).

---

## 1. Project Overview & Core Purpose

**OMK POS** is a specialized Point of Sale (POS), Product Management, and UMKM Consignment platform operated by OMK (Catholic Youth Ministry) for weekly Sunday post-mass marketplaces.

### Core Pillars
1. **Point of Sale (POS) Cashier System (`/pos`):** Mobile-first Web/PWA cashier supporting multi-cashier concurrency, Cash and QRIS payments, instant change calculation, and an offline transaction queue for intermittent church internet.
2. **Product Management:** Master product catalogs per UMKM, weekly active session catalogs (`session_products`), base cost vs retail pricing, and 3-session weighted stock recommendations.
3. **UMKM Vendor Management:** Parish micro-enterprise partners, transparent sales performance monitoring via shareable WhatsApp dashboards, and debt settlement logging.
4. **Consignment Model & Cash Flow:** Automated revenue split between UMKM base capital and OMK net profit, end-of-day physical stock reconciliation, and organizational cash flow ledger.

---

## 2. Setup & Dev Commands

```bash
npm run dev        # Start local development server (Nuxt 4 SPA)
npm run build      # Production build (Nitro + PWA Service Worker)
npm run preview    # Preview production build locally
npm test           # Run Vitest test suite (unit & integration)
npm run typecheck  # Type check with vue-tsc (pre-existing mock errors in some test files)
```

---

## 3. Testing & Verification Instructions

- **Mandatory Test Verification:** Always run `npm test` after modifying code. All existing test suites must pass before marking a task as complete.
- **Test File Location:**
  - Client tests: `app/**/__tests__/*.test.ts`
  - Nitro server tests: `server/**/__tests__/*.test.ts`
- **Writing Tests:** When adding new utilities, composables, stores, or API endpoints, include corresponding Vitest tests using `@vue/test-utils` and Vitest mocks.
- **Handling Failures:** If a test fails after your changes, inspect the failure, correct the implementation, and re-run `npm test` until green.

---

## 4. Locked Tech Stack & Design System

### 4.1 Tech Stack
| Layer | Technology | Version | Description / Constraints |
|---|---|---|---|
| **Language** | TypeScript | `^5.4.5` | Strict mode enabled (`strict: true`). `any` type is **strictly forbidden**. |
| **Framework** | Nuxt 4 | `^4.4.8` | SPA mode (`ssr: false`), Nitro engine for server routes. |
| **UI Runtime** | Vue 3 | `^3.4.31` | Composition API exclusively with `<script setup lang="ts">`. |
| **State** | Pinia | `^3.0.4` | In-memory reactive state (Cart, Auth, Session, Products, UMKM, Cash Flow, Payments). |
| **Backend & DB** | Supabase | `^2.107.0` | PostgreSQL, Auth, Row-Level Security (RLS), Realtime PubSub, Stored Procedures (RPC). |
| **PWA & Offline**| @vite-pwa/nuxt + idb | `^1.1.1` / `^8.0.1` | Workbox Service Worker + IndexedDB queue for offline transactions. |
| **Styling** | Tailwind CSS | `^3.4.x` | Utility-first CSS via `@nuxtjs/tailwindcss`. |
| **Iconography** | @nuxt/icon | `^1.1.0` | SVG icons via Iconify (Heroicons collection). |
| **Charts** | Chart.js + vue-chartjs | `^4.5.1` / `^5.3.3` | Weekly sales trends, UMKM profit contribution, top products. |

> [!CAUTION]
> Installing third-party UI component libraries (PrimeVue, Vuetify, DaisyUI, etc.) or Axios is **STRICTLY PROHIBITED**. Use Tailwind CSS and native `fetch` / `useSupabase()`.

### 4.2 Design System & Cashier UI Specifications
- **Brand Palette:** Primary Dark Navy `#1e3a5f` (`brand-900`), `brand-50` through `brand-700`.
- **Semantic Colors:** `success` (`#16a34a`), `warning` (`#d97706`), `danger` (`#dc2626`).
- **POS Typography:** Monospaced font (`JetBrains Mono`, `Geist Mono`) for prices and change amounts. Preset classes: `text-pos-price` (1.5rem bold) & `text-pos-change` (2rem extra-bold).
- **Touch Ergonomics:** Minimum tap target of **48×48px** (`min-h-touch`, `min-w-touch`) for all buttons, numpad keys, and product cards.
- **Custom Primitive Components (`app/components/ui/`):** `AppButton`, `AppInput` (with password toggle), `AppModal`, `AppToast`, `OfflineBanner`, `ProfileDropdown`, `CompanySwitcher`.

---

## 5. Folder Structure & Architectural Boundaries

```
pos-omk/
├── app/                              # Nuxt 4 Client Source (Frontend UI & Logic)
│   ├── app.vue                       # Root component (VitePwaManifest, layout wrapper)
│   ├── assets/css/main.css           # Global stylesheet & Tailwind directives
│   ├── components/ui/                # Atomic UI primitive components (Button, Input, Modal, Toast)
│   ├── composables/                  # Stateful logic & browser APIs (useNetworkStatus, useOfflineQueue, useSessionDate, useSupabase)
│   ├── layouts/admin.vue             # Admin layout: grouped navigation sidebar & session status indicator
│   ├── middleware/                   # Route guards: auth.ts (login guard), admin.ts (admin role guard), permission.ts
│   ├── pages/                        # File-based routes (/pos, /admin/*, /umkm/performance/*, /login)
│   ├── stores/                       # Pinia stores (auth, cart, session, products, umkm, history, cashFlow, payment)
│   ├── types/                        # Client TypeScript definitions (app.ts, database.types.ts, pos.ts)
│   └── utils/                        # Pure stateless helper functions (currency.ts, date.ts, report.ts)
├── server/                           # Nitro backend server
│   ├── api/users/                    # REST endpoints for user management via Supabase Service Role
│   └── utils/                        # Server helpers (requireAdmin.ts, password.ts, rbacCache.ts)
├── shared/types/                     # Shared TypeScript contracts between client and Nitro server
├── public/                           # Static public assets (PWA icons, manifest, favicon)
└── docs/                             # Ground-truth documentation & plans (FEATURES, ARCHITECTURE, DB_SCHEMA, USER_FLOWS)
```

### Architectural Responsibility Boundaries
- `app/components/ui/`: Pure visual presentation components only. Accepts `props` and emits events. Never call Pinia stores or Supabase directly.
- `app/stores/`: Hosts client-side business logic, Supabase RPC calls, and shared reactive state.
- `app/utils/`: Pure stateless functions without reactive Vue dependencies.
- `server/api/`: Strictly for administrative operations requiring `SUPABASE_SECRET_KEY` (service role). Never leak service role key to the client.

---

## 6. Code Style & Conventions

- **Composition API Mandatory:** Always use `<script setup lang="ts">`. Options API is forbidden.
- **Strict Typing:** Never use `any`. Always use typed schemas from `database.types.ts` or `app.ts`.
- **Western Indonesia Time (WIB / UTC+7):** Never use `new Date().toISOString()`. Always use `getTodayJakarta()` from `app/utils/date.ts` to prevent session dates from rolling over due to UTC timezone offsets.
- **Currency Format:** Always store IDR amounts as pure integers and display them via `formatRupiah()` (no decimals/cents).
- **In-Memory State:** Shopping cart must live exclusively in Pinia memory (never `localStorage`). Offline queue lives in IndexedDB (`idb`).
- **Supabase Instantiation:** In client code, always use auto-imported `useSupabase()` / `useSupabaseClient<Database>()`. Never instantiate manual `createClient()` on the frontend.
- **Responsive Tables:** Mobile-first design; use `block sm:hidden` card pattern for responsive tables.
- **Auto-Imports:** Composables and stores are auto-imported from `~/composables` and `~/stores`.

---

## 7. Consignment Financial Rules (Single Source of Truth)

- `harga_asli`: Base cost from UMKM (100% remitted for units sold). Cashiers are **STRICTLY FORBIDDEN** from viewing this value.
- `harga_jual`: Retail selling price to parish buyers (`harga_asli + OMK markup`).
- `OMK Net Profit`: Computed as `(harga_jual - harga_asli) × units_sold`.
- `Unsold Stock`: Physically returned to the UMKM partner at session close without cost to OMK.

---

## 8. Security & Forbidden Patterns (Do NOT)

- **Underspecified Prompts:** If an instruction or prompt is ambiguous, ALWAYS ask for clarification before modifying code.
- **Locked Features:** Never modify or refactor completed/locked features (F-01 to F-14) without explicit written instruction.
- **Cashier Pricing Isolation:** Never expose `harga_asli` to cashier context — cashiers must only query safe view `products_cashier_view`.
- **Atomic Stock Mutation:** Never mutate stock or insert transactions directly from client — always use atomic database RPC `complete_transaction`.
- **Client Supabase Client:** Never initialize Supabase client manually with `createClient()` in frontend — always use auto-imported `useSupabase()`.
- **Secret Key Protection:** Never expose `SUPABASE_SECRET_KEY` (service role) to client code — strictly for Nitro server (`server/`) and administrative scripts.
- **Storage Isolation:** Never use `localStorage` for cart or session — cart is in-memory Pinia store, offline queue is in IndexedDB (`idb`). Active company ID persistence (`omk_active_company_id`) in `localStorage` is permitted strictly for tenant context persistence.
- **Type Safety:** Never use `any` type in TypeScript.
- **Timezone Safety:** Never use UTC time or `new Date().toISOString()` for session date — always use `getTodayJakarta()`.
- **Financial Calculations:** Never calculate official session financial totals on frontend — always use database RPC `get_session_financial_summary`.
- **Soft Deletion:** Never hard-delete UMKM partners with transaction history — always soft-deactivate via `is_active = false`.
- **Dependency Ban:** Never install third-party UI component libraries (PrimeVue, Vuetify, DaisyUI) or Axios.
- **Git Branching:** Never work directly on `master` branch — always create a new branch (`feat/*`, `fix/*`, `docs/*`).
- **Secrets in Git:** Never commit `.env` or any file containing secret keys to Git.

---

## 9. Completed & Locked Features Reference

The following 16 features are fully implemented, tested, and marked as **LOCKED** (see [docs/FEATURES.md](./docs/FEATURES.md) for full technical specifications):
1. **Auth & RBAC:** Login, role guards, self-service password change, password reset.
2. **Real-time POS Cashier Screen (`/pos`):** Active products grid, search & filter, cart, numpad, change calculation, Cash & QRIS payment, atomic RPC checkout, realtime stock sync.
3. **PWA & Offline Queue:** Workbox service worker, IndexedDB queue, auto-sync on reconnect, network status banner.
4. **UMKM Master Data (`/admin/umkm`):** Vendor partner CRUD, master product catalog, soft-deactivation.
5. **Weekly Session Setup (`/admin/setup`):** Sunday session management, `session_products`, pricing, 3-session stock recommendations.
6. **Financial Session Dashboard (`/admin/dashboard`):** Gross revenue, UMKM remittance, OMK profit, accordion breakdown, Reopen & Reset controls.
7. **End-of-Day Stock Reconciliation (`/admin/reconciliation`):** Physical count input, discrepancy detection (`selisih`), session closure.
8. **WhatsApp Report Generator (`/admin/reports`):** Vendor report text formatting, 1-click clipboard copy, historical session reporting.
9. **Session History & Transaction Log (`/admin/history`):** Past session logs, product details modal, cashier receipt basket logs.
10. **Sales Analytics (`/admin/analytics`):** Weekly sales trend, UMKM profit doughnut chart, top products bar chart.
11. **Cash Flow Ledger (`/admin/cash-flow`):** Automated cashier income entries, manual income/expense, running balance.
12. **UMKM Settlements & Payments (`/admin/payments`):** Remittance tracking, payment entry, automated cash flow ledger expense trigger.
13. **Public UMKM Performance Dashboard (`/umkm/performance/[id]`):** Auth-free transparent sales dashboard shareable via WhatsApp, powered by secure Nitro endpoint.
14. **User Management (`/admin/users`):** Cashier account provisioning, temp passwords, status toggle, password reset links, user permission overrides modal.
15. **Multi-Parish / Multi-Company Tenancy:** Isolated data per parish, CompanySwitcher in navigation, parish profile & receipt settings, automatic `X-Company-Id` header propagation.
16. **Dynamic Roles & Permissions Catalog:** Custom & system roles CRUD (`/admin/roles`), granular system permissions catalog (`/admin/permissions`), multi-tier in-memory RBAC caching.


---

## 10. Git Rules & Workflow

1. **New Branch Required:** Before creating a new feature (`feat`), fixing a bug (`fix`), or updating documentation (`docs`), **ALWAYS create a new branch** from the base branch (e.g., `git checkout -b feat/feature-name` or `docs/doc-update`). Never commit directly to `master`.
2. **Verification Gate:** Ensure `npm test` and `npm run build` pass without errors.
3. **Commit & Push:** Commit using Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`) and push to remote (`git push -u origin <branch-name>`).

---

## 11. Deep Documentation Map (Progressive Disclosure)

For detailed specifications, inspect the dedicated documents in `docs/`:

| Document | Purpose & Contents |
|---|---|
| [**`docs/README.md`**](./docs/README.md) | Master Documentation Hub & Fast Lookup Directory across the entire repository. |
| [**`docs/PRD.md`**](./docs/PRD.md) | Living Master PRD: Problem statement, 5 personas, KPIs, consignment rules, 16 features, and full BDD User Stories & Acceptance Criteria. |
| [**`docs/API_CONTRACTS.md`**](./docs/API_CONTRACTS.md) | Master API Reference: Nitro REST Endpoints, `X-Company-Id` header protocol, and Supabase RPC signatures. |
| [**`docs/UI_UX_SPECIFICATION.md`**](./docs/UI_UX_SPECIFICATION.md) | Master UI/UX Design System: Color tokens, JetBrains Mono currency presets, 48px touch ergonomics, 7 primitives, and ASCII layout wireframes. |
| [**`docs/FEATURES.md`**](./docs/FEATURES.md) | Technical specs and registry of the 16 LOCKED features (F-01 to F-16). |
| [**`docs/ARCHITECTURE.md`**](./docs/ARCHITECTURE.md) | Full architectural layout, layer boundaries, and runtime system design. |
| [**`docs/DB_SCHEMA.md`**](./docs/DB_SCHEMA.md) | Database schema, RPC functions, triggers, views, and multi-tenant RLS policies. |
| [**`docs/USER_FLOWS.md`**](./docs/USER_FLOWS.md) | Complete user journey and state flows for cashier & admin. |
| [**`docs/qa/README.md`**](./docs/qa/README.md) | QA Hub: 9-stage progressive review SOP, locator catalog standards, and 16-feature QA roadmap. |
| [**`docs/plans/completed/`**](./docs/plans/completed/) | Historical archive of past implementation plans (PRD MVP v1, Multi-Company, Dynamic RBAC). |
| [**`docs/plans/proposed/`**](./docs/plans/proposed/) | Future feature proposals and architectural drafts. |


---

## 12. Obsidian Protocol (Second Brain & Multi-Project Governance)

- **Vault Location:** `/home/rodex/Documents/cell/obsidian/Workspace` · CLI: `obsidian-wiki` (vault globally configured).
- **Multi-Project Vault Notice:** The vault is a shared second brain hosting both office workspaces (*Orbis Daya Asia*) and personal/community projects. When working on **OMK POS**, always isolate context to avoid cross-project hallucination.
- **Vault Topology & Targets for OMK POS:**
  - `projects/POS OMK.md` — Central project hub note for OMK POS (use as `--origin` for handoffs).
  - `journal/YYYY-MM-DD/` — Session logs with format `0X_POS_OMK_<Topic>.md` and daily rollups (`00_Daily_Summary.md`).
  - `references/notes/` — Technical architecture guides, domain specs, and cheatsheets.
  - `concepts/` & `entities/` — Atomic consignment models, Supabase RBAC concepts, and financial schemas.
- **Session Lifecycle:**
  - *Start:* (When user says "recap", "continue", or starts a fresh session):
    1. Run `obsidian-wiki memory recap` (Note: ignore office threads unrelated to OMK POS) and `obsidian-wiki memory todo list`.
    2. Optional drift check: `obsidian-wiki projects-check --pretty /home/rodex/Documents/cell/obsidian/Workspace` (Exit code 2 is expected if other repos have drifted; do not treat as fatal error).
  - *During Work:* Query via `obsidian-wiki query "pos-omk <topic>"` or `obsidian-wiki context-pack "<topic>" --budget 2000`. Direct note reads via Obsidian MCP tools (`obsidian_get_file_contents`, `obsidian_search_by_tag`).
  - *Carry-over / Handoff:* Add pending thread via:
    `obsidian-wiki memory todo add "<task>" --origin "projects/POS OMK.md"`
    Mark resolved via `obsidian-wiki memory todo done <id>`.
- **Knowledge Ingestion & Logging Criteria:**
  - *Auto/Instructed:* Run skill `obsidian-session-logger-skill` when user explicitly commands ("log this session", "catat ke obsidian"). Ensure session note is prefixed with `0X_POS_OMK_` and tagged with `#project/pos-omk`.
  - *Proactive Offer ("Record to Obsidian?"):* Only for critical bug RCA, Supabase RPC quirks, consignment calculation edge cases, or architectural decisions (ADRs).
  - *Noise & Secret Filter:* NEVER record trivial typos, temporary shell runs, secret keys (`SUPABASE_SECRET_KEY`), or unmasked vendor personal data.
  - *Atomic Notes:* Use skill `obsidian-pkm-manager-skill` for new technical guides; always include YAML frontmatter and bi-directional wikilinks (`[[projects/POS OMK|POS OMK]]`).
- **Post-Write Rule:** Always run `obsidian-wiki memory sync` after creating or editing vault notes to update `index.md` and `hot.md`. (Run `obsidian-wiki sync` if pushing vault git commits is required).

---

## 13. AI Agent Skills Registry & QA Automation Tooling

This repository is supported by a standardized suite of [Open Agent Skills (SKILL.md)](https://agents.md/) organized into project-scoped workspace skills (`.agents/skills/`) and global governance skills (`~/.gemini/config/skills/`):

### 13.1. Project-Scoped QA Documentation & UI Automation Suite (`.agents/skills/`)
A project-scoped 9-stage progressive UI testing pipeline stored directly in `.agents/skills/`, integrated with **Playwright MCP** and triangulated against ground-truth documentation ([`docs/PRD.md`](./docs/PRD.md), [`docs/USER_FLOWS.md`](./docs/USER_FLOWS.md), [`docs/UI_UX_SPECIFICATION.md`](./docs/UI_UX_SPECIFICATION.md)) and the Vue 3 / Pinia codebase:

| Skill Name | Path in Repo | Trigger Command | Description & Role |
|---|---|---|---|
| **`qa-doc-suite`** | `.agents/skills/qa-doc-suite` | `/qa-doc-suite [feature]`<br>`/qa-suite [feature]` | **Master Orchestrator & Gatekeeper:** Coordinates the complete 9-document pipeline per feature, enforces progressive approval gates (*Review Gates 1–3, 4–6, 7–9*), and runs automated compliance audits (`python3 scripts/audit_docs.py`). |
| **`qa-code-and-ui-analyzer-skill`** | `.agents/skills/qa-code-and-ui-analyzer-skill` | `/qa-analyze [feature]` | **Discovery Engine:** Dissects PRD user stories, user flows, Vue SFC templates, Pinia stores, Supabase RPCs, and live DOM / accessibility trees via Playwright MCP (`browser_snapshot`, `browser_evaluate`). Emits `feature-analysis.json`. |
| **`qa-spec-and-scenario-skill`** | `.agents/skills/qa-spec-and-scenario-skill` | `/qa-spec-plan [feature]` | **Scenario Planner:** Generates Stage 1, 2, and 3 documents (`00-feature-brief.md`, `01-questions-assumptions.md`, `02-test-scenarios.md`) in BDD *Given-When-Then* format directly from PRD Acceptance Criteria. |
| **`qa-ui-cataloger-skill`** | `.agents/skills/qa-ui-cataloger-skill` | `/qa-ui-catalog [feature]` | **UI & Locator Cataloger:** Generates Stage 4, 5, and 6 documents (`03-screen-flow.md`, `04-test-data-spec.md`, `05-element-catalog.md`). Applies *Dual-Strategy Locators* (Resilient Semantic Fallbacks + Developer `data-testid` patch recommendations). |
| **`qa-test-case-and-runner-skill`** | `.agents/skills/qa-test-case-and-runner-skill` | `/qa-test-run [feature]` | **Test Architect & Runner:** Generates Stage 7, 8, and 9 documents (`06-test-cases.md`, `07-automation-architecture.md`, `reports/YYYY-MM-DD-run-01.md`). Supports interactive live browser test execution and screenshot recording via Playwright MCP. |

### 13.2. Global Governance & Knowledge Management Skills (`~/.gemini/config/skills/`)
| Skill Name | Trigger Command | Description & Role |
|---|---|---|
| **`obsidian-session-logger-skill`** | `/log-session`<br>`log this session` | Logs engineering pair-programming history into Obsidian daily notes (`0X_POS_OMK_<Topic>.md`) tagged with `#project/pos-omk`. |
| **`obsidian-pkm-manager-skill`** | `/obsidian-note`<br>`/pkm-manager` | Manages atomic technical notes, Architecture Decision Records (ADRs), and dev cheatsheets with YAML validation and bidirectional linking. |
| **`agent-skill-creator`** | `/agent-skill-creator` | Level 5 cross-platform skill engine for creating new standardized agent capabilities. |
