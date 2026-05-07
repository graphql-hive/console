import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { test as base, expect, type Page } from '@playwright/test';
import { createAppHelper, type AppHelper } from './helpers/app';
import { createAuthHelper, type AuthHelper } from './helpers/auth';
import { createLaboratoryHelper, type LaboratoryHelper } from './helpers/laboratory';
import { createOIDCHelper, type OIDCHelper } from './helpers/oidc';
import { createUsageHelper, type UsageHelper } from './helpers/usage';

export type SeedHelper = {
  seedOrg(): Promise<{ slug: string; refreshToken: string; email: string }>;
  seedTarget(): Promise<{ slug: string; refreshToken: string; email: string }>;
  getEmailConfirmationLink(input: string | { email: string; now: number }): Promise<string>;
  purgeOIDCDomains(): Promise<void>;
  forgeOIDCDNSChallenge(orgSlug: string): Promise<void>;
};

type Fixtures = {
  seed: SeedHelper;
  auth: AuthHelper;
  app: AppHelper;
  oidc: OIDCHelper;
  laboratory: LaboratoryHelper;
  usage: UsageHelper;
};

const execFileAsync = promisify(execFile);
const rootDir = new URL('..', import.meta.url).pathname;

async function loadSeedHelper(): Promise<SeedHelper> {
  return {
    seedOrg() {
      return runSeedTask('seedOrg');
    },
    seedTarget() {
      return runSeedTask('seedTarget');
    },
    getEmailConfirmationLink(input) {
      return runSeedTask('getEmailConfirmationLink', input);
    },
    async purgeOIDCDomains() {
      await runSeedTask('purgeOIDCDomains');
    },
    async forgeOIDCDNSChallenge(orgSlug) {
      await runSeedTask('forgeOIDCDNSChallenge', orgSlug);
    },
  };
}

async function runSeedTask<T>(task: string, input?: unknown): Promise<T> {
  const { stdout } = await execFileAsync(
    'pnpm',
    ['exec', 'tsx', 'e2e/seed-task.ts', task, JSON.stringify(input ?? null)],
    {
      cwd: rootDir,
      maxBuffer: 1024 * 1024 * 10,
    },
  );

  return JSON.parse(stdout) as T;
}

async function clearBrowserSession(page: Page) {
  await page.context().clearCookies();
  try {
    await page.evaluate(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });
  } catch {}
}

export const test = base.extend<Fixtures>({
  seed: async ({ browserName: _browserName }, use) => {
    await use(await loadSeedHelper());
  },
  auth: async ({ page }, use, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    await use(createAuthHelper(page, loadSeedHelper, baseURL, clearBrowserSession));
  },
  app: async ({ page, auth }, use) => {
    await use(createAppHelper(page, auth));
  },
  oidc: async ({ page, seed, auth }, use) => {
    await use(createOIDCHelper(page, seed, auth));
  },
  laboratory: async ({ page }, use) => {
    await use(createLaboratoryHelper(page));
  },
  usage: async ({ page, request }, use) => {
    await use(createUsageHelper(page, request));
  },
});

export { expect };
