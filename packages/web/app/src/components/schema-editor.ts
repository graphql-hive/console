import { lazy } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import 'monaco-editor/esm/vs/editor/contrib/readOnlyMessage/browser/contribution.js';
import {
  loader,
  DiffEditor as MonacoDiffEditor,
  Editor as MonacoEditor,
} from '@monaco-editor/react';

// Use the locally bundled Monaco (via vite-plugin-monaco-editor) instead of CDN
// to ensure the editor and workers are from the same version.
loader.config({ monaco });

export { MonacoDiffEditor };
export { MonacoEditor };

export const SchemaEditor = lazy(async () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await import('regenerator-runtime/runtime');
  const { SchemaEditor } = await import('@theguild/editor');
  return { default: SchemaEditor };
});

export type { SchemaEditorProps } from '@theguild/editor';
