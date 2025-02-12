import { dedent } from '../../support/dedent';
import { cyLaboratory } from './__cypress__';

const s = cyLaboratory.preflight.selectors;

const cyp = cyLaboratory.preflight;

const data: { slug: string } = {
  slug: '',
};

beforeEach(() => {
  cy.clearLocalStorage().then(async () => {
    cy.task('seedTarget').then(({ slug, refreshToken }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);
      data.slug = slug;
      cy.visit(`/${slug}/laboratory`);
      cy.get(s.buttonGraphiQLPreflight).click();
    });
  });
});

describe('Preflight Tab', () => {
  // https://github.com/graphql-hive/console/pull/6450
  it('regression: loads even if local storage is set to {}', () => {
    window.localStorage.setItem('hive:laboratory:environment', '{}');
    cy.visit(`/${data.slug}/laboratory`);
    cy.get(s.buttonGraphiQLPreflight).click();
  });
  it('mini script editor is read only', () => {
    cy.dataCy('toggle-preflight').click();
    // Wait loading disappears
    cy.dataCy('preflight-editor-mini').should('not.contain', 'Loading');
    // Click
    cy.dataCy('preflight-editor-mini').click();
    // And type
    cy.dataCy('preflight-editor-mini').within(() => {
      cy.get('textarea').type('🐝', { force: true });
    });
    cy.dataCy('preflight-editor-mini').should('have.text', 'Cannot edit in read-only editor');
  });
});

describe('Preflight Modal', () => {
  const script = 'console.log("Hello_world")';
  const env = '{"foo":123}';

  beforeEach(() => {
    cy.dataCy('preflight-modal-button').click();
    cyp.setEnvironmentEditorContent(env);
  });

  it('code is validated with TypeScript', () => {
    const tsErrorMessage = "Type 'string' is not assignable to type 'number'.";
    const script = 'let a = 1; a = ""';
    cyp.setEditorContent(script);
    // Hack: Seemingly only way to reliably interact with the monaco text area from Cypress.
    cy.wait(1000);
    cy.dataCy(s.modal.editorCy).find('textarea').focus().realPress(['Alt', 'F8']);
    cy.contains(tsErrorMessage);
  });

  it('save script and environment variables when submitting', () => {
    cyp.setEditorContent(script);
    cy.dataCy('preflight-modal-submit').click();
    cy.dataCy('env-editor-mini').should('have.text', env);
    cy.dataCy('toggle-preflight').click();
    cy.dataCy('preflight-editor-mini').should('have.text', script);
    cy.reload();
    cy.get('[aria-label*="Preflight Script"]').click();
    cy.dataCy('env-editor-mini').should('have.text', env);
    cy.dataCy('preflight-editor-mini').should('have.text', script);
  });

  it('logs show console/error information', () => {
    cyp.setEditorContent(script);
    cy.dataCy('run-preflight').click();
    cy.dataCy('console-output').should('contain', 'log: Hello_world (1:1)');

    cyp.setEditorContent(
      `console.info(1)
console.warn(true)
console.error('Fatal')
throw new TypeError('Test')`,
    );

    cy.dataCy('run-preflight').click();
    // First log previous log message
    cy.dataCy('console-output').should('contain', 'log: Hello_world (1:1)');
    // After the new logs
    cy.dataCy('console-output').should(
      'contain',
      ['info: 1 (1:1)', 'warn: true (2:1)', 'error: Fatal (3:1)', 'error: Test (4:7)'].join(''),
    );
  });

  it('prompt and pass the awaited response', () => {
    cyp.setEditorContent(script);

    cy.dataCy('run-preflight').click();
    cy.dataCy('console-output').should('contain', 'log: Hello_world (1:1)');

    cyp.setEditorContent(
      dedent`
        const username = await lab.prompt('Enter your username');
        console.info(username);
      `,
    );

    cy.dataCy('run-preflight').click();
    cy.dataCy('prompt').get('input').type('test-username');
    cy.dataCy('prompt').get('form').submit();

    // First log previous log message
    cy.dataCy('console-output').should('contain', 'log: Hello_world (1:1)');
    // After the new logs
    cy.dataCy('console-output').should(
      'contain',
      dedent`
        info: test-username (2:1)
      `,
    );
  });

  it('prompt and cancel', () => {
    cyp.setEditorContent(script);

    cy.dataCy('run-preflight').click();
    cy.dataCy('console-output').should('contain', 'log: Hello_world (1:1)');

    cyp.setEditorContent(
      dedent`
        const username = await lab.prompt('Enter your username');
        console.info(username);
      `,
    );

    cy.dataCy('run-preflight').click();
    cy.dataCy('prompt').get('input').type('test-username');
    cy.dataCy('prompt').get('[data-cy="prompt-cancel"]').click();

    // First log previous log message
    cy.dataCy('console-output').should('contain', 'log: Hello_world (1:1)');
    // After the new logs
    cy.dataCy('console-output').should(
      'contain',
      dedent`
        info: null (2:1)
      `,
    );
  });

  it('script execution updates environment variables', () => {
    cyp.setEditorContent(`lab.environment.set('my-test', "TROLOLOL")`);

    cy.dataCy('run-preflight').click();
    cy.dataCy('env-editor').should(
      'include.text',
      // replace space with &nbsp;
      '{  "foo": 123,  "my-test": "TROLOLOL"}'.replaceAll(' ', '\xa0'),
    );
  });

  it('`crypto-js` can be used for generating hashes', () => {
    cyp.setEditorContent('console.log(lab.CryptoJS.SHA256("🐝"))');
    cy.dataCy('run-preflight').click();
    cy.dataCy('console-output').should('contain', 'info: Using crypto-js version:');
    cy.dataCy('console-output').should(
      'contain',
      'log: d5b51e79e4be0c4f4d6b9a14e16ca864de96afe68459e60a794e80393a4809e8',
    );
  });

  it('scripts can not use `eval`', () => {
    cyp.setEditorContent('eval()');
    cy.dataCy('preflight-modal-submit').click();
    cy.get('body').contains('Usage of dangerous statement like eval() or Function("").');
  });

  it('invalid code is rejected and can not be saved', () => {
    cyp.setEditorContent('🐝');
    cy.dataCy('preflight-modal-submit').click();
    cy.get('body').contains("[1:1]: Illegal character '}");
  });
});

