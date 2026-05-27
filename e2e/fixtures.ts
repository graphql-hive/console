// eslint-disable-next-line import/no-extraneous-dependencies -- required before loading seed helpers
import 'reflect-metadata';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface, type Interface } from 'node:readline';
import { test as base, expect, type Page } from '@playwright/test';
import { createAppHelper, type AppHelper } from './helpers/app';
import { createAuthHelper, type AuthHelper } from './helpers/auth';
import { createLaboratoryHelper, type LaboratoryHelper } from './helpers/laboratory';
import { createOIDCHelper, type OIDCHelper } from './helpers/oidc';
import { createUsageHelper, type UsageHelper } from './helpers/usage';

export type SeedHelper = {
  seedOrg(): Promise<{ slug: string; accessToken: string; refreshToken: string; email: string }>;
  seedTarget(): Promise<{ slug: string; accessToken: string; refreshToken: string; email: string }>;
  getEmailConfirmationLink(input: string | { email: string; now: number }): Promise<string>;
  purgeOIDCDomains(): Promise<void>;
  purgeUserByEmail(email: string): Promise<void>;
  forgeOIDCDNSChallenge(orgSlug: string): Promise<void>;
};

type Fixtures = {
  frontendEnv: void;
  seed: SeedHelper;
  auth: AuthHelper;
  app: AppHelper;
  oidc: OIDCHelper;
  laboratory: LaboratoryHelper;
  usage: UsageHelper;
};

type SeedTask = keyof SeedHelper;

type SeedResponse =
  | {
      id: number;
      ok: true;
      value: unknown;
    }
  | {
      id: number;
      ok: false;
      error: string;
    };

class SeedBridge {
  private nextId = 0;
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly output: Interface;
  private readonly pending = new Map<
    number,
    {
      resolve(value: unknown): void;
      reject(error: Error): void;
    }
  >();

  constructor() {
    this.process = spawn('pnpm', ['exec', 'tsx', 'e2e/seed-server.ts'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.output = createInterface({
      input: this.process.stdout,
      terminal: false,
    });

    let stderr = '';
    this.process.stderr.on('data', chunk => {
      stderr += String(chunk);
    });
    this.output.on('line', line => {
      let response: SeedResponse;

      try {
        response = JSON.parse(line) as SeedResponse;
      } catch {
        return;
      }

      const pending = this.pending.get(response.id);

      if (!pending) {
        return;
      }

      this.pending.delete(response.id);

      if (response.ok) {
        pending.resolve(response.value);
      } else {
        pending.reject(new Error(response.error));
      }
    });
    this.process.once('close', code => {
      const error = new Error(
        `Seed server exited with code ${code}${stderr ? `\n${stderr}` : ''}`,
      );

      for (const pending of this.pending.values()) {
        pending.reject(error);
      }

      this.pending.clear();
    });
    process.once('exit', () => {
      this.process.kill();
    });
  }

  run<T>(task: SeedTask, input: unknown = null): Promise<T> {
    const id = ++this.nextId;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (value: unknown) => void, reject });
      this.process.stdin.write(`${JSON.stringify({ id, task, input })}\n`, error => {
        if (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }
}

let seedBridge: SeedBridge | null = null;
let seedHelperPromise: Promise<SeedHelper> | null = null;

function loadSeedHelper(): Promise<SeedHelper> {
  seedHelperPromise ??= createSeedHelper();
  return seedHelperPromise;
}

async function createSeedHelper(): Promise<SeedHelper> {
  seedBridge ??= new SeedBridge();
  const bridge = seedBridge;

  return {
    async seedOrg() {
      return bridge.run('seedOrg');
    },
    async seedTarget() {
      return bridge.run('seedTarget');
    },
    async getEmailConfirmationLink(input) {
      return bridge.run('getEmailConfirmationLink', input);
    },
    async purgeOIDCDomains() {
      await bridge.run('purgeOIDCDomains');
    },
    async purgeUserByEmail(email) {
      await bridge.run('purgeUserByEmail', email);
    },
    async forgeOIDCDNSChallenge(orgSlug) {
      await bridge.run('forgeOIDCDNSChallenge', orgSlug);
    },
  };
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
  frontendEnv: [
    async ({ page }, use) => {
      await page.route('**/__env.js', async route => {
        const response = await route.fetch();
        const body = await response.text();
        const match = body.match(/^window\.__ENV = (.*);$/s);

        if (!match) {
          await route.fulfill({ response, body });
          return;
        }

        const env = JSON.parse(match[1]) as Record<string, unknown>;

        await route.fulfill({
          response,
          body: `window.__ENV = ${JSON.stringify({
            ...env,
            AUTH_ORGANIZATION_OIDC: '1',
          })};`,
        });
      });
      await page.route('https://unpkg.com/react-scan@*/dist/auto.global.js', async route => {
        await route.fulfill({
          contentType: 'application/javascript',
          body: '',
        });
      });

      await use();
    },
    { auto: true },
  ],
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
  usage: async ({ page, request }, use, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;
    await use(createUsageHelper(page, request, baseURL));
  },
});

export { expect };
