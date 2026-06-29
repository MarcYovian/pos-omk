# AGENTS.md — OMK POS (Konsinyasi)

## Quick commands
```bash
npm run dev          # Nuxt dev (localhost:3000)
npm run build        # Production build → .output/
npm run typecheck    # vue-tsc --noEmit (separate from build)
npm test             # vitest run (happy-dom env)
npm run postinstall  # nuxt prepare (generates .nuxt/)
npx supabase gen types typescript --project-id [REF] > app/types/database.types.ts
```

## Architecture
- **Nuxt 4** SPA (`ssr: false`), `app/` = srcDir, `server/` = API routes
- **Pinia** stores use composition API only (`defineStore('id', () => {...})`)
- **Supabase** via `@nuxtjs/supabase` — use `useSupabase()` (wrapper around `useSupabaseClient<Database>()`)
- Auto-imported dirs: `~/stores`, `~/composables`, `~/utils`
- TypeScript strict, but `typeCheck: false` in Nuxt config — run `npm run typecheck` separately

## Schema (post-migration v3)
`products` **no longer exists**. Split into:
- `master_products`: 1 row per physical product per UMKM (UUID PK, `umkm_id`, `nama_produk`, `harga_asli` default). UNIQUE(`umkm_id`, `nama_produk`)
- `session_products`: 1 row per product appearance in a session (`session_id`, `master_product_id`, `harga_asli`, `harga_jual`, `stok_awal`, `stok_sekarang`). UNIQUE(`session_id`, `master_product_id`)
- `transaction_details.session_product_id` (was `product_id`) → FK to `session_products.id`
- `reconciliation.session_product_id` (was `product_id`) → FK to `session_products.id`
- `products_cashier_view` now returns `session_id` (not `session_date`) — join of `session_products` + `master_products`

## Migration state (June 2026)
SQL migration is written in `docs/update_v2/001_split_products_to_master_and_session.sql`. **Frontend code still references old `products` table** — these files need updating:
- `app/types/app.ts` — split into `MasterProduct` + `SessionProduct` types
- `app/types/database.types.ts` — regenerate after migration
- `app/types/pos.ts` — `CartItem.product_id` is now `session_product_id`
- `app/stores/products.ts` — queries `products` table, Realtime filter on `session_date`
- `app/pages/admin/setup/[umkm_id].vue` — inserts into `products`, calls old RPC signature
- `app/pages/admin/reconciliation.vue` — queries `reconciliation` by `product_id`
- `app/pages/admin/reports.vue` — queries `products` by `session_date`
- `docs/DB_SCHEMA.md`, `docs/TECH_STACK.md`, `docs/USER_FLOWS.md`

## RPC changes (post-migration)
| RPC | Old signature | New signature |
|-----|--------------|---------------|
| `get_product_stock_recommendation` | `(p_umkm_id UUID, p_nama_produk VARCHAR)` | **`(p_master_product_id UUID)`** |
| `complete_transaction` | reads from `products` | reads from `session_products` |
| `reset_session` | join via `session_date` | join via `session_id` directly |

## Testing
- Vitest, happy-dom, stubs in `vitest.setup.ts` (Teleport, TransitionGroup, Icon)
- Mocks: `test/mocks/supabase-server.ts` (aliased as `#supabase/server`)
- Tests alongside code: `app/stores/__tests__/`, `app/pages/__tests__/`

## Conventions
- `<script setup lang="ts">` only, no Options API, no `defineComponent`
- No `any` — use `unknown` + type guards
- No `@ts-ignore` without comment
- No direct stock mutations — always via `complete_transaction` RPC
- No direct `harga_asli` exposure to cashiers — use `products_cashier_view`
- No inline styles — Tailwind only
- IDR: `Intl.NumberFormat('id-ID')` with `tabular-nums` CSS class
- Jakarta TZ: `Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Jakarta' })`
- WA numbers: digits only, start with `62`, no `+`

## Admin-only hard constraints
- `reset_session` RPC restricted to `marcellinusyovian@gmail.com`
- `admin_toggle_user_active` restricted to `marcellinusyovian@gmail.com`
- `reopen_session` requires `can_reopen_session` in user_metadata
