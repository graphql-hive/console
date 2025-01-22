import { dedent } from '../support/testkit';

const selectors = {
  buttonModal: 'preflight-script-modal-button',
  buttonToggle: 'toggle-preflight-script',
  graphiql: {
    buttonExecute: '.graphiql-execute-button',
  },
  modal: {
    buttonSubmit: 'preflight-script-modal-submit',
  },
};

beforeEach(() => {
  cy.clearLocalStorage().then(async () => {
    cy.task('seedTarget').then(({ slug, refreshToken }: any) => {
      cy.setCookie('sRefreshToken', refreshToken);

      cy.visit(`/${slug}/laboratory`);
      cy.get('[aria-label*="Preflight Script"]').click();
    });
  });
});

/** Helper function for setting the text within a monaco editor as typing manually results in flaky tests */
function setMonacoEditorContents(editorCyName: string, text: string) {
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

function setEditorScript(script: string) {
  setMonacoEditorContents('preflight-script-editor', script);
}

describe('Laboratory > Preflight Script', () => {
  it('mini script editor is read only', () => {
    cy.dataCy('toggle-preflight-script').click();
    // Wait loading disappears
    cy.dataCy('preflight-script-editor-mini').should('not.contain', 'Loading');
    // Click
    cy.dataCy('preflight-script-editor-mini').click();
    // And type
    cy.dataCy('preflight-script-editor-mini').within(() => {
      cy.get('textarea').type('🐝', { force: true });
    });
    cy.dataCy('preflight-script-editor-mini').should(
      'have.text',
      'Cannot edit in read-only editor',
    );
  });
});

describe('Preflight Script Modal', () => {
  const script = 'console.log("Hello_world")';
  const env = '{"foo":123}';

  beforeEach(() => {
    cy.dataCy('preflight-script-modal-button').click();
    setMonacoEditorContents('env-editor', env);
  });

  it('save script and environment variables when submitting', () => {
    setEditorScript(script);
    cy.dataCy('preflight-script-modal-submit').click();
    cy.dataCy('env-editor-mini').should('have.text', env);
    cy.dataCy('toggle-preflight-script').click();
    cy.dataCy('preflight-script-editor-mini').should('have.text', script);
    cy.reload();
    cy.get('[aria-label*="Preflight Script"]').click();
    cy.dataCy('env-editor-mini').should('have.text', env);
    cy.dataCy('preflight-script-editor-mini').should('have.text', script);
  });

  it('logs show console/error information', () => {
    setEditorScript(script);
    cy.dataCy('run-preflight-script').click();
    cy.dataCy('console-output').should('contain', 'log: Hello_world (1:1)');

    setEditorScript(
      `console.info(1)
console.warn(true)
console.error('Fatal')
throw new TypeError('Test')`,
    );

    cy.dataCy('run-preflight-script').click();
    // First log previous log message
    cy.dataCy('console-output').should('contain', 'log: Hello_world (1:1)');
    // After the new logs
    cy.dataCy('console-output').should(
      'contain',
      ['info: 1 (1:1)', 'warn: true (2:1)', 'error: Fatal (3:1)', 'error: Test (4:7)'].join(''),
    );
  });

  it('prompt and pass the awaited response', () => {
    setEditorScript(script);

    cy.dataCy('run-preflight-script').click();
    cy.dataCy('console-output').should('contain', 'log: Hello_world (1:1)');

    setEditorScript(
      dedent`
        const username = await lab.prompt('Enter your username');
        console.info(username);
      `,
    );

    cy.dataCy('run-preflight-script').click();
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
    setEditorScript(script);

    cy.dataCy('run-preflight-script').click();
    cy.dataCy('console-output').should('contain', 'log: Hello_world (1:1)');

    setEditorScript(
      dedent`
        const username = await lab.prompt('Enter your username');
        console.info(username);
      `,
    );

    cy.dataCy('run-preflight-script').click();
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
    setEditorScript(`lab.environment.set('my-test', "TROLOLOL")`);

    cy.dataCy('run-preflight-script').click();
    cy.dataCy('env-editor').should(
      'include.text',
      // replace space with &nbsp;
      '{  "foo": 123,  "my-test": "TROLOLOL"}'.replaceAll(' ', '\xa0'),
    );
  });

  it('`crypto-js` can be used for generating hashes', () => {
    setEditorScript('console.log(lab.CryptoJS.SHA256("🐝"))');
    cy.dataCy('run-preflight-script').click();
    cy.dataCy('console-output').should('contain', 'info: Using crypto-js version:');
    cy.dataCy('console-output').should(
      'contain',
      'log: d5b51e79e4be0c4f4d6b9a14e16ca864de96afe68459e60a794e80393a4809e8',
    );
  });

  it('scripts can not use `eval`', () => {
    setEditorScript('eval()');
    cy.dataCy('preflight-script-modal-submit').click();
    cy.get('body').contains('Usage of dangerous statement like eval() or Function("").');
  });

  it('invalid code is rejected and can not be saved', () => {
    setEditorScript('🐝');
    cy.dataCy('preflight-script-modal-submit').click();
    cy.get('body').contains("[1:1]: Illegal character '}");
  });
});

describe('Execution', () => {
  it('result.request.headers are added to the graphiql request base headers', () => {
    const headers = {
      foo: { name: 'foo', value: 'bar' },
    };
    cy.dataCy(selectors.buttonToggle).click();
    cy.dataCy(selectors.buttonModal).click();
    setEditorScript(`lab.request.headers.append('${headers.foo.name}', '${headers.foo.value}')`);
    cy.dataCy(selectors.modal.buttonSubmit).click();
    cy.intercept({
      method: 'POST',
      headers: {
        [headers.foo.name]: headers.foo.value,
      },
    }).as('post');
    cy.get(selectors.graphiql.buttonExecute).click();
    cy.wait('@post');
  });

  it('result.request.headers take precedence over graphiql request base headers', () => {
    // --- Pre Assert Integrity Check: make sure the header we think we're overriding is actually there.
    const baseHeaders = {
      accept: {
        name: 'accept',
        value: 'application/json, multipart/mixed',
      },
    };
    cy.intercept({
      method: 'POST',
      headers: {
        [baseHeaders.accept.name]: baseHeaders.accept.value,
      },
    }).as('integrityCheck');
    cy.get(selectors.graphiql.buttonExecute).click();
    cy.wait('@integrityCheck');
    // ---

    const preflightHeaders = {
      accept: {
        name: 'accept',
        value: 'application/graphql-response+json; charset=utf-8, application/json; charset=utf-8',
      },
    };
    cy.dataCy(selectors.buttonToggle).click();
    cy.dataCy(selectors.buttonModal).click();
    setEditorScript(
      `lab.request.headers.append('${preflightHeaders.accept.name}', '${preflightHeaders.accept.value}')`,
    );
    cy.dataCy(selectors.modal.buttonSubmit).click();
    cy.intercept({
      method: 'POST',
      headers: {
        [preflightHeaders.accept.name]: preflightHeaders.accept.value,
      },
    }).as('post');
    cy.get(selectors.graphiql.buttonExecute).click();
    cy.wait('@post');
  });

  it('result.request.headers do not receive placeholder substitution');

  it('header placeholders are substituted with environment variables', () => {
    cy.dataCy('toggle-preflight-script').click();
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
    cy.dataCy('toggle-preflight-script').click();
    cy.get('[data-name="headers"]').click();
    cy.get('.graphiql-editor-tool .graphiql-editor:last-child textarea').type(
      '{ "__test": "{{foo}}" }',
      {
        force: true,
        parseSpecialCharSequences: false,
      },
    );
    cy.dataCy('preflight-script-modal-button').click();
    setMonacoEditorContents('preflight-script-editor', `lab.environment.set('foo', '92')`);
    cy.dataCy('preflight-script-modal-submit').click();

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
    cy.dataCy('toggle-preflight-script').click();

    cy.get('[data-name="headers"]').click();
    cy.get('[data-name="headers"]').click();
    cy.get('.graphiql-editor-tool .graphiql-editor:last-child textarea').type(
      '{ "__test": "{{username}}" }',
      {
        force: true,
        parseSpecialCharSequences: false,
      },
    );

    cy.dataCy('preflight-script-modal-button').click();
    setMonacoEditorContents(
      'preflight-script-editor',
      dedent`
      const username = await lab.prompt('Enter your username');
      lab.environment.set('username', username);
    `,
    );
    cy.dataCy('preflight-script-modal-submit').click();

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
    cy.dataCy('preflight-script-modal-button').click();
    setMonacoEditorContents('preflight-script-editor', `lab.environment.set('foo', 92)`);
    setMonacoEditorContents('env-editor', `{"foo":10}`);

    cy.dataCy('preflight-script-modal-submit').click();

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
    cy.dataCy('toggle-preflight-script').click();

    cy.dataCy('preflight-script-modal-button').click();
    setMonacoEditorContents(
      'preflight-script-editor',
      dedent`
        console.info(1)
        console.warn(true)
        console.error('Fatal')
        throw new TypeError('Test')
        `,
    );
    cy.dataCy('preflight-script-modal-submit').click();

    cy.intercept({
      method: 'POST',
    }).as('post');

    // shows no logs before executing
    cy.get('#preflight-script-logs button[data-cy="trigger"]').click({
      // it's because the button is not fully visible on the screen
      force: true,
    });
    cy.get('#preflight-script-logs [data-cy="logs"]').should(
      'contain',
      ['No logs available', 'Execute a query to see logs'].join(''),
    );

    cy.get('.graphiql-execute-button').click();
    cy.wait('@post');

    cy.get('#preflight-script-logs [data-cy="logs"]').should(
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
    cy.dataCy('toggle-preflight-script').click();

    cy.dataCy('preflight-script-modal-button').click();
    setMonacoEditorContents(
      'preflight-script-editor',
      dedent`
        console.info(1)
        console.warn(true)
        console.error('Fatal')
        throw new TypeError('Test')
        `,
    );
    cy.dataCy('preflight-script-modal-submit').click();

    cy.intercept({
      method: 'POST',
    }).as('post');
    cy.get('.graphiql-execute-button').click();
    cy.wait('@post');

    // open logs
    cy.get('#preflight-script-logs button[data-cy="trigger"]').click({
      // it's because the button is not fully visible on the screen
      force: true,
    });

    cy.get('#preflight-script-logs [data-cy="logs"]').should(
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

    cy.get('#preflight-script-logs button[data-cy="erase-logs"]').click();
    cy.get('#preflight-script-logs [data-cy="logs"]').should(
      'contain',
      ['No logs available', 'Execute a query to see logs'].join(''),
    );
  });
});
