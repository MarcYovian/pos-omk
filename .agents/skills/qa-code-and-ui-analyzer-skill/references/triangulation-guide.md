# Panduan Triangulasi Data Fitur QA

Dokumen ini menjelaskan metodologi triangulasi 3 pilar yang digunakan oleh `qa-code-and-ui-analyzer-skill`:

## 1. Pilar 1: Master Dokumentasi
- `docs/PRD.md`: Mengandung persona, KPI, batasan konsinyasi, dan User Stories beserta Acceptance Criteria (AC-XX) berformat Given-When-Then.
- `docs/USER_FLOWS.md`: Mengandung state machine sesi (Draft -> Open -> Closed), alur kasir Minggu, dan pemulihan antrean offline.
- `docs/UI_UX_SPECIFICATION.md`: Mengandung pedoman ergonomi sentuh minimal 48×48px (`min-h-touch min-w-touch`), palet warna brand Navy `#1e3a5f`, dan tipografi monospace uang (`text-pos-price`, `text-pos-change`).
- `docs/FEATURES.md`: Registry resmi 16 fitur terkunci.

## 2. Pilar 2: Source Code Repo
- `app/pages/`: File Vue 3 SFC (`<script setup lang="ts">`).
- `app/stores/`: In-memory state Pinia (`cart.ts`, `session.ts`, `products.ts`, `auth.ts`, `company.ts`).
- `server/api/`: REST endpoints Nitro yang berinteraksi dengan Service Role.
- `database.types.ts`: Definisi skema tabel PostgreSQL dan RPC Supabase.

## 3. Pilar 3: Live DOM Browser via Playwright MCP
- Buka URL dev server `http://localhost:3000/<route>` via `browser_navigate`.
- Periksa accessibility snapshot via `browser_snapshot`.
- Hitung ukuran tombol dan form bounding rect via `browser_evaluate`.
- Tangkap screenshot visual state via `browser_take_screenshot`.
