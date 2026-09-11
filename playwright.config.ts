import { defineConfig, devices } from '@playwright/test'

const apiPort = process.env.CVG_API_PORT ?? '3199'
const webPort = process.env.CVG_WEB_PORT ?? '4173'
const consoleOrigin = `http://127.0.0.1:${webPort}`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['line'], ['junit', { outputFile: 'playwright-results.xml' }]]
    : [['list']],
  use: {
    baseURL: process.env.BASE_URL ?? consoleOrigin,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: `NODE_ENV=test API_ALLOWED_ORIGINS=${consoleOrigin} PORT=${apiPort} npm run dev:api`,
      url: `http://127.0.0.1:${apiPort}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    },
    {
      command: `CVG_API_PORT=${apiPort} npm run dev:web -- --port ${webPort}`,
      url: consoleOrigin,
      reuseExistingServer: !process.env.CI,
      timeout: 120000
    }
  ]
})
