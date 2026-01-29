import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

const __dirname = new URL('..', import.meta.url).pathname;

export default defineConfig({
  root: __dirname,
  plugins: [tsconfigPaths(), react(), tailwindcss()],
});
