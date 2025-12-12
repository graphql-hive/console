import { fastify, type FastifyBaseLogger } from 'fastify';
import cors from '@fastify/cors';
import { Logger } from '@graphql-hive/logger';
import * as Sentry from '@sentry/node';
import { useHTTPErrorHandler } from './http-error-handler';
import { useRequestLogging } from './request-logs';

export type { FastifyBaseLogger, FastifyRequest, FastifyReply } from 'fastify';

function bridgeFastifyLogger(logger: Logger): FastifyBaseLogger {
  return {
    debug(...args: Array<any>) {
      logger.debug.apply(logger, args as any);
    },
    error(...args: Array<any>) {
      logger.error.apply(logger, args as any);
    },
    fatal(...args: Array<any>) {
      logger.error.apply(logger, args as any);
    },
    trace(...args: Array<any>) {
      logger.trace.apply(logger, args as any);
    },
    info(...args: Array<any>) {
      logger.info.apply(logger, args as any);
    },
    warn(...args: Array<any>) {
      logger.warn.apply(logger, args as any);
    },
    child() {
      return this;
    },
    level: logger.level === false ? 'silent' : logger.level,
    silent() {},
  };
}

export async function createServer(options: {
  sentryErrorHandler: boolean;
  name: string;
  log:
    | {
        requests: boolean;
        level: string;
      }
    | Logger;
  cors?: boolean;
  bodyLimit?: number;
}) {
  const server = fastify({
    disableRequestLogging: true,
    bodyLimit: options.bodyLimit ?? 30e6, // 30mb by default
    logger:
      options.log instanceof Logger
        ? bridgeFastifyLogger(options.log)
        : {
            level: options.log.level,
            redact: ['request.options', 'options', 'request.headers.authorization'],
          },
    maxParamLength: 5000,
    requestIdHeader: 'x-request-id',
    trustProxy: true,
  });

  server.addHook('onReady', async () => {
    server.log.info(`Service "${options.name}" is ready`);
  });

  process
    .on('unhandledRejection', (reason, p) => {
      Sentry.captureException(reason);
      server.log.error(reason as any, 'Unhandled Rejection at Promise', p);
    })
    .on('uncaughtException', err => {
      Sentry.captureException(err);
      server.log.error(err as any, 'Uncaught Exception thrown');
    });

  await useHTTPErrorHandler(server, options.sentryErrorHandler);

  if (options.log instanceof Logger === false && options.log.requests) {
    await useRequestLogging(server);
  }

  if (options.cors !== false) {
    await server.register(cors);
  }

  return server;
}
