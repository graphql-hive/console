import { expect, type Page } from '@playwright/test';
import type { SeedHelper } from '../fixtures';
import type { TestUser } from './data';

export type AuthHelper = {
  fillSignInFormAndSubmit(user: Pick<TestUser, 'email' | 'password'>): Promise<void>;
  fillSignUpFormAndSubmit(user: TestUser): Promise<void>;
  signup(user: TestUser): Promise<void>;
  login(user: Pick<TestUser, 'email' | 'password'>): Promise<void>;
  clearSession(): Promise<void>;
  useRefreshToken(refreshToken: string): Promise<void>;
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
      await expect(page.getByText('Verify your email address')).toBeVisible();

      const seed = await getSeed();
      const confirmationPath = await seed.getEmailConfirmationLink(user.email);
      await page.goto(confirmationPath);
      await expect(page.getByText('Success!')).toBeVisible();
      await page.locator('[data-button-verify-email-continue]').click();
      await expect(page.getByText('Create Organization')).toBeVisible();
    },
    async login(user) {
      await page.goto('/');
      await this.fillSignInFormAndSubmit(user);
      await expect(page.getByText('Create Organization')).toBeVisible();
    },
    async clearSession() {
      await clearBrowserSession(page);
    },
    async useRefreshToken(refreshToken) {
      await page.context().addCookies([
        {
          name: 'sRefreshToken',
          value: refreshToken,
          url: cookieUrl,
        },
      ]);
    },
  };
}
