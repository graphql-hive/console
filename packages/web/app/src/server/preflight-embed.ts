import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';

export const preflightWorkerEmbed = {
  path: '/__preflight-embed',
  htmlFile: 'preflight-worker-embed.html',
};

/**
 * The GraphiQL laboratory runs preflight scripts inside an iframe that loads this route.
 * In production the page is a static build output. In development @fastify/vite only ever
 * renders index.html, so the embed page is pushed through Vite's HTML transform here, which
 * injects the HMR client and resolves the module script the same way index.html gets.
 */
export function registerPreflightWorkerEmbedRoute(
  server: FastifyInstance,
  dev: null | { appRoot: string; transformHtml: (url: string, html: string) => Promise<string> },
) {
  server.get(preflightWorkerEmbed.path, async (req, reply) => {
    if (dev) {
      const html = await readFile(resolve(dev.appRoot, preflightWorkerEmbed.htmlFile), 'utf8');
      return reply.type('text/html').send(await dev.transformHtml(req.url, html));
    }

    return reply.sendFile(preflightWorkerEmbed.htmlFile, { cacheControl: false });
  });
}
