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
  it('oidc login for organization via link', () => {
    cy.task('seedOrg').then(({ refreshToken, slug }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);
      cy.visit('/' + slug);

      cy.createOIDCIntegration().then(({ loginUrl }) => {
        cy.visit('/logout');

        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        cy.clearAllSessionStorage();
        cy.visit(loginUrl);

        cy.get('input[id="Input_Username"]').type('test-user');
        cy.get('input[id="Input_Password"]').type('password');
        cy.get('button[value="login"]').click();

        cy.contains('Verify your email address');

        const email = 'sam.tailor@gmail.com';
        return cy.task('getEmailConfirmationLink', email).then((url: string) => {
          cy.visit(url);
          cy.contains('Success!');
          cy.get('[data-button-verify-email-continue]').click();
          cy.get(`a[href="/${slug}"]`).should('exist');
        });
      });
    });
  });

  it('oidc login with organization slug input', () => {
    cy.task('seedOrg').then(({ refreshToken, slug }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);
      cy.visit('/' + slug);
      cy.createOIDCIntegration().then(() => {
        cy.visit('/logout');

        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        cy.clearAllSessionStorage();
        cy.get('a[href^="/auth/sso"]').click();

        // Select organization
        cy.get('input[name="slug"]').type(slug);
        cy.get('button[type="submit"]').click();

        cy.get('input[id="Input_Username"]').type('test-user');
        cy.get('input[id="Input_Password"]').type('password');
        cy.get('button[value="login"]').click();

        cy.contains('Verify your email address');

        const email = 'sam.tailor@gmail.com';
        return cy.task('getEmailConfirmationLink', email).then((url: string) => {
          cy.visit(url);
          cy.contains('Success!');
          cy.get('[data-button-verify-email-continue]').click();
          cy.get(`a[href="/${slug}"]`).should('exist');
        });
      });
    });
  });

  it('first time oidc login of non-admin user', () => {
    cy.task('seedOrg').then(({ refreshToken, slug }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);
      cy.visit('/' + slug);
      cy.createOIDCIntegration().then(() => {
        cy.visit('/logout');

        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        cy.clearAllSessionStorage();
        cy.get('a[href^="/auth/sso"]').click();

        // Select organization
        cy.get('input[name="slug"]').type(slug);
        cy.get('button[type="submit"]').click();

        cy.get('input[id="Input_Username"]').type('test-user-2');
        cy.get('input[id="Input_Password"]').type('password');
        cy.get('button[value="login"]').click();

        cy.contains('Verify your email address');

        const email = 'tom.sailor@gmail.com';
        return cy.task('getEmailConfirmationLink', email).then((url: string) => {
          cy.visit(url);
          cy.contains('Success!');
          cy.get('[data-button-verify-email-continue]').click();
          cy.get(`a[href="/${slug}"]`).should('exist');
        });
      });
    });
  });

  it('default member role for first time oidc login', () => {
    cy.task('seedOrg').then(({ refreshToken, slug }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);
      cy.visit('/' + slug);
      cy.createOIDCIntegration().then(() => {
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

        cy.contains('Verify your email address');
        const email = 'tom.sailor@gmail.com';
        return cy.task('getEmailConfirmationLink', email).then((url: string) => {
          cy.visit(url);
          cy.contains('Success!');
          cy.get('[data-button-verify-email-continue]').click();

          cy.get(`a[href="/${slug}"]`).should('exist');
          // Check if the user has the Admin role by checking if the Members tab is visible
          cy.get(`a[href^="/${slug}/view/members"]`).should('exist');
        });
      });
    });
  });

  it('emailpassword account linking with existing oidc user', () => {
    cy.task('seedOrg').then(({ refreshToken, slug }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);
      cy.visit('/' + slug);

      cy.createOIDCIntegration().then(() => {
        cy.visit('/logout');
        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        cy.clearAllSessionStorage();
        cy.get('a[href^="/auth/sso"]').click();

        // Select organization
        cy.get('input[name="slug"]').type(slug);
        cy.get('button[type="submit"]').click();

        cy.get('input[id="Input_Username"]').type('test-user-2');
        cy.get('input[id="Input_Password"]').type('password');
        cy.get('button[value="login"]').click();

        cy.contains('Verify your email address');
        const email = 'tom.sailor@gmail.com';
        return cy.task('getEmailConfirmationLink', email).then((url: string) => {
          cy.visit(url);
          cy.contains('Success!');
          cy.get('[data-button-verify-email-continue]').click();

          cy.get(`a[href="/${slug}"]`).should('exist');

          cy.visit('/logout');
          cy.clearAllCookies();
          cy.clearAllLocalStorage();
          cy.clearAllSessionStorage();

          const now = Date.now();

          // Sign up/in through emailpassword, with email address used previously in OIDC
          const memberData = {
            ...getUserData(),
            email: 'tom.sailor@gmail.com', // see docker/configs/oidc-server-mock/users-config.json
          };
          cy.visit('/auth/sign-up');
          cy.fillSignUpFormAndSubmit(memberData);
          cy.contains('Verify your email address');

          return cy.task('getEmailConfirmationLink', { email, now }).then((url: string) => {
            cy.visit(url);
            cy.contains('Success!');
            cy.get('[data-button-verify-email-continue]').click();

            // Sign up can fail if the account already exists (due to using a fixed email address)
            // Therefore sign out and re-sign in
            cy.visit('/logout');
            cy.clearAllCookies();
            cy.clearAllLocalStorage();
            cy.clearAllSessionStorage();
            cy.visit('/auth/sign-in');
            cy.fillSignInFormAndSubmit(memberData);
            cy.wait(500);

            cy.get(`a[href="/${slug}"]`).should('exist');
          });
        });
      });
    });
  });

  it('oidc login for invalid url shows correct error message', () => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.visit('/auth/oidc?id=invalid');
    cy.get('[data-cy="auth-card-header-description"]').contains('Could not find OIDC integration.');
  });

  describe('requireInvitation', () => {
    it('oidc user cannot join the org without invitation', () => {
      cy.task('seedOrg').then(({ refreshToken, slug }: any) => {
        cy.setCookie('sRefreshToken', refreshToken);
        cy.visit('/' + slug);

        cy.createOIDCIntegration().then(() => {
          cy.get('[data-cy="oidc-require-invitation-toggle"]').click();
          cy.contains('updated');
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

          // Check if OIDC authentication failed as intended
          cy.get(`a[href="/${slug}"]`).should('not.exist');
          cy.contains('not invited');
        });
      });
    });

    it('oidc user can join the org with an invitation', () => {
      cy.task('seedOrg').then(({ refreshToken, slug }: any) => {
        cy.setCookie('sRefreshToken', refreshToken);
        cy.visit('/' + slug);

        cy.createOIDCIntegration().then(() => {
          // Send an invite for the SSO user, with admin role specified
          cy.visit(`/${slug}/view/members?page=invitations`);
          cy.get('button[data-cy="send-invite-trigger"]').click();
          cy.get('input[name="email"]').type('tom.sailor@gmail.com');
          cy.get('button[data-cy="role-selector-trigger"]').click();
          cy.contains('[data-cy="role-selector-item"]', 'Admin').click();
          cy.get('button[type="submit"]').click();
          cy.get('.container table').contains('tom.sailor@gmail.com');

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

          const email = 'tom.sailor@gmail.com';
          cy.task('getEmailConfirmationLink', email).then((url: string) => {
            cy.visit(url);
            cy.contains('Success!');
            cy.get('[data-button-verify-email-continue]').click();
            cy.visit('/' + slug);

            // Check if user joined successfully
            cy.get(`a[href="/${slug}"]`).should('exist');
            cy.contains('not invited').should('not.exist');

            // Check if user has admin role
            cy.visit(`/${slug}/view/members?page=list`);
            cy.contains('tr', 'tom.sailor@gmail.com').contains('Admin');
          });
        });
      });
    });
  });
});

describe('oidc domain verification', () => {
  beforeEach(() => {
    cy.clearAllCookies();
    cy.clearAllLocalStorage();
    cy.clearAllSessionStorage();
    cy.task('purgeOIDCDomains');
  });

  it('registering a domain does not require email verification', () => {
    return cy.task('seedOrg').then(({ refreshToken, slug }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);
      cy.visit('/' + slug);
      cy.contains('Settings', { timeout: 10_000 });

      return cy.createOIDCIntegration().then(({ loginUrl, organizationSlug }) => {
        cy.get('[data-button-add-new-domain]').click();
        cy.get('input[name="domainName"]').type('buzzcheck.dev');
        cy.get('[data-button-next-verify-domain-ownership]').click();

        cy.task('forgeOIDCDNSChallenge', organizationSlug);

        cy.get('[data-button-next-complete]').click();

        cy.visit('/logout');

        cy.clearAllCookies();
        cy.clearAllLocalStorage();
        cy.clearAllSessionStorage();

        cy.visit(loginUrl);

        cy.get('#Input_Username').type('test-user-3');
        cy.get('#Input_Password').type('password');
        cy.get('button[value="login"]').click();

        cy.get(`a[href="/${organizationSlug}"]`).should('exist');
      });
    });
  });
});
