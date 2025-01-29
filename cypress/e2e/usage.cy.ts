import {
  createProject,
  createUserAndOrganization,
  generateRandomSlug,
  waitForOrganizationPage,
  waitForProjectPage,
  waitForTargetPage,
} from '../support/testkit';
import type { Report } from './../../packages/libraries/core/src/client/usage.js';

function createRegistryAccessToken(params: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  // Visit Registry Tokens settings
  cy.get(
    `a[href="/${params.organizationSlug}/${params.projectSlug}/${params.targetSlug}/settings"]`,
  ).click();
  cy.get('[data-cy="target-settings-registry-token-link"]').click();
  // Open the form
  cy.get('[data-cy="target-settings-registry-token"] [data-cy="new-button"]').click();
  // Fill in the token description
  cy.get('[data-cy="create-registry-token-form"] [data-cy="description"]').type('test-token');
  // Pick the permissions
  cy.get('[data-cy="registry-access-scope"] [data-cy="select-trigger"]').click();
  cy.get(
    '[data-cy="registry-access-scope-select-content"] [data-cy="select-option-REGISTRY_WRITE"]',
  ).click();
  // Submit
  cy.get('[data-cy="create-registry-token-form"] [data-cy="submit"]').click();

  // assert the token is created
  cy.get('[data-cy="registry-token-created"] input[type="text"]')
    .invoke('val')
    .then(value => {
      if (typeof value !== 'string') {
        throw new Error('Expected a string');
      }

      return value;
    })
    .as('token');
  cy.get('@token').should('have.length', 32);

  // close the modal
  cy.get('[data-cy="registry-token-created"] [data-cy="close"]').contains('Ok, got it!').click();
}

function sendUsageReport(params: { report: Report }) {
  // send a usage report
  cy.get('@token')
    .then(async token => {
      const res = await fetch(`http://localhost:8081`, {
        method: 'POST',
        body: JSON.stringify(params.report),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          // it is a string, Cypress Hill just doesn't know it
          Authorization: `Bearer ${token as unknown as string}`,
        },
      });

      cy.log('Response: ' + JSON.stringify(await res.clone().json()));

      expect(res.status).to.equal(200);
    })
    .wait(2000);
}

