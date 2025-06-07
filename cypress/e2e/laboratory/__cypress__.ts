import { cyMonaco } from '../../support/monaco';

export namespace cyLaboratory {
  /**
   * Updates the value of the graphiql editor
   */
  export function updateEditorValue(value: string) {
    cy.get('.graphiql-query-editor .cm-s-graphiql').then($editor => {
      const editor = ($editor[0] as any).CodeMirror; // Access the CodeMirror instance
      editor.setValue(value);
    });
  }

  /**
   * Returns the value of the graphiql editor as Chainable<string>
   */
  export function getEditorValue() {
    return cy.get('.graphiql-query-editor .cm-s-graphiql').then<string>($editor => {
      const editor = ($editor[0] as any).CodeMirror; // Access the CodeMirror instance
      return editor.getValue();
    });
  }

  /**
   * Opens a new tab
   */
  export function openNewTab() {
    cy.get('button[aria-label="New tab"]').click();
    // tab's title should be "untitled" as it's a default name
    cy.contains('button[aria-controls="graphiql-session"]', 'untitled').should('exist');
  }

  /**
   * Asserts that the tab with the given name is active
   */
  export function assertActiveTab(name: string) {
    cy.contains('li.graphiql-tab-active > button[aria-controls="graphiql-session"]', name).should(
      'exist',
    );
  }

  /**
   * Closes the active tab
   */
  export function closeActiveTab() {
    cy.get('li.graphiql-tab-active > button.graphiql-tab-close').click();
  }

  /**
   * Closes all tabs until one is left
   */
  export function closeTabsUntilOneLeft() {
    cy.get('li.graphiql-tab').then($tabs => {
      if ($tabs.length > 1) {
        closeActiveTab();
        // Recurse until there's only one tab left
        return closeTabsUntilOneLeft();
      }
    });
  }

  export namespace preflight {
    export const selectors = {
      buttonGraphiQLPreflight: '[aria-label*="Preflight Script"]',
      buttonModal: '[data-cy="preflight-modal-button"]',
      buttonToggle: '[data-cy="toggle-preflight"]',
      buttonHeaders: '[data-name="headers"]',
      headersEditor: {
        textArea: '.graphiql-editor-tool .graphiql-editor:last-child textarea',
      },
      graphiql: {
        buttonExecute: '.graphiql-execute-button',
      },

      modal: {
        buttonSubmit: '[data-cy="preflight-modal-submit"]',
        scriptEditor: '[data-cy="preflight-editor"]',
        variablesEditor: '[data-cy="env-editor"]',
      },
    };

    export const setScriptEditorContent = (value: string) => {
      cyMonaco.setContent(selectors.modal.scriptEditor, value);
    };

    export const setEnvironmentEditorContent = (value: string) => {
      cyMonaco.setContent(selectors.modal.variablesEditor, value);
    };
  }
}
