import { config } from 'dotenv';

config({
  debug: true,
  encoding: 'utf8',
});

// Set the environment to development.
// This is necessary because the default environment is production.
// eslint-disable-next-line no-process-env
process.env.NODE_ENV = 'development';

// This way we can import the main module and environment variables will be loaded.
await import('./index');
