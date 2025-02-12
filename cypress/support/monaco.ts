import type * as Monaco from 'monaco-editor';

export namespace cyMonaco {
  /** Helper function for setting the text within a monaco editor as typing manually results in flaky tests */
  export function setContent(editorCyName: string, text: string) {
    // wait for textarea appearing which indicates monaco is loaded
    cy.dataCy(editorCyName).find('textarea');
    cy.window().then((win: Window & typeof globalThis & { monaco: typeof Monaco }) => {
      // First, check if monaco is available on the main window
      const editor = win.monaco.editor
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

  export function goToNextProblem(editorCyName: string) {
    cy.dataCy(editorCyName).find('textarea').focus().realPress(['Alt', 'F8']);
  }

  export function nextProblemContains(editorCyName: string, problem: string, waitMs = 1000) {
    // Hack: Seemingly only way to reliably interact with the monaco text area from Cypress.
    if (waitMs) cy.wait(waitMs);
    goToNextProblem(editorCyName);
    cy.contains(problem);
  }
}
