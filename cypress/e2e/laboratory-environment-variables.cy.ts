const selectors = {
  editorEnvironmentVariables: '[data-cy="preflight-editor-mini"]',
  buttonGraphiQLPreflight: '[aria-label*="Preflight Script"]',
  buttonModalCy: 'preflight-modal-button',
  buttonToggleCy: 'toggle-preflight',
  buttonHeaders: '[data-name="headers"]',
  headersEditor: {
    textArea: '.graphiql-editor-tool .graphiql-editor:last-child textarea',
  },
  graphiql: {
    buttonExecute: '.graphiql-execute-button',
  },

  modal: {
    buttonSubmitCy: 'preflight-modal-submit',
  },
};

// todo: instead of copying this, import it from core utility lib.
export const environmentVariablesStorageKey = {
  // todo: optional target effectively gives this the possibility of being silently global
  // which feels subtle and thus likely to introduce hard to trace defects. Should we abort instead?
  scoped: (targetId?: string) =>
    `hive/targetId:${targetId ?? '__null__'}/laboratory/environment-variables`,
  global: 'hive:laboratory:environment',
};

const data = {
  envars: { foo: '123' },
  envarsJson: '{"foo":"123"}',
};

const as = <$Type>() => undefined as $Type;

const ctx = {
  // test export interfaces from testKit
  targetDevelopment: as<{ id: string; slug: string; path: string }>(),
  targetProduction: as<{ id: string; slug: string; path: string }>(),
};

before(() => {
  cy.clearLocalStorage().then(async () => {
    cy.task('seedTarget').then(({ refreshToken, targets }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);
      ctx.targetDevelopment = targets.development;
      ctx.targetProduction = targets.production;
    });
  });
});

const visitTargetDevelopment = () => cy.visit(`/${ctx.targetDevelopment.path}/laboratory`);
const visitTargetProduction = () => cy.visit(`/${ctx.targetProduction.path}/laboratory`);
const openPreflightTab = () => cy.get(selectors.buttonGraphiQLPreflight).click();

describe('tab editor', () => {
  it('if state empty, is null', () => {
    visitTargetDevelopment();
    openPreflightTab();
    expect(
      window.localStorage.getItem(
        environmentVariablesStorageKey.scoped(ctx.targetDevelopment.slug),
      ),
    ).equals(null);
    expect(window.localStorage.getItem(environmentVariablesStorageKey.global)).equals(null);
    // cy.dataCy('preflight-editor-mini').should('have.text', '');
  });

  it('if state just global value, shows that', () => {
    window.localStorage.setItem(environmentVariablesStorageKey.global, data.envarsJson);
    visitTargetDevelopment();
    openPreflightTab();
    cy.contains(data.envarsJson);
  });

  it.only('if state just scoped value, shows that', () => {
    window.localStorage.setItem(
      environmentVariablesStorageKey.scoped(ctx.targetDevelopment.id),
      data.envarsJson,
    );
    visitTargetDevelopment();
    openPreflightTab();
    cy.contains(data.envarsJson);
  });
});
