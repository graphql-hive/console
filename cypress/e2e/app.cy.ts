import { generateRandomSlug, getUserData } from '../support/testkit';

describe('basic user flow', () => {
  const user = getUserData();

  it('should be visitable', () => {
    cy.visit('/');
  });

  it('should redirect anon to auth', () => {
    cy.visit('/');
    cy.url().should('include', '/auth/sign-in?redirectToPath=');
  });

  it('should sign up', () => {
    cy.signup(user);
  });

  it('should log in', () => {
    cy.login(user);
  });

  it('should log in and log out', () => {
    cy.login(user);

    const slug = generateRandomSlug();
    cy.get('input[name="slug"]').type(slug);
    cy.get('button[type="submit"]').click();

    // Logout
    cy.get('[data-cy="user-menu-trigger"]').click();
    cy.get('[data-cy="user-menu-logout"]').click();
    cy.url().should('include', '/auth/sign-in?redirectToPath=');
  });
});

it('create organization', () => {
  const slug = generateRandomSlug();
  const user = getUserData();
  cy.visit('/');
  cy.signup(user);
  cy.get('input[name="slug"]').type(slug);
  cy.get('button[type="submit"]').click();
  cy.get('[data-cy="organization-picker-current"]').contains(slug);
});

describe('oidc', () => {
  it('oidc login for organization', () => {
    const organizationAdminUser = getUserData();
    cy.visit('/');
    cy.signup(organizationAdminUser);

    const slug = generateRandomSlug();
    cy.createOIDCIntegration(slug).then(({ loginUrl }) => {
      cy.visit('/logout');

      cy.clearAllCookies();
      cy.clearAllLocalStorage();
      cy.clearAllSessionStorage();
      cy.visit(loginUrl);

      cy.get('input[id="Input_Username"]').type('test-user');
      cy.get('input[id="Input_Password"]').type('password');
      cy.get('button[value="login"]').click();

      cy.get(`a[href="/${slug}"]`).should('exist');
      // Organization picker should not be visible
      cy.get('[data-cy="organization-picker-current"]').should('not.exist');
    });
  });

  it('oidc login with organization slug', () => {
    const organizationAdminUser = getUserData();
    cy.visit('/');
    cy.signup(organizationAdminUser);

    const slug = generateRandomSlug();
    cy.createOIDCIntegration(slug).then(({ organizationSlug }) => {
      cy.visit('/logout');

      cy.clearAllCookies();
      cy.clearAllLocalStorage();
      cy.clearAllSessionStorage();
      cy.get('a[href^="/auth/sso"]').click();

      // Select organization
      cy.get('input[name="slug"]').type(organizationSlug);
      cy.get('button[type="submit"]').click();

      cy.get('input[id="Input_Username"]').type('test-user');
      cy.get('input[id="Input_Password"]').type('password');
      cy.get('button[value="login"]').click();

      cy.get(`a[href="/${slug}"]`).should('exist');
    });
  });

  it('first time oidc login of non-admin user', () => {
    const organizationAdminUser = getUserData();
    cy.visit('/');
    cy.signup(organizationAdminUser);

    const slug = generateRandomSlug();
    cy.createOIDCIntegration(slug).then(({ organizationSlug }) => {
      cy.visit('/logout');

      cy.clearAllCookies();
      cy.clearAllLocalStorage();
      cy.clearAllSessionStorage();
      cy.get('a[href^="/auth/sso"]').click();

      // Select organization
      cy.get('input[name="slug"]').type(organizationSlug);
      cy.get('button[type="submit"]').click();

      cy.get('input[id="Input_Username"]').type('test-user-2');
      cy.get('input[id="Input_Password"]').type('password');
      cy.get('button[value="login"]').click();

      cy.get(`a[href="/${slug}"]`).should('exist');
    });
  });

  it('default member role for first time oidc login', () => {
    const organizationAdminUser = getUserData();
    cy.visit('/');
    cy.signup(organizationAdminUser);

    const slug = generateRandomSlug();
    cy.createOIDCIntegration(slug);

    // Pick Admin role as the default role
    cy.get('[data-cy="role-selector-trigger"]').click();
    cy.contains('[data-cy="role-selector-item"]', 'Admin').click();
    cy.visit('/logout');

    // First time login
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.get('a[href^="/auth/sso"]').click();
    cy.get('input[name="slug"]').type(slug);
    cy.get('button[type="submit"]').click();
    // OIDC login
    cy.get('input[id="Input_Username"]').type('test-user-2');
    cy.get('input[id="Input_Password"]').type('password');
    cy.get('button[value="login"]').click();

    cy.get(`a[href="/${slug}"]`).should('exist');
    // Check if the user has the Admin role by checking if the Members tab is visible
    cy.get(`a[href^="/${slug}/view/members"]`).should('exist');
  });

  it('oidc login for invalid url shows correct error message', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.visit('/auth/oidc?id=invalid');
    cy.get('[data-cy="auth-card-header-description"]').contains('Could not find OIDC integration.');
  });
});
