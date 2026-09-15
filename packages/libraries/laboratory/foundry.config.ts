import path from 'path';
import { defineConfig } from 'react-foundry';
import monacoEditor from 'vite-plugin-monaco-editor';
import tailwindcss from '@tailwindcss/vite';
import { mockGraphQLEndpoint } from './dev/vite-plugin-mock-graphql';

export default defineConfig({
  previews: 'dev/previews/**/*.preview.tsx',
  title: 'Hive Laboratory',
  // 5173 belongs to `pnpm dev`, so both servers can run side by side.
  port: 5174,
  nav: [
    { label: 'Laboratory', children: [{ label: 'Subscriptions' }, { label: 'Abstract types' }] },
  ],
  viteConfig: {
    // Foundry runs its own vite server and never loads vite.config.ts, so everything the
    // Laboratory needs is restated here: its stylesheet is Tailwind, its editors are
    // monaco, its internals import through the @ alias, and the previews talk to the
    // same mock endpoint `pnpm dev` serves.
    plugins: [
      tailwindcss(),
      mockGraphQLEndpoint(),
      // @ts-expect-error temp
      monacoEditor.default({
        languageWorkers: ['json', 'typescript', 'editorWorkerService'],
        customWorkers: [
          {
            label: 'graphql',
            entry: 'monaco-graphql/dist/graphql.worker',
          },
        ],
      }),
    ],
    resolve: {
      // This config is bundled into node_modules/.cache/react-foundry before it runs, so
      // import.meta.dirname would point there. cwd is where `foundry dev` was invoked.
      alias: {
        '@': path.resolve(process.cwd(), './src'),
      },
    },
  },
});
