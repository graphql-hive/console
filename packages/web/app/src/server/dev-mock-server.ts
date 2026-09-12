import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

// The watched server entry for mock mode, started by ./dev-mock.ts (which prompts first).
// Only src/dev/.env.mock is loaded, never .env, so mock mode behaves the same for everyone.
config({
  path: fileURLToPath(new URL('../dev/.env.mock', import.meta.url)),
  override: true,
  encoding: 'utf8',
});

/* eslint-disable no-process-env */
process.env.NODE_ENV = 'development';
process.env.HIVE_MOCK = '1';
// Set by the launcher; a bare `tsx dev-mock-server.ts` gets a fresh id per (re)start.
process.env.HIVE_MOCK_SESSION ??= Date.now().toString(36);

await import('./index');
