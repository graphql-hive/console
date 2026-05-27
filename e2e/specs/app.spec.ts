import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures';
import { generateRandomSlug, getUserData } from '../helpers/data';

async function expectOrganizationHome(page: Page, slug: string) {
  await page.waitForURL(new RegExp(`/${slug}(?:$|[/?#])`));
  await expect(page.getByText(slug).first()).toBeVisible();
}

test.describe('basic user flow', () => {
  test('should be visitable', async ({ page }) => {
    await page.goto('/');
  });

  test('should redirect anon to auth', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth\/sign-in\?redirectToPath=/);
  });

  test('should sign up', async ({ auth }) => {
    await auth.signup(getUserData());
  });

  test('should log in', async ({ auth }) => {
    const user = getUserData();

    await auth.signup(user);
    await auth.clearSession();
    await auth.login(user);
  });

  test('should log in and log out', async ({ page, auth, app }) => {
    const user = getUserData();

    await auth.signup(user);
    await auth.clearSession();
    await auth.login(user);
    await app.createOrganization(generateRandomSlug());

    await page.locator('[data-cy="user-menu-trigger"]').click();
    await page.locator('[data-cy="user-menu-logout"]').click();
    await expect(page).toHaveURL(/\/auth\/sign-in\?redirectToPath=/);
  });
});

test('create organization', async ({ app }) => {
  await app.createUserAndOrganization(getUserData(), generateRandomSlug());
});

