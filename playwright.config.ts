import { defineConfig, devices } from '@playwright/test';

// Allow forcing headed mode via env var (PW_HEADED=1)
const headed = process.env.PW_HEADED === '1'

export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 1,
  expect: { timeout: 15000 },
  /* Default shared options */
  use: {
    baseURL: 'http://localhost:3000',
    headless: !headed,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--disable-dev-shm-usage','--no-sandbox','--disable-setuid-sandbox'],
    }
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    // Standard fast CI / headless run
    {
      name: 'chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' }
    },
    // Headed debug project (always headed, slowMo for visual clarity) - run with --project=chrome-debug
    {
      name: 'chrome-debug',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        headless: false,
        launchOptions: { slowMo: 120 },
        trace: 'on',
        video: 'on-first-retry'
      }
    }
  ]
});
