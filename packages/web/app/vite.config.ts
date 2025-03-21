import { resolve } from 'node:path';
import type { Plugin, UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
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
  plugins: [tsconfigPaths(), react(), reactScanPlugin],
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
