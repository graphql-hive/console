import { expect, type Page } from '@playwright/test';
import type { SeedHelper } from '../fixtures';
import type { TestUser } from './data';

function decodeAccessToken(accessToken: string) {
  const [, payload] = accessToken.split('.');

  if (!payload) {
    throw new Error('Invalid access token');
  }

  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    exp: number;
    sub: string;
  } & Record<string, unknown>;
}

function createFrontToken(accessToken: string) {
  const payload = decodeAccessToken(accessToken);

  return Buffer.from(
    JSON.stringify({
      uid: payload.sub,
      ate: payload.exp * 1000,
      up: payload,
    }),
  ).toString('base64');
}

export type AuthHelper = {
  fillSignInFormAndSubmit(user: Pick<TestUser, 'email' | 'password'>): Promise<void>;
  fillSignUpFormAndSubmit(user: TestUser): Promise<void>;
  signup(user: TestUser): Promise<void>;
  login(user: Pick<TestUser, 'email' | 'password'>): Promise<void>;
  clearSession(): Promise<void>;
  useSession(tokens: { refreshToken: string; accessToken?: string }): Promise<void>;
  useRefreshToken(refreshToken: string, accessToken?: string): Promise<void>;
};

export function createAuthHelper(
  page: Page,
  getSeed: () => Promise<SeedHelper>,
  baseURL: unknown,
  clearBrowserSession: (page: Page) => Promise<void>,
): AuthHelper {
  const cookieUrl = typeof baseURL === 'string' && baseURL ? baseURL : 'http://localhost:3000';

  return {
    async fillSignInFormAndSubmit(user) {
      const form = page.locator('form').first();
      await form.locator('input[name="email"]').fill(user.email);
      await form.locator('input[name="password"]').fill(user.password);
      await form.evaluate(formElement => {
        (formElement as HTMLFormElement).requestSubmit();
      });
    },
    async fillSignUpFormAndSubmit(user) {
      const form = page.locator('form').first();
      await form.locator('input[name="firstName"]').fill(user.firstName);
      await form.locator('input[name="lastName"]').fill(user.lastName);
      await form.locator('input[name="email"]').fill(user.email);
      await form.locator('input[name="password"]').fill(user.password);
      await form.evaluate(formElement => {
        (formElement as HTMLFormElement).requestSubmit();
      });
    },
    async signup(user) {
      await page.goto('/');
      await page.locator('a[data-auth-link="sign-up"]').click();
      await this.fillSignUpFormAndSubmit(user);
      const verifyEmail = page.getByText('Verify your email address');
      const createOrganization = page.getByText('Create an organization');
      await expect(verifyEmail.or(createOrganization)).toBeVisible();

      if (await verifyEmail.isVisible()) {
        const seed = await getSeed();
        const confirmationPath = await seed.getEmailConfirmationLink(user.email);
        await page.goto(confirmationPath);
        await expect(page.getByText('Success!')).toBeVisible();
        await page.locator('[data-button-verify-email-continue]').click();
      }

      await expect(createOrganization).toBeVisible();
    },
    async login(user) {
      await page.goto('/');
      await this.fillSignInFormAndSubmit(user);
      await expect(page.getByText('Create Organization')).toBeVisible();
    },
    async clearSession() {
      await clearBrowserSession(page);
    },
    async useSession({ refreshToken, accessToken }) {
      const origin = new URL(cookieUrl);
      const secure = origin.protocol === 'https:';

      await page.context().addCookies([
        {
          name: 'sRefreshToken',
          value: refreshToken,
          url: origin.origin,
          sameSite: 'Lax',
          secure,
        },
        ...(accessToken
          ? [
              {
                name: 'sAccessToken',
                value: accessToken,
                url: origin.origin,
                sameSite: 'Lax' as const,
                secure,
              },
              {
                name: 'sFrontToken',
                value: createFrontToken(accessToken),
                url: origin.origin,
                sameSite: 'Lax' as const,
                secure,
              },
              {
                name: 'st-last-access-token-update',
                value: Date.now().toString(),
                url: origin.origin,
                sameSite: 'Lax' as const,
                secure,
              },
            ]
          : []),
      ]);
    },
    async useRefreshToken(refreshToken, accessToken) {
      await this.useSession({ refreshToken, accessToken });
    },
  };
}
