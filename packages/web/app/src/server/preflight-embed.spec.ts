import Fastify, { type FastifyReply } from 'fastify';
import { preflightWorkerEmbed, registerPreflightWorkerEmbedRoute } from './preflight-embed';

describe('preflight worker embed route', () => {
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
