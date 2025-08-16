import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost'
      }
    },
    setupFiles: ['./vitest.setup.js'],
    include: [
      'src/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'src/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'artifacts/**',
      'cache/**',
      'tokenomics/**',
      'hardhat.config.*'
    ],
    css: true
  }
})