describe('Execution', () => {
  it('result.request.headers are added to the graphiql request base headers', () => {
    // Setup Preflight Script
    const preflightHeaders = {
      foo: 'bar',
    };
    cy.dataCy(s.buttonToggleCy).click();
    cy.dataCy(s.buttonModalCy).click();
    cyp.setEditorContent(`lab.request.headers.append('foo', '${preflightHeaders.foo}')`);
    cy.dataCy(s.modal.buttonSubmitCy).click();
    // Run GraphiQL
    cy.intercept({ headers: preflightHeaders }).as('request');
    cy.get(s.graphiql.buttonExecute).click();
    cy.wait('@request');
  });

  it('result.request.headers take precedence over graphiql request base headers', () => {
    // Integrity Check: Ensure the header we think we're overriding is actually there to override.
    // We achieve this by asserting a sent GraphiQL request includes the certain header and assume
    // if its there once its there every time.
    const baseHeaders = {
      accept: 'application/json, multipart/mixed',
    };
    cy.intercept({ headers: baseHeaders }).as('integrityCheck');
    cy.get(s.graphiql.buttonExecute).click();
    cy.wait('@integrityCheck');
    // Setup Preflight Script
    const preflightHeaders = {
      accept: 'application/graphql-response+json; charset=utf-8, application/json; charset=utf-8',
    };
    cy.dataCy(s.buttonToggleCy).click();
    cy.dataCy(s.buttonModalCy).click();
    cyp.setEditorContent(`lab.request.headers.append('accept', '${preflightHeaders.accept}')`);
    cy.dataCy(s.modal.buttonSubmitCy).click();
    // Run GraphiQL
    cy.intercept({ headers: preflightHeaders }).as('request');
    cy.get(s.graphiql.buttonExecute).click();
    cy.wait('@request');
  });

  it('result.request.headers are NOT substituted with environment variables', () => {
    const barEnVarInterpolation = '{{bar}}';
    // Setup Static Headers
    const staticHeaders = {
      foo_static: barEnVarInterpolation,
    };
    cy.get(s.buttonHeaders).click();
    cy.get(s.headersEditor.textArea).type(JSON.stringify(staticHeaders), {
      force: true,
      parseSpecialCharSequences: false,
    });
    // Setup Preflight Script
    const environmentVariables = {
      bar: 'BAR_VALUE',
    };
    const preflightHeaders = {
      foo_preflight: barEnVarInterpolation,
    };
    cy.dataCy(s.buttonToggleCy).click();
    cy.dataCy(s.buttonModalCy).click();
    cyp.setEditorContent(`
      lab.environment.set('bar', '${environmentVariables.bar}')
      lab.request.headers.append('foo_preflight', '${preflightHeaders.foo_preflight}')
    `);
    cy.dataCy(s.modal.buttonSubmitCy).click();
    // Run GraphiQL
    cy.intercept({
      headers: {
        ...preflightHeaders,
        foo_static: environmentVariables.bar,
      },
    }).as('request');
    cy.get(s.graphiql.buttonExecute).click();
    cy.wait('@request');
  });

  it('header placeholders are substituted with environment variables', () => {
    cy.dataCy('toggle-preflight').click();
    cy.get('[data-name="headers"]').click();
    cy.get('.graphiql-editor-tool .graphiql-editor:last-child textarea').type(
      '{ "__test": "{{foo}} bar {{nonExist}}" }',
      {
        force: true,
        parseSpecialCharSequences: false,
      },
    );
    cy.dataCy('env-editor-mini').within(() => {
      cy.get('textarea').type('{"foo":"injected"}', {
        force: true,
        parseSpecialCharSequences: false,
      });
    });

    cy.intercept({
      method: 'POST',
      headers: {
        __test: 'injected bar {{nonExist}}',
      },
    }).as('post');
    cy.get('.graphiql-execute-button').click();
    cy.wait('@post');
  });

  it('executed script updates update env editor and substitute headers', () => {
    cy.dataCy('toggle-preflight').click();
    cy.get('[data-name="headers"]').click();
    cy.get('.graphiql-editor-tool .graphiql-editor:last-child textarea').type(
      '{ "__test": "{{foo}}" }',
      {
        force: true,
        parseSpecialCharSequences: false,
      },
    );
    cy.dataCy('preflight-modal-button').click();
    cyp.setEditorContent(`lab.environment.set('foo', '92')`);
    cy.dataCy('preflight-modal-submit').click();

    cy.intercept({
      method: 'POST',
      headers: {
        __test: '92',
      },
    }).as('post');
    cy.get('.graphiql-execute-button').click();
    cy.wait('@post');
  });

  it('execute, prompt and use it in headers', () => {
    cy.dataCy('toggle-preflight').click();

    cy.get('[data-name="headers"]').click();
    cy.get('[data-name="headers"]').click();
    cy.get('.graphiql-editor-tool .graphiql-editor:last-child textarea').type(
      '{ "__test": "{{username}}" }',
      {
        force: true,
        parseSpecialCharSequences: false,
      },
    );

    cy.dataCy('preflight-modal-button').click();
    cyp.setEditorContent(
      dedent`
      const username = await lab.prompt('Enter your username');
      lab.environment.set('username', username);
    `,
    );
    cy.dataCy('preflight-modal-submit').click();

    cy.intercept({
      method: 'POST',
      headers: {
        __test: 'foo',
      },
    }).as('post');
    cy.get('.graphiql-execute-button').click();

    cy.dataCy('prompt').get('input').type('foo');
    cy.dataCy('prompt').get('form').submit();

    cy.wait('@post');
  });

  it('disabled script is not executed', () => {
    cy.get('[data-name="headers"]').click();
    cy.get('.graphiql-editor-tool .graphiql-editor:last-child textarea').type(
      '{ "__test": "{{foo}}" }',
      {
        force: true,
        parseSpecialCharSequences: false,
      },
    );
    cy.dataCy('preflight-modal-button').click();
    cyp.setEditorContent(`lab.environment.set('foo', 92)`);
    cyp.setEnvironmentEditorContent(`{"foo":10}`);

    cy.dataCy('preflight-modal-submit').click();

    cy.intercept({
      method: 'POST',
      headers: {
        __test: '10',
      },
    }).as('post');
    cy.get('.graphiql-execute-button').click();
    cy.wait('@post');
  });

  it('logs are visible when opened', () => {
    cy.dataCy('toggle-preflight').click();

    cy.dataCy('preflight-modal-button').click();
    cyp.setEditorContent(
      dedent`
        console.info(1)
        console.warn(true)
        console.error('Fatal')
        throw new TypeError('Test')
        `,
    );
    cy.dataCy('preflight-modal-submit').click();

    cy.intercept({
      method: 'POST',
    }).as('post');

    // shows no logs before executing
    cy.get('#preflight-logs button[data-cy="trigger"]').click({
      // it's because the button is not fully visible on the screen
      force: true,
    });
    cy.get('#preflight-logs [data-cy="logs"]').should(
      'contain',
      ['No logs available', 'Execute a query to see logs'].join(''),
    );

    cy.get('.graphiql-execute-button').click();
    cy.wait('@post');

    cy.get('#preflight-logs [data-cy="logs"]').should(
      'contain',
      [
        'log: Running script...',
        'info: 1 (1:1)',
        'warn: true (2:1)',
        'error: Fatal (3:1)',
        'error: Test (4:7)',
        'log: Script failed',
      ].join(''),
    );
  });

  it('logs are cleared when requested', () => {
    cy.dataCy('toggle-preflight').click();

    cy.dataCy('preflight-modal-button').click();
    cyp.setEditorContent(
      dedent`
        console.info(1)
        console.warn(true)
        console.error('Fatal')
        throw new TypeError('Test')
        `,
    );
    cy.dataCy('preflight-modal-submit').click();

    cy.intercept({
      method: 'POST',
    }).as('post');
    cy.get('.graphiql-execute-button').click();
    cy.wait('@post');

    // open logs
    cy.get('#preflight-logs button[data-cy="trigger"]').click({
      // it's because the button is not fully visible on the screen
      force: true,
    });

    cy.get('#preflight-logs [data-cy="logs"]').should(
      'contain',
      [
        'log: Running script...',
        'info: 1 (1:1)',
        'warn: true (2:1)',
        'error: Fatal (3:1)',
        'error: Test (4:7)',
        'log: Script failed',
      ].join(''),
    );

    cy.get('#preflight-logs button[data-cy="erase-logs"]').click();
    cy.get('#preflight-logs [data-cy="logs"]').should(
      'contain',
      ['No logs available', 'Execute a query to see logs'].join(''),
    );
  });
});
