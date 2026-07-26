import type * as monaco from 'monaco-editor';

type EditorOptions = monaco.editor.IStandaloneEditorConstructionOptions;

const MONOSPACE_STACK =
  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace';

/**
 * Options shared by every laboratory editor.
 *
 * Caller options are applied first, so the values below always win. That is
 * deliberate: they are the house style rather than defaults to be overridden.
 */
export function buildEditorOptions(overrides?: EditorOptions): EditorOptions {
  return {
    ...overrides,
    lineNumbers: 'on',
    cursorStyle: 'line',
    cursorBlinking: 'smooth',
    padding: {
      top: 16,
    },
    fontFamily: MONOSPACE_STACK,
    minimap: {
      enabled: false,
    },
    automaticLayout: true,
    tabSize: 2,
    formatOnPaste: true,
    // Editors sit inside overflow-hidden panels, so hovers (including validation
    // messages and schema docs) are clipped unless they escape via position:fixed.
    fixedOverflowWidgets: true,
  };
}
