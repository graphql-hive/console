import { Token } from '../../cypress.config';

beforeEach(() => {
  cy.clearLocalStorage();
  cy.task('deleteUser');
  cy.task<Token>('createUser').then(result => {
    cy.task('createOrganization', result.sAccessToken);
    cy.task('createProject', result.sAccessToken);
    cy.setCookie('sRefreshToken', result.sRefreshToken);
  });
  cy.visit('/foo/my-new-project/development/laboratory');
  cy.get('[aria-label*="Preflight Script"]').click();
});

describe('Preflight Script', () => {
  it('mini script editor should be read only', () => {
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

  const writeScript = (script: string) => {
    cy.dataCy('preflight-script-editor').within(() => {
      cy.get('textarea').type(script, { delay: 0, force: true });
    });
  };

  beforeEach(() => {
    cy.dataCy('preflight-script-modal-button').click();
    cy.dataCy('env-editor').within(() => {
      cy.get('textarea').type(env, {
        parseSpecialCharSequences: false,
        force: true,
      });
    });
  });

  it('should save script and env variables when submitting', () => {
    writeScript(script);
    cy.dataCy('preflight-script-modal-submit').click();
    cy.dataCy('env-editor-mini').should('have.text', env);
    cy.dataCy('toggle-preflight-script').click();
    cy.dataCy('preflight-script-editor-mini').should('have.text', script);
    cy.reload();
    cy.get('[aria-label*="Preflight Script"]').click();
    cy.dataCy('env-editor-mini').should('have.text', env);
    cy.dataCy('preflight-script-editor-mini').should('have.text', script);
  });

  it('should run script and show console/error output', () => {
    writeScript(script);
    cy.dataCy('run-preflight-script').click();
    cy.dataCy('console-output').should('contain', 'Log: Hello_world (Line: 1, Column: 1)');

    cy.dataCy('preflight-script-editor').within(() => {
      cy.get('textarea').type('{CMD}{A}{Backspace}', { force: true });
      cy.get('textarea').type(
        `console.info(1)
console.warn(true)
console.error('Fatal')
throw new TypeError('Test')`,
        { force: true },
      );
    });
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

  it('should run script and update env variables', () => {
    cy.intercept('test.com', { body: '"Fixture"' });
    cy.dataCy('preflight-script-editor').within(() => {
      cy.get('textarea').type(
        `const response = await fetch('test.com')
const data = await response.json()
console.log(response)
console.info(data)
lab.environment.set('my-test', data)`,
        { force: true },
      );
    });

    cy.dataCy('run-preflight-script').click();
    cy.dataCy('console-output').should(
      'contain',
      ['Log: [object Response]', ' (Line: 3, Column: 1)', 'Info: Fixture'].join(''),
    );
    cy.dataCy('env-editor').should(
      'include.text',
      // replace space with &nbsp;
      '{  "foo": 123,  "my-test": "Fixture"}'.replaceAll(' ', '\xa0'),
    );
  });

  it('`crypto-js` should works, since we removed `...Buffer` and `...Array` global variables', () => {
    cy.dataCy('preflight-script-editor').within(() => {
      cy.get('textarea').type('console.log(lab.CryptoJS.SHA256("🐝"))', { delay: 0, force: true });
    });
    cy.dataCy('run-preflight-script').click();
    cy.dataCy('console-output').should('contain', 'Info: Using crypto-js version:');
    cy.dataCy('console-output').should(
      'contain',
      'Log: d5b51e79e4be0c4f4d6b9a14e16ca864de96afe68459e60a794e80393a4809e8',
    );
  });

  it('should disallow eval', () => {
    cy.dataCy('preflight-script-editor').within(() => {
      cy.get('textarea').type('eval()', { delay: 0, force: true });
    });
    cy.dataCy('preflight-script-modal-submit').click();
    cy.get('body').contains('Usage of dangerous statement like eval() or Function("").');
  });

  it('should disallow invalid code', () => {
    cy.dataCy('preflight-script-editor').within(() => {
      cy.get('textarea').type('🐝', { delay: 0, force: true });
    });
    cy.dataCy('preflight-script-modal-submit').click();
    cy.get('body').contains("[1:1]: Illegal character '}");
  });
});

describe('Execution', () => {
  it('should replace with env editor values', () => {
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

  it('should execute script, update env editor and replace headers', () => {
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
    cy.dataCy('preflight-script-editor').within(() => {
      cy.get('textarea').type(`lab.environment.set('foo', 92)`, { force: true });
    });
    cy.dataCy('preflight-script-modal-submit').click();
    cy.intercept('/api/lab/foo/my-new-project/development', req => {
      expect(req.headers.__test).to.equal('92');
    });
    cy.get('.graphiql-execute-button').click();
  });

  it('should not execute script if disabled', () => {
    cy.get('[data-name="headers"]').click();
    cy.get('.graphiql-editor-tool .graphiql-editor:last-child textarea').type(
      '{ "__test": "{{foo}}" }',
      {
        force: true,
        parseSpecialCharSequences: false,
      },
    );
    cy.dataCy('preflight-script-modal-button').click();
    cy.dataCy('preflight-script-editor').within(() => {
      cy.get('textarea').type(`lab.environment.set('foo', 92)`, { force: true });
    });
    cy.dataCy('env-editor').within(() => {
      cy.get('textarea').type(`{"foo":10}`, { force: true, parseSpecialCharSequences: false });
    });
    cy.dataCy('preflight-script-modal-submit').click();
    cy.intercept('/api/lab/foo/my-new-project/development', req => {
      expect(req.headers.__test).to.equal('10');
    });
    cy.get('.graphiql-execute-button').click();
  });
});

// todo: test error while setting non primitive in env
