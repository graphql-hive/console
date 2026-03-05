namespace Cypress {
  export interface Chainable {
    fillSignInFormAndSubmit(data: { email: string; password: string }): Chainable;
    fillSignUpFormAndSubmit(data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }): Chainable;
    signup(data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    }): Chainable;
    login(data: { email: string; password: string }): Chainable;
    dataCy<Node = HTMLElement>(name: string): Chainable<JQuery<Node>>;
    createOIDCIntegration(): Chainable<{
      loginUrl: string;
      organizationSlug: string;
    }>;
  }
}

Cypress.Commands.add('createOIDCIntegration', () => {
  const isLocal = Cypress.env('RUN_AGAINST_LOCAL_SERVICES') == '1';

  cy.contains('a', 'Settings').click();
  cy.get('[data-cy="link-sso"]').click();
  cy.get('button[data-button-connect-open-id-provider]').click();
  cy.get('button[data-button-oidc-manual]').click();
  const form = () => cy.get('form[data-form-oidc]');
  form()
    .find('input[name="token_endpoint"]')
    .type(
      isLocal ? 'http://localhost:7043/connect/token' : 'http://oidc-server-mock:80/connect/token',
    );
  form()
    .find('input[name="userinfo_endpoint"]')
    .type(
      isLocal
        ? 'http://localhost:7043/connect/userinfo'
        : 'http://oidc-server-mock:80/connect/userinfo',
    );
  form()
    .find('input[name="authorization_endpoint"]')
    .type('http://localhost:7043/connect/authorize');
  form().find('input[name="clientId"]').type('implicit-mock-client');
  form().find('input[name="clientSecret"]').type('client-credentials-mock-client-secret');

  cy.get('button[data-button-oidc-save]').click();

  return cy
    .get('span[data-oidc-property-sign-in-url]')
    .then(async $elem => {
      const url = $elem.text();

      if (!url) {
        throw new Error('Failed to resolve OIDC integration URL');
      }

      if (typeof url !== 'string') {
        throw new Error('OIDC integration URL is not a string');
      }

      return url;
    })
    .then(loginUrl => {
      return cy.url().then(url => {
        const organizationSlug = new URL(url).pathname.split('/')[1];

        if (!organizationSlug) {
          throw new Error('Failed to resolve organization slug from URL:' + url);
        }

        return {
          loginUrl,
          organizationSlug,
        };
      });
    });
});

Cypress.Commands.add('fillSignInFormAndSubmit', user => {
  cy.get('form').within(() => {
    cy.get('input[name="email"]').type(user.email);
    cy.get('input[name="password"]').type(user.password, {
      force: true, // skip waiting for async email validation
    });
    cy.root().submit();
  });
});

Cypress.Commands.add('fillSignUpFormAndSubmit', user => {
  cy.get('form').within(() => {
    cy.get('input[name="firstName"]').type(user.firstName);
    cy.get('input[name="lastName"]').type(user.lastName);
    cy.get('input[name="email"]').type(user.email);
    cy.get('input[name="password"]').type(user.password, {
      force: true, // skip waiting for async email validation
    });
    cy.root().submit();
  });
});

Cypress.Commands.add('signup', user => {
  cy.visit('/');

  cy.get('a[data-auth-link="sign-up"]').click();
  cy.fillSignUpFormAndSubmit(user);

  cy.contains('Verify your email address');

  const email = user.email;
  return cy.task('getEmailConfirmationLink', email).then((url: string) => {
    cy.visit(url);
    cy.contains('Success!');
    cy.get('[data-button-verify-email-continue]').click();
    cy.contains('Create Organization');
  });
});

Cypress.Commands.add('login', user => {
  cy.visit('/');

  cy.fillSignInFormAndSubmit(user);

  cy.contains('Create Organization');
});

Cypress.Commands.add('dataCy', value => {
  return cy.get(`[data-cy="${value}"]`);
});
