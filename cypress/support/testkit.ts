export function generateRandomSlug() {
  return Math.random().toString(36).substring(2);
}

export function getUserData() {
  return {
    email: `${crypto.randomUUID()}@local.host`,
    password: 'Loc@l.h0st',
    firstName: 'Local',
    lastName: 'Host',
  };
}

export function waitForTargetPage(targetSlug: string) {
  cy.get(`[data-cy="target-picker-current"]`).contains(targetSlug);
}

export function waitForProjectPage(projectSlug: string) {
  cy.get(`[data-cy="project-picker-current"]`).contains(projectSlug);
}

export function waitForOrganizationPage(organizationSlug: string) {
  cy.get(`[data-cy="organization-picker-current"]`).contains(organizationSlug);
}

export function createUserAndOrganization(organizationSlug: string) {
  const user = getUserData();

  cy.visit('/');
  cy.signup(user);
  cy.get('input[name="slug"]').type(organizationSlug);
  cy.get('button[type="submit"]').click();
}

export function createProject(projectSlug: string) {
  cy.get('[data-cy="new-project-button"]').click();
  cy.get('form[data-cy="create-project-form"] [data-cy="slug"]').type(projectSlug);
  cy.get('form[data-cy="create-project-form"] [data-cy="submit"]').click();
}

export const laboratory = {
  /**
   * Updates the value of the graphiql editor
   */
  updateEditorValue(value: string) {
    cy.get('.graphiql-query-editor .cm-s-graphiql').then($editor => {
      const editor = ($editor[0] as any).CodeMirror; // Access the CodeMirror instance
      editor.setValue(value);
    });
  },
  /**
   * Returns the value of the graphiql editor as Chainable<string>
   */
  getEditorValue() {
    return cy.get('.graphiql-query-editor .cm-s-graphiql').then<string>($editor => {
      const editor = ($editor[0] as any).CodeMirror; // Access the CodeMirror instance
      return editor.getValue();
    });
  },
  openNewTab() {
    cy.get('button[aria-label="New tab"]').click();
    // tab's title should be "untitled" as it's a default name
    cy.contains('button[aria-controls="graphiql-session"]', 'untitled').should('exist');
  },
  /**
   * Asserts that the tab with the given name is active
   */
  assertActiveTab(name: string) {
    cy.contains('li.graphiql-tab-active > button[aria-controls="graphiql-session"]', name).should(
      'exist',
    );
  },
};

export function dedent(strings: TemplateStringsArray, ...values: unknown[]): string {
  // Took from https://github.com/dmnd/dedent
  // Couldn't use the package because I had some issues with moduleResolution.
  const raw = strings.raw;

  // first, perform interpolation
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    let next = raw[i];

    // handle escaped newlines, backticks, and interpolation characters
    next = next
      .replace(/\\\n[ \t]*/g, '')
      .replace(/\\`/g, '`')
      .replace(/\\\$/g, '$')
      .replace(/\\\{/g, '{');

    result += next;

    if (i < values.length) {
      result += values[i];
    }
  }

  // now strip indentation
  const lines = result.split('\n');
  let mindent: null | number = null;
  for (const l of lines) {
    const m = l.match(/^(\s+)\S+/);
    if (m) {
      const indent = m[1].length;
      if (!mindent) {
        // this is the first indented line
        mindent = indent;
      } else {
        mindent = Math.min(mindent, indent);
      }
    }
  }

  if (mindent !== null) {
    const m = mindent; // appease TypeScript
    result = lines.map(l => (l[0] === ' ' || l[0] === '\t' ? l.slice(m) : l)).join('\n');
  }

  // dedent eats leading and trailing whitespace too
  result = result.trim();
  // handle escaped newlines at the end to ensure they don't get stripped too
  result = result.replace(/\\n/g, '\n');

  return result;
}
