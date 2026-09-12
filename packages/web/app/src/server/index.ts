import { resolve } from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import FastifyStatic from '@fastify/static';
import { env, getPublicEnvVars } from '../env/backend';
import { connectGithub } from './github';
import { connectLab } from './lab';
import { connectSlack } from './slack';

const __dirname = new URL('.', import.meta.url).pathname;
/**
 * Whether the server is running in development mode.
 * See the ./dev.ts file
 */
// eslint-disable-next-line no-process-env
const isDev = process.env.NODE_ENV === 'development';
/**
 * Mock mode (`pnpm dev:mock`): this server also hosts a fake GraphQL API so the UI runs with
 * no backend. Everything for it lives in src/dev/mock-server; this file only hooks it in.
 * Never true outside development.
 */
// eslint-disable-next-line no-process-env
const isMock = isDev && process.env.HIVE_MOCK === '1';

const server = Fastify({
  disableRequestLogging: true,
  logger: {
    level: env.log.level,
  },
});

const preflightWorkerEmbed = {
  path: '/__preflight-embed',
  htmlFile: 'preflight-worker-embed.html',
};

async function main() {
  /**
   * Why is this necessary?
   *
   * @fastify/vite in production mode needs the vite.config.js file to be present, but we don't really need it as we're not using SSR and stuff.
   * We're just going to serve the frontend as static files in production mode.
   *
   * In development mode, we're going to use @fastify/vite for hot module reloading, pre-bundling dependencies, etc.
   */
  if (isDev) {
    server.log.info('Running in development mode');
    // If in development mode, use Vite to serve the frontend and enable hot module reloading.
    const { default: FastifyVite } = await import('@fastify/vite');

    // This and a patch of @fastify/vite is necessary to serve the preflight worker embed html file.
    // We need to know if the request is for the preflight worker embed or not to determine which html file to serve.
    server.decorateRequest('viteHtmlFile', {
      getter() {
        return this.url.startsWith(preflightWorkerEmbed.path)
          ? preflightWorkerEmbed.htmlFile
          : 'index.html';
      },
    });

    await server.register(FastifyVite, {
      // The root directory of @hive/app (where the package.json is located)
      // /
      // ├── /src
      // │   └── /server
      // │       └── index.ts
      // └── package.json
      root: resolve(__dirname, '../..'),
      dev: true,
      spa: true,
    });

    await server.vite.ready();
  } else {
    server.log.info('Running in production mode');
    // If in production mode, serve the frontend as static files.
    await server.register(FastifyStatic, {
      // The root directory of the frontend code (where the index.html is located)
      // /dist
      // ├── /client
      // │   └── index.html
      // └── index.js
      root: resolve(__dirname, 'client'),
      // Prevent fastify/static from creating '*' route.
      // We want to define our own '*' route to handle all requests.
      wildcard: false,
    });
  }

  await server.register(cors, {
    credentials: true,
  });

  server.get('/api/health', (_req, res) => {
    return res.status(200).send('OK');
  });

  // Exposes environment variables to the frontend as a JavaScript object.
  server.get('/__env.js', (_req, res) => {
    const publicEnvVars = getPublicEnvVars();
    return res
      .status(200)
      .header('content-type', 'text/javascript')
      .header('cache-control', 'no-cache')
      .send(`window.__ENV = ${JSON.stringify(publicEnvVars)};`);
  });

  connectSlack(server);
  connectGithub(server);
  connectLab(server);

  // Mock mode hook (see isMock above). Registered before the HTML fallback so its request
  // hooks apply to page loads. The dynamic import is excluded from the production bundle via
  // buildOptions.external in package.json.
  let mock: { defaultScenario: string; defaultLatency: number } | null = null;
  if (isMock) {
    server.log.warn('HIVE_MOCK=1: serving a mock GraphQL API at /graphql, no backend is used');
    const { connectMockServer } = await import('../dev/mock-server');
    /* eslint-disable no-process-env */
    mock = await connectMockServer(server, {
      session: process.env.HIVE_MOCK_SESSION,
      defaultScenario: process.env.HIVE_MOCK_SCENARIO,
      defaultLatency: Number(process.env.HIVE_MOCK_LATENCY) || 0,
    });
    /* eslint-enable no-process-env */
  }

  server.get(preflightWorkerEmbed.path, (_req, reply) => {
    if (isDev) {
      // If in development mode, return the Vite preflight-worker-embed.html.
      return reply.html();
    }

    // If in production mode, return the static html file.
    return reply.sendFile(preflightWorkerEmbed.htmlFile, {
      cacheControl: false,
    });
  });

  server.get('*', (_req, reply) => {
    if (isDev) {
      // If in development mode, return the Vite index.html.
      return reply.html();
    }

    // If in production mode, return the static index.html.
    return reply.sendFile('index.html', {
      cacheControl: false,
    });
  });

  await server.listen({
    port: env.port,
    host: env.host,
    ipv6Only: env.ipv6Only,
  });

  if (mock) {
    const latency = mock.defaultLatency > 0 ? `, latency ${mock.defaultLatency}ms` : '';
    server.log.warn(
      `Mock mode ready. Open ${env.appBaseUrl} (scenario: ${mock.defaultScenario}${latency}; switch with ?scenario=<name>)`,
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
