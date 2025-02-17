import {
  environmentVariablesStorageKey,
  persistAuthenticationCookies,
  selectors,
  type Target,
} from '../support/testkit';

const data = {
  globalEnvars: { foo: '123' },
  globalEnvarsJson: '{"foo":"123"}',
  scopedEnvars: { bar: '456' },
  targetEnvarsJson: '{"bar":"456"}',
};

interface Ctx {
  targetDevelopment: Target;
  targetProduction: Target;
  cookies: Cypress.Cookie[];
}
const ctx = {
  cookies: [],
} as Ctx;

before(() => {
  cy.task('seedTarget').then(({ refreshToken, targets }: any) => {
    cy.setCookie('sRefreshToken', refreshToken);
    ctx.targetDevelopment = targets.development;
    ctx.targetProduction = targets.production;
  });
});

persistAuthenticationCookies();

const openPreflightTab = () => cy.get(selectors.buttonGraphiQLPreflight).click();
const openPreflightModal = () => cy.dataCy(selectors.buttonModalCy).click();

const storageGlobalGet = () => cy.getLocalStorage(environmentVariablesStorageKey.global);
const storageGlobalSet = (value: string) => cy.setLocalStorage(environmentVariablesStorageKey.global, value); // prettier-ignore
const storageGlobalRemove = () => cy.removeLocalStorage(environmentVariablesStorageKey.global);

const visitTargetDevelopment = () => cy.visit(`${ctx.targetDevelopment.path}/laboratory`);
const storageTargetDevelopmentGet = () => cy.getLocalStorage(environmentVariablesStorageKey.scoped(ctx.targetDevelopment.id)); // prettier-ignore
const storageTargetDevelopmentSet = (value: string) => cy.setLocalStorage(environmentVariablesStorageKey.scoped(ctx.targetDevelopment.id), value); // prettier-ignore
const storageTargetDevelopmentRemove = () => cy.removeLocalStorage(environmentVariablesStorageKey.scoped(ctx.targetDevelopment.id)); // prettier-ignore

const visitTargetProduction = () => cy.visit(`${ctx.targetProduction.path}/laboratory`);
// const storageTargetProductionGet = () => cy.getLocalStorage(environmentVariablesStorageKey.scoped(ctx.targetProduction.id)); // prettier-ignore
// const storageTargetProductionSet = (value: string) => cy.setLocalStorage(environmentVariablesStorageKey.scoped(ctx.targetProduction.id), value); // prettier-ignore
const storageTargetProductionRemove = () => cy.removeLocalStorage(environmentVariablesStorageKey.scoped(ctx.targetProduction.id)); // prettier-ignore

beforeEach(() => {
  storageGlobalRemove();
  storageTargetDevelopmentRemove();
  storageTargetProductionRemove();
});

describe('tab editor', () => {
  it('if state empty, is null', () => {
    visitTargetDevelopment();
    openPreflightTab();
    storageTargetDevelopmentGet().should('equal', null);
    storageGlobalGet().should('equal', null);
  });

  it('if storage just has target-scope value, value used', () => {
    storageTargetDevelopmentSet(data.targetEnvarsJson);
    visitTargetDevelopment();
    openPreflightTab();
    cy.contains(data.targetEnvarsJson);
  });

  it('if storage just has global-scope value, copied to new target-scope value, used', () => {
    storageGlobalSet(data.globalEnvarsJson);
    visitTargetDevelopment();
    openPreflightTab();
    cy.contains(data.globalEnvarsJson);
    storageTargetDevelopmentGet().should('equal', data.globalEnvarsJson);
  });

  it('if storage has global-scope AND target-scope values, target-scope value used', () => {
    storageTargetDevelopmentSet(data.targetEnvarsJson);
    storageGlobalSet(data.globalEnvarsJson);
    visitTargetDevelopment();
    openPreflightTab();
    cy.contains(data.targetEnvarsJson);
  });
});

describe('modal', () => {
  it('changing environment variables persists to target-scope', () => {
    storageGlobalSet(data.globalEnvarsJson);
    visitTargetDevelopment();
    openPreflightTab();
    openPreflightModal();
    cy.contains(data.globalEnvarsJson);
    setMonacoEditorContents('env-editor', data.targetEnvarsJson);
    storageTargetDevelopmentGet().should('equal', data.targetEnvarsJson);
    cy.contains(data.targetEnvarsJson);
    visitTargetProduction();
    openPreflightTab();
    cy.contains(data.globalEnvarsJson);
  });
});

// todo: in another PR this utility is factored out into a shared file
/** Helper function for setting the text within a monaco editor as typing manually results in flaky tests */
export function setMonacoEditorContents(editorCyName: string, text: string) {
  // wait for textarea appearing which indicates monaco is loaded
  cy.dataCy(editorCyName).find('textarea');
  cy.window().then(win => {
    // First, check if monaco is available on the main window
    const editor = (win as any).monaco.editor
      .getEditors()
      .find(e => e.getContainerDomNode().parentElement.getAttribute('data-cy') === editorCyName);

    // If Monaco instance is found
    if (editor) {
      editor.setValue(text);
    } else {
      throw new Error('Monaco editor not found on the window or frames[0]');
    }
  });
}
