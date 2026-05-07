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
  const isLocal = process.env.RUN_AGAINST_LOCAL_SERVICES === '1';

  return {
    async createIntegration() {
      await page.getByRole('link', { name: 'Settings' }).click();
      await page.locator('[data-cy="link-sso"]').click();
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
        .fill('http://localhost:7043/connect/authorize');
      await form.locator('input[name="clientId"]').fill('implicit-mock-client');
      await form
        .locator('input[name="clientSecret"]')
        .fill('client-credentials-mock-client-secret');
      await page.locator('button[data-button-oidc-save]').click();

      const loginUrl = await page.locator('span[data-oidc-property-sign-in-url]').innerText();

      if (!loginUrl) {
        throw new Error('Failed to resolve OIDC integration URL');
      }

      const organizationSlug = new URL(page.url()).pathname.split('/')[1];

      if (!organizationSlug) {
        throw new Error(`Failed to resolve organization slug from URL: ${page.url()}`);
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

      if (input.verifyEmail !== false && input.email) {
        const confirmationPath = await seed.getEmailConfirmationLink(
          input.since ? { email: input.email, now: input.since } : input.email,
        );
        await page.goto(confirmationPath);
        await page.getByText('Success!').waitFor();
        await page.locator('[data-button-verify-email-continue]').click();
      }
    },
    async startSlugLogin(slug) {
      await page.goto('/logout');
      await auth.clearSession();
      await page.goto('/auth/sign-in');
      await page.locator('a[href^="/auth/sso"]').click();
      await page.locator('input[name="slug"]').fill(slug);
      await page.locator('button[type="submit"]').click();
    },
  };
}
