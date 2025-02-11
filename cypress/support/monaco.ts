import type * as Monaco from 'monaco-editor';

/** Helper function for setting the text within a monaco editor as typing manually results in flaky tests */
export function setMonacoEditorContents(editorCyName: string, text: string) {
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
      // Force a change event to be triggered
      cy.dataCy(editorCyName).find('textarea').type(' ', { force: true });
      editor.setValue(text);
    } else {
      throw new Error('Monaco editor not found on the window or frames[0]');
    }
  });
}
