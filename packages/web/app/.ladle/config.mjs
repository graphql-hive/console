import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default {
  stories: 'src/stories/ladle/**/*.stories.{ts,tsx}',
  viteConfig: resolve(__dirname, 'vite.config.ts'),
  port: 61000,
  base: '/',
};
