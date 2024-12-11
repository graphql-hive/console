import type { UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import react from '@vitejs/plugin-react';

const __dirname = new URL('.', import.meta.url).pathname;

export default {
  root: __dirname,
  plugins: [tsconfigPaths(), react()],
  build: {
    rollupOptions: {
      output: {
        chunkFileNames(chunkInfo) {
          if (chunkInfo.name === 'preflight-script-worker') {
            // don't add a hash to have a fixed name for the worker
            return 'preflight-script-worker.js';
          }
          return '[name].[hash].js';
        },
        manualChunks(id) {
          if (id.endsWith('preflight-script-worker.ts?worker')) {
            return 'preflight-script-worker'; // All node_modules dependencies will go into "preflight-script-worker" chunk
          }
        },
      },
    },
  },
} satisfies UserConfig;
