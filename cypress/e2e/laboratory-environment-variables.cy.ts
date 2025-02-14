import {
  as,
  environmentVariablesStorageKey,
  persistAuthenticationCookies,
  selectors,
} from '../support/testkit';

const data = {
  envars: { foo: '123' },
  envarsJson: '{"foo":"123"}',
};

const ctx = {
  // todo get an exported type from testKit
  targetDevelopment: as<{ id: string; slug: string; path: string }>(),
  targetProduction: as<{ id: string; slug: string; path: string }>(),
  cookies: [] as Cypress.Cookie[],
};

before(() => {
  cy.task('seedTarget').then(({ refreshToken, targets }: any) => {
    cy.setCookie('sRefreshToken', refreshToken);
    ctx.targetDevelopment = targets.development;
    ctx.targetProduction = targets.production;
  });
});

persistAuthenticationCookies();

const visitTargetDevelopment = () => cy.visit(`${ctx.targetDevelopment.path}/laboratory`);
// const visitTargetProduction = () => cy.visit(`${ctx.targetProduction.path}/laboratory`);

const openPreflightTab = () => cy.get(selectors.buttonGraphiQLPreflight).click();

const storageGlobalGet = () => cy.getLocalStorage(environmentVariablesStorageKey.global);
const storageGlobalSet = (value: string) => cy.setLocalStorage(environmentVariablesStorageKey.global, value); // prettier-ignore

const storageTargetDevelopmentGet = () => cy.getLocalStorage(environmentVariablesStorageKey.scoped(ctx.targetDevelopment.id)); // prettier-ignore
const storageTargetDevelopmentSet = (value: string) => cy.setLocalStorage(environmentVariablesStorageKey.scoped(ctx.targetDevelopment.id), value); // prettier-ignore

beforeEach(() => {
  cy.removeLocalStorage(environmentVariablesStorageKey.global);
  cy.removeLocalStorage(environmentVariablesStorageKey.scoped(ctx.targetDevelopment.id));
  cy.removeLocalStorage(environmentVariablesStorageKey.scoped(ctx.targetProduction.id));
});

describe('tab editor', () => {
  it('if state empty, is null', () => {
    visitTargetDevelopment();
    openPreflightTab();
    storageTargetDevelopmentGet().should('equal', null);
    storageGlobalGet().should('equal', null);
  });

  it('if state just scoped value, shows that', () => {
    storageTargetDevelopmentSet(data.envarsJson);
    visitTargetDevelopment();
    openPreflightTab();
    cy.contains(data.envarsJson);
    storageGlobalGet().should('equal', null);
  });

  it('if state just global value, copied to scoped, shows that', () => {
    storageTargetDevelopmentGet().should('equal', null);
    storageGlobalSet(data.envarsJson);
    visitTargetDevelopment();
    openPreflightTab();
    cy.contains(data.envarsJson);
    storageTargetDevelopmentGet().should('equal', data.envarsJson);
    storageGlobalGet().should('equal', data.envarsJson);
  });
});
