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
const FOUNDRY_URL = 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e/specs',
  tsconfig: './e2e/tsconfig.json',
  timeout: 80_000,
  expect: {
    timeout: 20_000,
  },
  fullyParallel: true,
  forbidOnly: isCI,
  retries: 2,
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
  // Screenshots are a local tool (see docs/TESTING.md), never committed.
  snapshotPathTemplate: '{testDir}/../__screenshots__/{projectName}/{arg}{ext}',
  projects: [
    {
      name: 'chromium',
      testIgnore: /visual-.*\.spec\.ts/,
      use: {
        browserName: 'chromium',
        channel: 'chrome',
      },
    },
    {
      // Screenshots of every Foundry preview, as a local before/after check. Needs no backend,
      // only the Foundry dev server started by `webServer` below. Uses Playwright's bundled
      // Chromium rather than the installed Chrome so rendering does not drift with the machine's
      // browser version.
      name: 'visual-foundry',
      testMatch: /visual-foundry\.spec\.ts/,
      retries: 0,
      use: {
        browserName: 'chromium',
        baseURL: FOUNDRY_URL,
        screenshot: 'off',
        trace: 'off',
        video: 'off',
      },
      expect: {
        timeout: 20_000,
        toHaveScreenshot: {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.005,
        },
      },
    },
  ],
  // The Foundry dev server, only for the visual project: the e2e projects do not need it.
  webServer: process.env.VISUAL_FOUNDRY
    ? {
        command: 'pnpm --filter @hive/app foundry',
        url: FOUNDRY_URL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      }
    : undefined,
});
