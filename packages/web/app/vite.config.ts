import { resolve } from 'node:path';
import type { UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';

const __dirname = new URL('.', import.meta.url).pathname;

export default {
  root: __dirname,
  plugins: [tsconfigPaths(), react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        ['preflight-worker-embed']: resolve(__dirname, 'preflight-worker-embed.html'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
  },
} satisfies UserConfig;
