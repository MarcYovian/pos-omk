// nuxt.config.ts
export default defineNuxtConfig({
  ssr: false,

  compatibilityDate: '2026-06-13',

  css: [
    '~/assets/css/main.css'
  ],

  modules: [
    '@nuxtjs/supabase',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxt/icon',
    '@vueuse/nuxt',
  ],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    redirect: false,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login'],
    },
    clientOptions: {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    },
  },

  pinia: {
    storesDirs: ['~/stores/**'],
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'OMK POS — Konsinyasi',
      short_name: 'OMK POS',
      description: 'Point of Sale untuk lapak konsinyasi OMK',
      theme_color: '#1e3a5f',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*supabase\.co\/.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'supabase-api-cache',
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
          },
        },
      ],
    },
  },

  typescript: {
    strict: true,
    typeCheck: false
  },

  imports: {
    dirs: ['~/stores', '~/composables', '~/utils'],
  },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
  },

  devtools: { enabled: true },
})
