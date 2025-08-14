import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './specs',
  testMatch: /.*\.spec\.ts/,
  reporter: 'list',
  timeout: 120000,
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    headless: true,
  },
  projects: [{ name: 'chromium' }],
});
