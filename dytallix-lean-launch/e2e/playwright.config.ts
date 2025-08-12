import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Support __dirname in ESM
const __dirname = dirname(fileURLToPath(import.meta.url));

// Load staging env if present
const envPath = resolve(__dirname, '..', '.env.staging');
dotenv.config({ path: envPath, override: true });

const LCD = process.env.VITE_LCD_HTTP_URL || 'http://localhost:1317';

export default defineConfig({
  testDir: './specs',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    actionTimeout: 0,
    baseURL: LCD,
    trace: 'on-first-retry'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ]
});
