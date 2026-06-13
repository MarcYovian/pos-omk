# OMK POS — Sistem Kasir Konsinyasi

Aplikasi POS (Point of Sale) untuk pengelolaan lapak konsinyasi OMK (Orang Muda Katolik).

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | Nuxt 4 + Vue 3 |
| Bahasa | TypeScript (strict) |
| CSS | Tailwind CSS |
| State | Pinia |
| Backend | Supabase (Auth, PostgreSQL, Realtime) |
| PWA | @vite-pwa/nuxt |
| Testing | Vitest + @vue/test-utils |

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Test

```bash
npm test
```

## Seed Data

```bash
node create_users.js
```

## Struktur Proyek

```
├── app/                    # Nuxt app (srcDir)
│   ├── app.vue
│   ├── assets/
│   ├── components/
│   ├── composables/
│   ├── middleware/
│   ├── pages/
│   ├── stores/
│   ├── types/
│   └── utils/
├── public/                 # Static assets
├── .env                    # Local env (tidak di-commit)
├── nuxt.config.ts
├── tailwind.config.ts
└── vitest.config.ts
```
