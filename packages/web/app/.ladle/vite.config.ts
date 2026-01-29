import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const __dirname = new URL('..', import.meta.url).pathname;

export default defineConfig({
  root: __dirname,
  plugins: [
    tsconfigPaths(),
    react(),
    tailwindcss(),
  ],
});
