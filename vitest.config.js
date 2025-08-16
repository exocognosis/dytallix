import { defineConfig } from 'vitest/config'

// Root Vitest config to ensure only frontend tests run with jsdom
// and Hardhat/Node tests are excluded when running from repo root.
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost' }
    },
    setupFiles: ['./dytallix-lean-launch/vitest.setup.js'],
    include: [
      'dytallix-lean-launch/src/__tests__/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'dytallix-lean-launch/src/**/*.{test,spec}.{js,jsx,ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/artifacts/**',
      '**/cache/**',
      '**/tokenomics/**',
      '**/hardhat.config.*',
      '**/scripts/**',
      '**/deploy/**'
    ],
    css: true
  }
})
