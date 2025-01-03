import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import * as Sentry from '@sentry/node';
import { cleanRequestId, maskToken } from './helpers';

const plugin: FastifyPluginAsync = async server => {
  server.decorateReply('sentry', null);

  server.setErrorHandler((err, req, reply) => {
    Sentry.withScope(scope => {
      scope.setUser({ ip_address: req.ip });
      const requestId = cleanRequestId(req.headers['x-request-id']);
      const tokenHeader =
        req.headers['x-api-token'] || req.headers.authorization?.replace('Bearer ', '');
      const maskedToken = typeof tokenHeader === 'string' ? maskToken(tokenHeader) : null;
      if (requestId) {
        scope.setTag('request_id', requestId);
      }
      const { referer } = req.headers;
      if (referer) {
        scope.setTag('referer', referer);
      }
      scope.setTag('path', req.raw.url);
      scope.setTag('method', req.raw.method);
      if (maskedToken) {
        scope.setTag('masked_token', maskedToken);
      }
      req.log.error(err);
      Sentry.captureException(err);

      if (err.code === 'FST_ERR_CRT_BODY_TOO_LARGE') {
        req.log.warn('Payload too large');
        void reply.status(413).send({
          error: 413,
          message: 'Payload Too Large',
        });
        return;
      }

      req.log.warn('Replying with 500 Internal Server Error');
      void reply.status(500).send({
        error: 500,
        message: 'Internal Server Error',
      });
    });
  });
};

const sentryPlugin = fp(plugin, {
  name: 'fastify-sentry',
});

export async function useSentryErrorHandler(server: FastifyInstance) {
  await server.register(sentryPlugin);
}
