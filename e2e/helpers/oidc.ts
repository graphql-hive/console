import { type Page } from '@playwright/test';
import type { SeedHelper } from '../fixtures';
import type { AuthHelper } from './auth';

export type OIDCIntegration = {
  loginUrl: string;
  organizationSlug: string;
};

export type OIDCHelper = {
  createIntegration(): Promise<OIDCIntegration>;
  loginWithMockUser(input: {
    username: string;
    email?: string;
    verifyEmail?: boolean;
    since?: number;
  }): Promise<void>;
  startSlugLogin(slug: string): Promise<void>;
};

export function createOIDCHelper(page: Page, seed: SeedHelper, auth: AuthHelper): OIDCHelper {
  const isLocal =
    process.env.RUN_AGAINST_LOCAL_SERVICES === '1' ||
    process.env.HIVE_APP_BASE_URL?.startsWith('http://localhost:3000') === true;
  const appOrigin = new URL(process.env.HIVE_APP_BASE_URL || 'http://localhost:3000').origin;

  return {
    async createIntegration() {
      const organizationSlug = new URL(page.url()).pathname.split('/')[1];

      if (!organizationSlug) {
        throw new Error(`Failed to resolve organization slug from URL: ${page.url()}`);
      }

      await page.goto(`/${organizationSlug}/view/settings?page=sso`, {
        waitUntil: 'domcontentloaded',
      });
      await page.locator('button[data-button-connect-open-id-provider]').click();
      await page.locator('button[data-button-oidc-manual]').click();

      const form = page.locator('form[data-form-oidc]');
      await form
        .locator('input[name="token_endpoint"]')
        .fill(
          isLocal
            ? 'http://localhost:7043/connect/token'
            : 'http://oidc-server-mock:80/connect/token',
        );
      await form
        .locator('input[name="userinfo_endpoint"]')
        .fill(
          isLocal
            ? 'http://localhost:7043/connect/userinfo'
            : 'http://oidc-server-mock:80/connect/userinfo',
        );
      await form
        .locator('input[name="authorization_endpoint"]')
        .fill(
          isLocal
            ? 'http://localhost:7043/connect/authorize'
            : 'http://oidc-server-mock:80/connect/authorize',
        );
      await form.locator('input[name="clientId"]').fill('implicit-mock-client');
      await form
        .locator('input[name="clientSecret"]')
        .fill('client-credentials-mock-client-secret');
      await page.locator('button[data-button-oidc-save]').click();

      const loginUrl = await page.locator('span[data-oidc-property-sign-in-url]').innerText();

      if (!loginUrl) {
        throw new Error('Failed to resolve OIDC integration URL');
      }

      return {
        loginUrl,
        organizationSlug,
      };
    },
    async loginWithMockUser(input) {
      await page.locator('#Input_Username').fill(input.username);
      await page.locator('#Input_Password').fill('password');
      await page.locator('button[value="login"]').click();
      await page.waitForURL(url => url.origin === appOrigin);

      const verifyEmail = page.getByText('Verify your email address');
      const signInNotAllowed = page.getByText('Sign in not allowed.');

      await Promise.race([
        verifyEmail.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined),
        signInNotAllowed.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => undefined),
        page
          .waitForURL(
            url => url.origin === appOrigin && !url.pathname.startsWith('/auth/callback/oidc'),
            { timeout: 15_000 },
          )
          .catch(() => undefined),
      ]);

      if (input.verifyEmail !== false && input.email) {
        if (!(await verifyEmail.isVisible({ timeout: 5_000 }))) {
          return;
        }

        const confirmationPath = await seed.getEmailConfirmationLink(
          input.since ? { email: input.email, now: input.since } : input.email,
        );
        await page.goto(confirmationPath, { waitUntil: 'domcontentloaded' });
        await page.getByText('Success!').waitFor();
        await page.locator('[data-button-verify-email-continue]').click({ noWaitAfter: true });
        await page.waitForURL(url => !url.pathname.startsWith('/auth/verify-email'), {
          waitUntil: 'commit',
        });
      }
    },
    async startSlugLogin(slug) {
      await page.goto('/logout', { waitUntil: 'commit' });
      await auth.clearSession();
      await page.goto('/auth/sign-in', { waitUntil: 'domcontentloaded' });
      await page.locator('a[href^="/auth/sso"]').click();
      await page.locator('input[name="slug"]').fill(slug);
      await page.locator('button[type="submit"]').click();
    },
  };
}
