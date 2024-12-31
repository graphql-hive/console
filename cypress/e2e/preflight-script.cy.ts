import { dedent } from '../support/testkit';

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

describe('Preflight Script', () => {
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
    cy.dataCy('console-output').should('contain', 'Log: Hello_world (Line: 1, Column: 1)');

    setEditorScript(
      `console.info(1)
console.warn(true)
console.error('Fatal')
throw new TypeError('Test')`,
    );

    cy.dataCy('run-preflight-script').click();
    // First log previous log message
    cy.dataCy('console-output').should('contain', 'Log: Hello_world (Line: 1, Column: 1)');
    // After the new logs
    cy.dataCy('console-output').should(
      'contain',
      [
        'Info: 1 (Line: 1, Column: 1)',
        'Warn: true (Line: 2, Column: 1)',
        'Error: Fatal (Line: 3, Column: 1)',
        'TypeError: Test (Line: 4, Column: 7)',
      ].join(''),
    );
  });

  it('prompt and pass the awaited response', () => {
    setEditorScript(script);

    cy.dataCy<HTMLIFrameElement>('preflight-embed-iframe').then($iframe => {
      const iframeWindow = $iframe[0].contentWindow;
      // Stub `prompt` inside the iframe
      cy.stub(iframeWindow, 'prompt').returns('test-username');
    });

    cy.dataCy('run-preflight-script').click();
    cy.dataCy('console-output').should('contain', 'Log: Hello_world (Line: 1, Column: 1)');

    setEditorScript(
      dedent`
        const username = await lab.prompt('Enter your username');
        console.info(username);
      `,
    );

    cy.dataCy('run-preflight-script').click();

    // First log previous log message
    cy.dataCy('console-output').should('contain', 'Log: Hello_world (Line: 1, Column: 1)');
    // After the new logs
    cy.dataCy('console-output').should(
      'contain',
      dedent`
        Info: test-username (Line: 2, Column: 1)
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
    cy.dataCy('console-output').should('contain', 'Info: Using crypto-js version:');
    cy.dataCy('console-output').should(
      'contain',
      'Log: d5b51e79e4be0c4f4d6b9a14e16ca864de96afe68459e60a794e80393a4809e8',
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
    cy.intercept('/api/lab/foo/my-new-project/development', req => {
      expect(req.headers.__test).to.equal('injected bar {{nonExist}}');
    });
    cy.get('body').type('{ctrl}{enter}');
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
    setMonacoEditorContents('preflight-script-editor', `lab.environment.set('foo', 92)`);
    cy.dataCy('preflight-script-modal-submit').click();
    cy.intercept('/api/lab/foo/my-new-project/development', req => {
      expect(req.headers.__test).to.equal('92');
    });
    cy.get('.graphiql-execute-button').click();
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
    cy.intercept('/api/lab/foo/my-new-project/development', req => {
      expect(req.headers.__test).to.equal('10');
    });
    cy.get('.graphiql-execute-button').click();
  });
});
