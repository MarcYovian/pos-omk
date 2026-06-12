import type { Config } from 'tailwindcss'

export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          900: '#1e3a5f',    // Primary dark navy (app header, buttons)
        },
        // Semantic colors
        success: '#16a34a',
        warning: '#d97706',
        danger:  '#dc2626',
      },
      fontFamily: {
        // POS numeric displays
        mono: ['JetBrains Mono', 'Geist Mono', 'ui-monospace', 'monospace'],
        // UI labels and admin
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Large tap-friendly sizes for POS
        'pos-price':  ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'pos-change': ['2rem',   { lineHeight: '2.5rem', fontWeight: '800' }],
      },
      minHeight: {
        'touch': '48px',    // Minimum tap target
      },
      minWidth: {
        'touch': '48px',
      },
    },
  },
  plugins: [],
} satisfies Config
