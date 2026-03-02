import path from 'path';
import dts from 'unplugin-dts/vite';
import { defineConfig } from 'vite';
import monacoEditor from 'vite-plugin-monaco-editor';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const externals = [
  '@tanstack/react-form',
  'date-fns',
  'graphql-ws',
  'lucide-react',
  'lz-string',
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'tslib',
  'zod',
];

export default defineConfig({
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
    dts({
      include: ['src/index.tsx', 'src/lib/**/*.ts', 'src/components/**/*.tsx'],
      exclude: ['src/main.tsx'],
      insertTypesEntry: true,
      staticImport: true,
      outDirs: ['dist'],
      tsconfigPath: './tsconfig.app.json',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    copyPublicDir: false,
    cssCodeSplit: false,
    commonjsOptions: {
      esmExternals: true,
    },
    lib: {
      entry: path.resolve(__dirname, './src/index.tsx'),
      name: 'HiveLaboratory',
      formats: ['es', 'cjs'],
      fileName: format => `hive-laboratory.${format}.js`,
    },
    rollupOptions: {
      external: externals,
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-dom/client': 'ReactDOM',
          '@tanstack/react-form': 'TanStackReactForm',
          'date-fns': 'dateFns',
          'graphql-ws': 'graphqlWs',
          'lucide-react': 'LucideReact',
          'lz-string': 'LZString',
          'react/jsx-runtime': 'ReactJSXRuntime',
          'react/jsx-dev-runtime': 'ReactJSXRuntime',
          tslib: 'tslib',
          zod: 'Zod',
        },
      },
    },
  },
});
