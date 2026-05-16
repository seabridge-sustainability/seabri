import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    env: {
      VITE_GATEWAY_URL: 'http://localhost:5173',
      VITE_OPENSEABRI_API_KEY: 'playwright-local-key',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
