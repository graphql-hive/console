import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import type { HtmlTagDescriptor, Plugin, ResolvedConfig, UserConfig } from 'vite';
import monacoEditor from 'vite-plugin-monaco-editor';
import viteFastify from '@fastify/vite/plugin';
import { sentryVitePlugin } from '@sentry/vite-plugin';
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
        '<head><script src="https://unpkg.com/react-scan@0.4.3/dist/auto.global.js"></script>',
      );
    }

    return html;
  },
};

/**
 * vite-plugin-monaco-editor injects `MonacoEnvironment` as an inline <script>, which the CSP blocks
 * (script-src has no 'unsafe-inline'), so Monaco falls back to running its workers on the main thread.
 * For builds, emit that script as a file and reference it instead.
 */
function withExternalMonacoEnvironment(plugin: Plugin): Plugin {
  const transformIndexHtml = plugin.transformIndexHtml as (html: string) => HtmlTagDescriptor[];
  let tags: HtmlTagDescriptor[] = [];
  let file: { fileName: string; source: string } | null = null;

  return {
    ...plugin,
    configResolved(config) {
      (plugin.configResolved as (config: ResolvedConfig) => void)(config);
      tags = transformIndexHtml('');
      if (config.command === 'build') {
        const source = tags.map(tag => String(tag.children)).join('\n');
        const hash = createHash('sha256').update(source).digest('hex').slice(0, 8);
        file = { fileName: `assets/monaco-environment-${hash}.js`, source };
      }
    },
    transformIndexHtml() {
      if (!file) {
        return tags;
      }
      return [{ tag: 'script', attrs: { src: `/${file.fileName}` }, injectTo: 'head-prepend' }];
    },
    generateBundle() {
      if (file) {
        this.emitFile({ type: 'asset', ...file });
      }
    },
  };
}

export default {
  root: __dirname,
  resolve: { tsconfigPaths: true },
  plugins: [
    viteFastify({ spa: true }),
    react(),
    tailwindcss(),
    reactScanPlugin,
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      release: { name: process.env.RELEASE, dist: 'webapp' },
    }),
    withExternalMonacoEnvironment(
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
    ),
  ],
  // Keep the default iife worker format: the inline preflight worker breaks as an ES module worker
  // (e2e laboratory-preflight). The diffs worker's only dynamic import is the wasm engine it never
  // uses, so leaving it external keeps that worker a single chunk without inlining it.
  worker: { rolldownOptions: { external: ['shiki/wasm'] } },
  build: {
    outDir: 'dist',
    rolldownOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        ['preflight-worker-embed']: resolve(__dirname, 'preflight-worker-embed.html'),
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
