import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Plugin, UserConfig } from 'vite';
import monacoEditor from 'vite-plugin-monaco-editor';
import tsconfigPaths from 'vite-tsconfig-paths';
import viteFastify from '@fastify/vite/plugin';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Add react-scan in local development mode
const reactScanPlugin: Plugin = {
  name: 'react-scan',
  transformIndexHtml(html, ctx) {
    if (ctx.server?.config.command === 'serve') {
      return html.replace(
        '<head>',
        '<head><script src="https://unpkg.com/react-scan@0.4.3/dist/auto.global.js"></script>',
      );
    }

    return html;
  },
};

export default {
  root: __dirname,
  plugins: [
    tsconfigPaths(),
    viteFastify({ spa: true, useRelativePaths: true }),
    react(),
    tailwindcss(),
    reactScanPlugin,
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: { name: process.env.RELEASE, dist: 'webapp' },
    }),
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
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html').split(sep).join('/'),
        ['preflight-worker-embed']: resolve(__dirname, 'preflight-worker-embed.html').split(sep).join('/'),
      },
    },
  },
  optimizeDeps: {
    include: ['monaco-editor/esm/vs/editor/editor.api', 'monaco-graphql/esm/monaco.contribution'],
  },
  environments: {
    client: {
      build: {
        sourcemap: 'hidden',
      },
    },
  },
} satisfies UserConfig;
