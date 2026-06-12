// eslint-disable-next-line import/no-extraneous-dependencies -- required before loading e2e seed helpers
import 'reflect-metadata';
import { defineConfig, devices } from '@playwright/test';

if (process.env.RUN_AGAINST_LOCAL_SERVICES === '1') {
  const dotenv = await import('dotenv');
  dotenv.config({ path: import.meta.dirname + '/packages/services/server/.env.template' });
} else {
  const dotenv = await import('dotenv');
  dotenv.config({ path: import.meta.dirname + '/integration-tests/.env' });
}

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e/specs',
  tsconfig: './e2e/tsconfig.json',
  timeout: 60_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: !isCI,
  forbidOnly: isCI,
  retries: 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: process.env.HIVE_APP_BASE_URL,
    viewport: {
      width: 1280,
      height: 720,
    },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isCI ? 'retain-on-failure' : 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        channel: 'chrome',
      },
    },
  ],
});
