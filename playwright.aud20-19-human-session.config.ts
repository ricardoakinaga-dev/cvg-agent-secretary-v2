import os from 'node:os'
import path from 'node:path'
import { defineConfig } from '@playwright/test'

const outputDir =
  process.env.AUD20_19_OUTPUT_DIR ??
  path.join(os.tmpdir(), 'aud20-19-verify-output')
const viteConfig = path.resolve('vite.aud20-19-human-session.config.mts')
const viteEntry = path.resolve('node_modules/vite/bin/vite.js')
const viteCommand = `${JSON.stringify(process.execPath)} ${JSON.stringify(viteEntry)} --config ${JSON.stringify(viteConfig)} apps/web --host 127.0.0.1 --port 4174 --strictPort`

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/aud20-19-human-session-harness.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  outputDir,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium',
    headless: true,
    serviceWorkers: 'block',
    acceptDownloads: false,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 10000,
    navigationTimeout: 30000
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: viteCommand,
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 120000,
    stdout: 'ignore',
    stderr: 'pipe'
  }
})
