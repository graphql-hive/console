import { fastify } from 'fastify';
import promClient from 'prom-client';
import cors from '@fastify/cors';

export { promClient as metrics };

export const readiness = new promClient.Gauge({
  name: 'service_readiness',
  help: 'Shows if the service is ready to serve requests (1 is ready, 0 is not ready)',
});

export function reportReadiness(isReady: boolean) {
  readiness.set(isReady ? 1 : 0);
}

type MetricsListenOptions = {
  port?: number;
  host?: string;
  ipv6Only?: boolean;
};

export async function startMetrics(
  instanceLabel: string | undefined,
  options: MetricsListenOptions = {},
): Promise<() => Promise<void>> {
  const { port = 10_254, host = '::', ipv6Only = false } = options;

  promClient.collectDefaultMetrics({
    labels: { instance: instanceLabel },
  });

  const server = fastify({
    disableRequestLogging: true,
    trustProxy: true,
  });

  server.route({
    method: 'GET',
    url: '/metrics',
    async handler(_req, res) {
      try {
        void res.header('Content-Type', promClient.register.contentType);
        const result = await promClient.register.metrics();

        void res.send(result);
      } catch (error) {
        void res.status(500).send(error);
      }
    },
  });

  await server.register(cors);

  await server.listen({
    port,
    host,
    ipv6Only,
  });

  return () => server.close();
}
