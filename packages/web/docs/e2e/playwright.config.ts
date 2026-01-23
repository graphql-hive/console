import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  outputDir: '../.playwright/test-results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 2,
  reporter: [['html', { outputFolder: '../.playwright/report' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: process.env.CI
    ? {
        command: 'pnpm dlx serve out -l 3000',
        url: baseURL,
        reuseExistingServer: false,
        cwd: '..',
      }
    : {
        command: 'pnpm dev',
        url: baseURL,
        reuseExistingServer: true,
      },
});
