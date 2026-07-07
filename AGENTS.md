# AGENTS.md

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm test          # Run Vitest tests
npm run typecheck # vue-tsc (has pre-existing errors in test files)
```

## Tech Stack

- Nuxt 4 + Vue 3 + TypeScript (strict)
- Supabase (Auth, PostgreSQL)
- Pinia (state)
- Tailwind CSS + @nuxt/icon
- PWA via @vite-pwa/nuxt
- Vitest for testing

## Project Structure

```
app/
├── pages/       # Routes (file-based)
├── components/ # Reusable UI
├── composables/ # Vue composables
├── stores/      # Pinia stores
├── types/       # TypeScript types
└── utils/       # Helpers
```

## Tailwind Custom Colors

`brand` palette available: `brand-50`, `brand-100`, `brand-500`, `brand-600`, `brand-700`, `brand-900`. Primary: navy `#1e3a5f`.

## Database

Use Supabase MCP tools (`supabase_*`) for migrations and queries. Supabase URL/key in `.env`.

## Key Conventions

- All composables auto-imported from `~/composables`
- Stores auto-imported from `~/stores`
- Components use `<script setup>` + TypeScript
- Mobile-first: use `block sm:hidden` pattern for responsive tables