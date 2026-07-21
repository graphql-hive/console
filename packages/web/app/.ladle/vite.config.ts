import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tsconfigPaths(), tailwindcss()],
  // Ladle pulls Vite 6, but the repo pins esbuild 0.28 (pnpm override). That pairing
  // makes esbuild treat modern syntax (destructuring, etc.) as unsupported and try to
  // down-level it while pre-bundling deps, which it can't...forcing an esnext target
  // tells esbuild everything is supported, so it stops lowering.
  optimizeDeps: {
    esbuildOptions: { target: 'esnext' },
  },
  esbuild: { target: 'esnext' },
});
