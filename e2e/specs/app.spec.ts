import { expect, test } from '../fixtures';
import { generateRandomSlug, getUserData } from '../helpers/data';

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
    const { refreshToken, slug } = await seed.seedOrg();
    await auth.useRefreshToken(refreshToken);
    await page.goto(`/${slug}`);

    const { loginUrl } = await oidc.createIntegration();
    await page.goto('/logout');
    await auth.clearSession();
    await page.goto(loginUrl);

    await oidc.loginWithMockUser({ username: 'test-user', email: 'sam.tailor@gmail.com' });
    await expect(page.locator(`a[href="/${slug}"]`)).toBeVisible();
  });

  test('oidc login with organization slug input', async ({ page, seed, auth, oidc }) => {
    const { refreshToken, slug } = await seed.seedOrg();
    await auth.useRefreshToken(refreshToken);
    await page.goto(`/${slug}`);

    await oidc.createIntegration();
    await oidc.startSlugLogin(slug);

    await oidc.loginWithMockUser({ username: 'test-user', email: 'sam.tailor@gmail.com' });
    await expect(page.locator(`a[href="/${slug}"]`)).toBeVisible();
  });

  test('first time oidc login of non-admin user', async ({ page, seed, auth, oidc }) => {
    const { refreshToken, slug } = await seed.seedOrg();
    await auth.useRefreshToken(refreshToken);
    await page.goto(`/${slug}`);

    await oidc.createIntegration();
    await oidc.startSlugLogin(slug);

    await oidc.loginWithMockUser({ username: 'test-user-2', email: 'tom.sailor@gmail.com' });
    await expect(page.locator(`a[href="/${slug}"]`)).toBeVisible();
  });

  test('default member role for first time oidc login', async ({ page, seed, auth, oidc }) => {
    const { refreshToken, slug } = await seed.seedOrg();
    await auth.useRefreshToken(refreshToken);
    await page.goto(`/${slug}`);

    await oidc.createIntegration();
    await page.locator('[data-cy="role-selector-trigger"]').click();
    await page.locator('[data-cy="role-selector-item"]').getByText('Admin').click();

    await oidc.startSlugLogin(slug);
    await oidc.loginWithMockUser({ username: 'test-user-2', email: 'tom.sailor@gmail.com' });

    await expect(page.locator(`a[href="/${slug}"]`)).toBeVisible();
    await expect(page.locator(`a[href^="/${slug}/view/members"]`)).toBeVisible();
  });

  test('emailpassword account linking with existing oidc user', async ({
    page,
    seed,
    auth,
    oidc,
  }) => {
    const email = 'tom.sailor@gmail.com';
    const { refreshToken, slug } = await seed.seedOrg();
    await auth.useRefreshToken(refreshToken);
    await page.goto(`/${slug}`);

    await oidc.createIntegration();
    await oidc.startSlugLogin(slug);
    await oidc.loginWithMockUser({ username: 'test-user-2', email });
    await expect(page.locator(`a[href="/${slug}"]`)).toBeVisible();

    await page.goto('/logout');
    await auth.clearSession();

    const now = Date.now();
    const memberData = {
      ...getUserData(),
      email,
    };
    await page.goto('/auth/sign-up');
    await auth.fillSignUpFormAndSubmit(memberData);
    await expect(page.getByText('Verify your email address')).toBeVisible();

    const confirmationPath = await seed.getEmailConfirmationLink({ email, now });
    await page.goto(confirmationPath);
    await expect(page.getByText('Success!')).toBeVisible();
    await page.locator('[data-button-verify-email-continue]').click();

    await page.goto('/logout');
    await auth.clearSession();
    await page.goto('/auth/sign-in');
    await auth.fillSignInFormAndSubmit(memberData);

    await expect(page.locator(`a[href="/${slug}"]`)).toBeVisible();
  });

  test('oidc login for invalid url shows correct error message', async ({ page, auth }) => {
    await auth.clearSession();
    await page.goto('/auth/oidc?id=invalid');
    await expect(page.locator('[data-cy="auth-card-header-description"]')).toContainText(
      'Something went wrong. Please try again',
    );
  });

  test.describe('requireInvitation', () => {
    test('oidc user cannot join the org without invitation', async ({ page, seed, auth, oidc }) => {
      const { refreshToken, slug } = await seed.seedOrg();
      await auth.useRefreshToken(refreshToken);
      await page.goto(`/${slug}`);

      await oidc.createIntegration();
      await page.locator('[data-cy="oidc-require-invitation-toggle"]').click();
      await expect(page.getByText('updated')).toBeVisible();

      await oidc.startSlugLogin(slug);
      await oidc.loginWithMockUser({ username: 'test-user-2', verifyEmail: false });

      await expect(page.locator(`a[href="/${slug}"]`)).not.toBeVisible();
      await expect(page.getByText('Sign in not allowed.')).toBeVisible();
    });

    test('oidc user can join the org with an invitation', async ({ page, seed, auth, oidc }) => {
      const { refreshToken, slug } = await seed.seedOrg();
      await auth.useRefreshToken(refreshToken);
      await page.goto(`/${slug}`);

      await oidc.createIntegration();
      await page.goto(`/${slug}/view/members?page=invitations`);
      await page.locator('button[data-cy="send-invite-trigger"]').click();
      await page.locator('input[name="email"]').fill('tom.sailor@gmail.com');
      await page.locator('button[data-cy="role-selector-trigger"]').click();
      await page.locator('[data-cy="role-selector-item"]').getByText('Admin').click();
      await page.locator('button[type="submit"]').click();
      await expect(page.locator('.container table')).toContainText('tom.sailor@gmail.com');

      await oidc.startSlugLogin(slug);
      await oidc.loginWithMockUser({ username: 'test-user-2', email: 'tom.sailor@gmail.com' });
      await page.goto(`/${slug}`);

      await expect(page.locator(`a[href="/${slug}"]`)).toBeVisible();
      await expect(page.getByText('not invited')).not.toBeVisible();

      await page.goto(`/${slug}/view/members?page=list`);
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
    const { refreshToken, slug } = await seed.seedOrg();
    await auth.useRefreshToken(refreshToken);
    await page.goto(`/${slug}`);
    await expect(page.getByText('Settings')).toBeVisible();

    const { loginUrl, organizationSlug } = await oidc.createIntegration();
    await page.locator('[data-button-add-new-domain]').click();
    await page.locator('input[name="domainName"]').fill('buzzcheck.dev');
    await page.locator('[data-button-next-verify-domain-ownership]').click();

    await seed.forgeOIDCDNSChallenge(organizationSlug);
    await page.locator('[data-button-next-complete]').click();

    await page.goto('/logout');
    await auth.clearSession();
    await page.goto(loginUrl);
    await oidc.loginWithMockUser({
      username: 'test-user-3',
      verifyEmail: false,
    });

    await expect(page.locator(`a[href="/${organizationSlug}"]`)).toBeVisible();
  });
});
