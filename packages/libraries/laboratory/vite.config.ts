import path from 'path';
import { defineConfig, type PluginOption } from 'vite';
import monacoEditor from 'vite-plugin-monaco-editor';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { createMockYoga } from './dev/mock-graphql';

const GRAPHQL_ENDPOINT = '/graphql';

/** Same-origin mock endpoint so `pnpm dev` needs no second process and no CORS. */
const mockGraphQLEndpoint = (): PluginOption => ({
  name: 'laboratory-mock-graphql',
  apply: 'serve',
  configureServer(server) {
    const yoga = createMockYoga({ graphqlEndpoint: GRAPHQL_ENDPOINT });

    // Mounted without a route prefix so connect leaves req.url intact for yoga.
    server.middlewares.use((req, res, next) => {
      if (!req.url?.startsWith(GRAPHQL_ENDPOINT)) {
        return next();
      }

      return yoga(req, res);
    });
  },
});

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [
      react(),
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
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