describe('usage reporting', () => {
  it('usage report should be visible in Insights', () => {
    const organizationSlug = generateRandomSlug();
    const projectSlug = generateRandomSlug();
    const targetSlug = 'development';

    createUserAndOrganization(organizationSlug);
    waitForOrganizationPage(organizationSlug);

    createProject(projectSlug);
    waitForProjectPage(projectSlug);

    // go to the development target
    cy.get(`a[href="/${organizationSlug}/${projectSlug}/${targetSlug}"]`).click();
    waitForTargetPage(targetSlug);

    createRegistryAccessToken({ organizationSlug, projectSlug, targetSlug });

    sendUsageReport({
      report: {
        size: 1,
        map: {
          op1: {
            operation: 'query ping { ping }',
            operationName: 'ping',
            fields: ['Query', 'Query.ping'],
          },
        },
        operations: [
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 30_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'ios',
                version: 'v1.2.3',
              },
            },
          },
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 50_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'android',
                version: 'v1.2.3',
              },
            },
          },
        ],
      },
    });

    // visit Insights
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights`);
    cy.get('h3').contains('Operations').parent().get('a').contains('_ping');
    // visit Insights of "unknown" client
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights/client/ios`);
    cy.get('h3').contains('Operations').parent().get('a').contains('_ping');
    cy.get('h3').contains('Versions').parent().get('p').contains('v1.2.3');
  });

  it('usage report with "unknown" client should be visible in Insights', () => {
    const organizationSlug = generateRandomSlug();
    const projectSlug = generateRandomSlug();
    const targetSlug = 'development';

    createUserAndOrganization(organizationSlug);
    waitForOrganizationPage(organizationSlug);

    createProject(projectSlug);
    waitForProjectPage(projectSlug);

    // go to the development target
    cy.get(`a[href="/${organizationSlug}/${projectSlug}/${targetSlug}"]`).click();
    waitForTargetPage(targetSlug);

    createRegistryAccessToken({ organizationSlug, projectSlug, targetSlug });

    sendUsageReport({
      report: {
        size: 1,
        map: {
          op1: {
            operation: 'query ping { ping }',
            operationName: 'ping',
            fields: ['Query', 'Query.ping'],
          },
        },
        operations: [
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 200_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'unknown',
                version: 'v1.2.3',
              },
            },
          },
        ],
      },
    });

    // visit Insights
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights`);
    cy.get('h3').contains('Operations').parent().get('a').contains('_ping');
    // visit Insights of "unknown" client
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights/client/unknown`);
    cy.get('h3').contains('Operations').parent().get('a').contains('_ping');
    cy.get('h3').contains('Versions').parent().get('p').contains('v1.2.3');
  });

  it('usage report with missing client name should be visible in Insights', () => {
    const organizationSlug = generateRandomSlug();
    const projectSlug = generateRandomSlug();
    const targetSlug = 'development';

    createUserAndOrganization(organizationSlug);
    waitForOrganizationPage(organizationSlug);

    createProject(projectSlug);
    waitForProjectPage(projectSlug);

    // go to the development target
    cy.get(`a[href="/${organizationSlug}/${projectSlug}/${targetSlug}"]`).click();
    waitForTargetPage(targetSlug);

    createRegistryAccessToken({ organizationSlug, projectSlug, targetSlug });

    sendUsageReport({
      report: {
        size: 1,
        map: {
          op1: {
            operation: 'query ping { ping }',
            operationName: 'ping',
            fields: ['Query', 'Query.ping'],
          },
        },
        operations: [
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 200_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: undefined,
                version: 'v1.2.3',
              },
            },
          },
        ],
      },
    });

    // visit Insights
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights`);
    cy.get('h3').contains('Operations').parent().get('a').contains('_ping');
    // visit Insights of "unknown" client (we use "unknown" as a fallback for missing client name)
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights/client/unknown`);
    cy.get('h3').contains('Operations').parent().get('a').contains('_ping');
    cy.get('h3').contains('Versions').parent().get('p').contains('v1.2.3');
  });

  it('usage report with missing and "unknown" client names should be visible in Insights', () => {
    const organizationSlug = generateRandomSlug();
    const projectSlug = generateRandomSlug();
    const targetSlug = 'development';

    createUserAndOrganization(organizationSlug);
    waitForOrganizationPage(organizationSlug);

    createProject(projectSlug);
    waitForProjectPage(projectSlug);

    // go to the development target
    cy.get(`a[href="/${organizationSlug}/${projectSlug}/${targetSlug}"]`).click();
    waitForTargetPage(targetSlug);

    createRegistryAccessToken({ organizationSlug, projectSlug, targetSlug });

    sendUsageReport({
      report: {
        size: 1,
        map: {
          op1: {
            operation: 'query ping { ping }',
            operationName: 'ping',
            fields: ['Query', 'Query.ping'],
          },
          op2: {
            operation: 'query pong { pong }',
            operationName: 'pong',
            fields: ['Query', 'Query.pong'],
          },
        },
        operations: [
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 200_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: undefined,
                version: 'vUndefined',
              },
            },
          },
          {
            operationMapKey: 'op2',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 200_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'unknown',
                version: 'vUnknown',
              },
            },
          },
        ],
      },
    });

    // visit Insights
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights`);
    cy.get('h3').contains('Operations').parent().get('a').contains('_ping');
    cy.get('h3').contains('Operations').parent().get('a').contains('_pong');
    // visit Insights of "unknown" client (we use "unknown" as a fallback for missing client name)
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights/client/unknown`);
    cy.get('h3').contains('Operations').parent().get('a').contains('_ping');
    cy.get('h3').contains('Operations').parent().get('a').contains('_pong');
    cy.get('h3').contains('Versions').parent().get('p').contains('vUndefined');
    cy.get('h3').contains('Versions').parent().get('p').contains('vUnknown');
  });

  it('partially corrupted usage report should be visible in Insights', () => {
    const organizationSlug = generateRandomSlug();
    const projectSlug = generateRandomSlug();
    const targetSlug = 'development';

    createUserAndOrganization(organizationSlug);
    waitForOrganizationPage(organizationSlug);

    createProject(projectSlug);
    waitForProjectPage(projectSlug);

    // go to the development target
    cy.get(`a[href="/${organizationSlug}/${projectSlug}/${targetSlug}"]`).click();
    waitForTargetPage(targetSlug);

    createRegistryAccessToken({ organizationSlug, projectSlug, targetSlug });

    sendUsageReport({
      report: {
        size: 1,
        map: {
          op1: {
            operation: 'query ping { ping }',
            operationName: 'ping',
            fields: ['Query', 'Query.ping'],
          },
        },
        operations: [
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              // ERROR: negative value
              duration: -300_000_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'ios',
                version: 'v1.2.3',
              },
            },
          },
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 10_000_000_000,
              // ERROR: negative value
              errorsTotal: -2,
            },
            metadata: {
              client: {
                name: 'web',
                version: 'v1.2.3',
              },
            },
          },
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              // ERROR: decimal
              duration: 10_000_000_000.123,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'web',
                version: 'v1.2.3',
              },
            },
          },
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 10_000_000_000,
              // ERROR: decimal
              errorsTotal: 2.5,
            },
            metadata: {
              client: {
                name: 'web',
                version: 'v1.2.3',
              },
            },
          },
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 10_000_000_000,
              // ERROR: too big value
              errorsTotal: Math.pow(2, 30),
            },
            metadata: {
              client: {
                name: 'web',
                version: 'v1.2.3',
              },
            },
          },
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              // ERROR: too big value
              duration: Math.pow(2, 64),
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'web',
                version: 'v1.2.3',
              },
            },
          },
          {
            operationMapKey: 'op1',
            // ERROR: negative timestamp
            timestamp: -Date.now(),
            execution: {
              ok: true,
              duration: 20_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'web',
                version: 'v1.2.3',
              },
            },
          },
          {
            operationMapKey: 'op1',
            // ERROR: incorrect timestamp
            timestamp: 1234,
            execution: {
              ok: true,
              duration: 20_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'web',
                version: 'v1.2.3',
              },
            },
          },
          {
            operationMapKey: 'op1',
            timestamp: Date.now(),
            execution: {
              ok: true,
              duration: 50_000_000,
              errorsTotal: 0,
            },
            metadata: {
              client: {
                name: 'android',
                version: 'v1.2.3',
              },
            },
          },
        ],
      },
    });

    // visit Insights
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights`);
    cy.get('h3').contains('Operations').parent().get('a').contains('_ping');
    cy.get('h3').contains('Requests').parent().parent().get('div > div').contains('1');
    // android should be reported
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights/client/android`);
    cy.get('h3').contains('Operations').parent().get('a').contains('_ping');
    cy.get('h3').contains('Versions').parent().get('p').contains('v1.2.3');
    // ios should not be reported (negative duration)
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights/client/ios`);
    cy.get('h3').contains('Operations').parent().get('a').should('not.contain', '_ping');
    cy.get('h3').contains('Versions').parent().get('p').should('not.contain', 'v1.2.3');
    // web should not be reported (negative values, decimals, too big values)
    cy.visit(`/${organizationSlug}/${projectSlug}/${targetSlug}/insights/client/web`);
    cy.get('h3').contains('Operations').parent().get('a').should('not.contain', '_ping');
    cy.get('h3').contains('Versions').parent().get('p').should('not.contain', 'v1.2.3');
  });
});
