import path from 'path';
import { defineConfig } from 'vite';
import monacoEditor from 'vite-plugin-monaco-editor';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'global.process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [
    react(),
    tailwindcss(),
    // @ts-expect-error temporary package typing mismatch
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
  build: {
    copyPublicDir: false,
    emptyOutDir: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        // UMD consumers can execute this in plain browser contexts without Node globals.
        intro:
          "var process = typeof globalThis !== 'undefined' && globalThis.process ? globalThis.process : { env: { NODE_ENV: 'production' } };",
      },
    },
    lib: {
      entry: path.resolve(__dirname, './src/index.tsx'),
      name: 'HiveLaboratory',
      formats: ['umd'],
      fileName: () => 'hive-laboratory.umd.js',
    },
  },
});
