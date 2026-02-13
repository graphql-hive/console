import { resolve } from 'node:path';
import type { Plugin, UserConfig } from 'vite';
import monacoEditor from 'vite-plugin-monaco-editor';
import tsconfigPaths from 'vite-tsconfig-paths';
import viteFastify from '@fastify/vite/plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const __dirname = new URL('.', import.meta.url).pathname;

// Add react-scan in local development mode
const reactScanPlugin: Plugin = {
  name: 'react-scan',
  transformIndexHtml(html, ctx) {
    if (ctx.server?.config.command === 'serve') {
      return html.replace(
        '<head>',
        '<head><script src="https://unpkg.com/react-scan/dist/auto.global.js"></script>',
      );
    }

    return html;
  },
};

export default {
  root: __dirname,
  resolve: {
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    alias: {
      react: resolve(__dirname, 'node_modules/react'),
      'react-dom': resolve(__dirname, 'node_modules/react-dom'),
      'react/jsx-runtime': resolve(__dirname, 'node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': resolve(__dirname, 'node_modules/react/jsx-dev-runtime.js'),
    },
  },
  plugins: [
    tsconfigPaths(),
    viteFastify({ spa: true, useRelativePaths: true }),
    react(),
    tailwindcss(),
    reactScanPlugin,
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
        index: resolve(__dirname, 'index.html'),
        ['preflight-worker-embed']: resolve(__dirname, 'preflight-worker-embed.html'),
      },
    },
  },
  optimizeDeps: {
    include: [
      'monaco-editor/esm/vs/editor/editor.api',
      'monaco-editor/esm/vs/language/json/monaco.contribution',
      'monaco-graphql/esm/monaco.contribution',
    ],
  },
} satisfies UserConfig;
