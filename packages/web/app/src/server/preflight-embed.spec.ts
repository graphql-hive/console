import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify, { type FastifyReply } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { preflightWorkerEmbed, registerPreflightWorkerEmbedRoute } from './preflight-embed';

describe('preflight worker embed route', () => {
  it('in development serves the embed page through the Vite transform, not index.html', async () => {
    const appRoot = await mkdtemp(join(tmpdir(), 'preflight-embed-'));
    await writeFile(join(appRoot, 'index.html'), '<html>app shell</html>');
    await writeFile(join(appRoot, preflightWorkerEmbed.htmlFile), '<html>embed</html>');
    const transformHtml = vi.fn(async (url: string, html: string) => `${html}<!-- vite ${url} -->`);

    const server = Fastify();
    registerPreflightWorkerEmbedRoute(server, { appRoot, transformHtml });
    const url = `${preflightWorkerEmbed.path}?v=1`;

    const response = await server.inject({ method: 'GET', url });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toMatch(/^text\/html/);
    expect(response.body).toBe(`<html>embed</html><!-- vite ${url} -->`);
    expect(transformHtml).toHaveBeenCalledWith(url, '<html>embed</html>');
  });

  it('in production sends the static embed file', async () => {
    const server = Fastify();
    const sendFile = vi.fn(function (this: FastifyReply, file: string) {
      return this.send(`static:${file}`);
    });
    server.decorateReply('sendFile', sendFile);
    registerPreflightWorkerEmbedRoute(server, null);

    const response = await server.inject({ method: 'GET', url: preflightWorkerEmbed.path });

    expect(response.body).toBe(`static:${preflightWorkerEmbed.htmlFile}`);
    expect(sendFile).toHaveBeenCalledWith(preflightWorkerEmbed.htmlFile, { cacheControl: false });
  });
});
