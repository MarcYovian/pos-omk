import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
      '~': path.resolve(__dirname, './app'),
    }
  },
  test: {
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
  },
})