test.describe('oidc', () => {
  test('oidc login for organization via link', async ({ page, seed, auth, oidc }) => {
    const { accessToken, refreshToken, slug } = await seed.seedOrg();
    await auth.useSession({ refreshToken, accessToken });
    await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });

    const { loginUrl } = await oidc.createIntegration();
    await page.goto('/logout', { waitUntil: 'commit' });
    await auth.clearSession();
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });

    await oidc.loginWithMockUser({ username: 'test-user', email: 'sam.tailor@gmail.com' });
    await expectOrganizationHome(page, slug);
  });

  test('oidc login with organization slug input', async ({ page, seed, auth, oidc }) => {
    const { accessToken, refreshToken, slug } = await seed.seedOrg();
    await auth.useSession({ refreshToken, accessToken });
    await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });

    await oidc.createIntegration();
    await oidc.startSlugLogin(slug);

    await oidc.loginWithMockUser({ username: 'test-user', email: 'sam.tailor@gmail.com' });
    await expectOrganizationHome(page, slug);
  });

  test('first time oidc login of non-admin user', async ({ page, seed, auth, oidc }) => {
    const { accessToken, refreshToken, slug } = await seed.seedOrg();
    await auth.useSession({ refreshToken, accessToken });
    await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });

    await oidc.createIntegration();
    await oidc.startSlugLogin(slug);

    await oidc.loginWithMockUser({ username: 'test-user-2', email: 'tom.sailor@gmail.com' });
    await expectOrganizationHome(page, slug);
  });

  test('default member role for first time oidc login', async ({ page, seed, auth, oidc }) => {
    const { accessToken, refreshToken, slug } = await seed.seedOrg();
    await auth.useSession({ refreshToken, accessToken });
    await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });

    await oidc.createIntegration();
    await page.locator('[data-cy="role-selector-trigger"]').click();
    await page.locator('[data-cy="role-selector-item"]').getByText('Admin').click();

    await oidc.startSlugLogin(slug);
    await oidc.loginWithMockUser({ username: 'test-user-2', email: 'tom.sailor@gmail.com' });

    await expectOrganizationHome(page, slug);
    await expect(page.getByRole('tab', { name: 'Members' })).toBeVisible();
  });

  test('oidc account linking with existing emailpassword user', async ({
    page,
    seed,
    auth,
    oidc,
  }) => {
    const email = 'hive.bro@buzzcheck.dev';
    await seed.purgeUserByEmail(email);

    const { accessToken, refreshToken, slug } = await seed.seedOrg();
    await auth.useSession({ refreshToken, accessToken });
    await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });

    await oidc.createIntegration();
    await page.goto('/logout', { waitUntil: 'commit' });
    await auth.clearSession();

    const now = Date.now();
    const memberData = {
      ...getUserData(),
      email,
    };
    await page.goto('/auth/sign-up', { waitUntil: 'domcontentloaded' });
    await auth.fillSignUpFormAndSubmit(memberData);
    const verifyEmail = page.getByText('Verify your email address');
    const createOrganization = page.getByText('Create an organization');
    await expect(verifyEmail.or(createOrganization)).toBeVisible();

    if (await verifyEmail.isVisible()) {
      const confirmationPath = await seed.getEmailConfirmationLink({ email, now });
      await page.goto(confirmationPath, { waitUntil: 'domcontentloaded' });
      await expect(page.getByText('Success!')).toBeVisible();
      await page.locator('[data-button-verify-email-continue]').click();
    }

    await page.goto('/logout', { waitUntil: 'commit' });
    await auth.clearSession();

    await oidc.startSlugLogin(slug);
    await oidc.loginWithMockUser({ username: 'test-user-3', email });
    await expectOrganizationHome(page, slug);

    await page.goto('/logout', { waitUntil: 'commit' });
    await auth.clearSession();
    await page.goto('/auth/sign-in', { waitUntil: 'domcontentloaded' });
    await auth.fillSignInFormAndSubmit(memberData);

    await expectOrganizationHome(page, slug);
  });

  test('oidc login for invalid url shows correct error message', async ({ page, auth }) => {
    await auth.clearSession();
    await page.goto('/auth/oidc?id=invalid', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-cy="auth-card-header-description"]')).toContainText(
      'Something went wrong. Please try again',
    );
  });

  test.describe('requireInvitation', () => {
    test('oidc user cannot join the org without invitation', async ({ page, seed, auth, oidc }) => {
      const { accessToken, refreshToken, slug } = await seed.seedOrg();
      await auth.useSession({ refreshToken, accessToken });
      await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });

      await oidc.createIntegration();
      await page.locator('[data-cy="oidc-require-invitation-toggle"]').click();
      await expect(
        page.getByText('OIDC restrictions updated successfully', { exact: true }).first(),
      ).toBeVisible();

      await oidc.startSlugLogin(slug);
      await oidc.loginWithMockUser({ username: 'test-user-2', verifyEmail: false });

      await expect(page.locator(`a[href="/${slug}"]`)).not.toBeVisible();
      await expect(page.getByText('Sign in not allowed.')).toBeVisible();
    });

    test('oidc user can join the org with an invitation', async ({ page, seed, auth, oidc }) => {
      const { accessToken, refreshToken, slug } = await seed.seedOrg();
      await auth.useSession({ refreshToken, accessToken });
      await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });

      await oidc.createIntegration();
      await page.goto(`/${slug}/view/members?page=invitations`, {
        waitUntil: 'domcontentloaded',
      });
      await page.locator('button[data-cy="send-invite-trigger"]').click();
      await page.locator('input[name="email"]').fill('tom.sailor@gmail.com');
      await page.locator('button[data-cy="role-selector-trigger"]').click();
      await page.locator('[data-cy="role-selector-item"]').getByText('Admin').click();
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('.container table')).toContainText('tom.sailor@gmail.com');

      await oidc.startSlugLogin(slug);
      await oidc.loginWithMockUser({ username: 'test-user-2', email: 'tom.sailor@gmail.com' });

      await expectOrganizationHome(page, slug);
      await expect(page.getByText('not invited')).not.toBeVisible();

      await page.goto(`/${slug}/view/members?page=list`, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('tr').filter({ hasText: 'tom.sailor@gmail.com' })).toContainText(
        'Admin',
      );
    });
  });
});

test.describe('oidc domain verification', () => {
  test.beforeEach(async ({ auth, seed }) => {
    await auth.clearSession();
    await seed.purgeOIDCDomains();
  });

  test('registering a domain does not require email verification', async ({
    page,
    seed,
    auth,
    oidc,
  }) => {
    const { accessToken, refreshToken, slug } = await seed.seedOrg();
    await auth.useSession({ refreshToken, accessToken });
    await page.goto(`/${slug}`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Settings')).toBeVisible();

    const { loginUrl, organizationSlug } = await oidc.createIntegration();
    await page.locator('[data-button-add-new-domain]').click();
    await page.locator('input[name="domainName"]').fill('buzzcheck.dev');
    await page.locator('[data-button-next-verify-domain-ownership]').click();

    await seed.forgeOIDCDNSChallenge(organizationSlug);
    await page.locator('[data-button-next-complete]').click();
    await expect(page.getByText('successfully verified')).toBeVisible();
    await page
      .getByRole('dialog', { name: /Verify Domain Ownership/ })
      .getByRole('button', { name: 'Close' })
      .last()
      .click();

    await page.goto('/logout', { waitUntil: 'commit' });
    await auth.clearSession();
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    await oidc.loginWithMockUser({
      username: 'test-user-3',
      verifyEmail: false,
    });

    await expectOrganizationHome(page, organizationSlug);
  });
});
