import { lazy } from 'react';
// Import from `editor.api` rather than the `monaco-editor` main entry to keep
// the bundle lean — the main entry auto-registers every basic language, which
// bloats our client sourcemaps. We opt in to the contributions we actually use
// via the side-effect imports below.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
// Enables the read-only tooltip shown when users type into a read-only model.
import 'monaco-editor/esm/vs/editor/contrib/readOnlyMessage/browser/contribution.js';
// Registers the basic GraphQL Monarch tokenizer so `language="graphql"` models
// get syntax highlighting. Without this, `editor.api` ships no languages.
import 'monaco-editor/esm/vs/basic-languages/graphql/graphql.contribution.js';
// Registers the JSON language service (`monaco.languages.json`) — required by
// the policy naming-convention rule editor, which configures JSON schema
// diagnostics in `beforeMount`.
import 'monaco-editor/esm/vs/language/json/monaco.contribution.js';
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
