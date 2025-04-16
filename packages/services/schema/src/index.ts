#!/usr/bin/env node
import 'reflect-metadata';
import { hostname } from 'os';
import Redis from 'ioredis';
import {
  configureTracing,
  createErrorHandler,
  createServer,
  registerShutdown,
  registerTRPC,
  reportReadiness,
  startMetrics,
  TracingInstance,
} from '@hive/service-common';
import * as Sentry from '@sentry/node';
import { Context, schemaBuilderApiRouter } from './api';
import { createCache } from './cache';
import { CompositionScheduler } from './composition-scheduler';
import { env } from './environment';

async function main() {
  let tracing: TracingInstance | undefined;

  if (env.tracing.enabled && env.tracing.collectorEndpoint) {
    tracing = configureTracing({
      collectorEndpoint: env.tracing.collectorEndpoint,
      serviceName: 'schema-composition',
    });

    tracing.instrumentNodeFetch();
    tracing.build();
    tracing.start();
  }

  if (env.sentry) {
    Sentry.init({
      serverName: hostname(),
      dist: 'schema',
      enabled: !!env.sentry,
      environment: env.environment,
      dsn: env.sentry.dsn,
      beforeSend: (event, hint) => (hint?.mechanism?.handled ? null : event),
      release: env.release,
    });
  }

  const server = await createServer({
    name: 'schema',
    sentryErrorHandler: true,
    log: {
      level: env.log.level,
      requests: env.log.requests,
    },
    bodyLimit: env.http.bodyLimit,
  });

  const compositionScheduler = new CompositionScheduler(
    server.log,
    env.compositionWorker.count,
    env.compositionWorker.maxOldGenerationSizeMb,
  );

  if (tracing) {
    await server.register(...tracing.instrumentFastify());
  }

  registerShutdown({
    logger: server.log,
    async onShutdown() {
      await server.close();
      redis.disconnect(false);
    },
  });

  const errorHandler = createErrorHandler(server);

  const redis = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
    retryStrategy(times) {
      return Math.min(times * 500, 2000);
    },
    reconnectOnError(error) {
      server.log.warn('Redis reconnectOnError (error=%s)', error);
      return 1;
    },
    db: 0,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: env.redis.tlsEnabled ? {} : undefined,
  });

  try {
    redis.on('error', err => {
      errorHandler('Redis error', err);
    });

    redis.on('connect', () => {
      server.log.debug('Redis connection established');
    });

    redis.on('ready', () => {
      server.log.info('Redis connection ready');
    });

    redis.on('close', () => {
      server.log.info('Redis connection closed');
    });

    redis.on('reconnecting', (timeToReconnect?: number) => {
      server.log.info('Redis reconnecting in %s', timeToReconnect);
    });

    await registerTRPC(server, {
      router: schemaBuilderApiRouter,
      createContext({ req }): Context {
        const cache = createCache({
          prefix: 'schema-service-v2',
          redis,
          logger: req.log,
          pollIntervalMs: env.timings.cachePollInterval,
          timeoutMs: env.timings.schemaCompositionTimeout,
          ttlMs: {
            success: env.timings.cacheSuccessTTL,
            failure: env.timings.cacheTTL,
          },
        });
        return { cache, req, broker: env.requestBroker, compositionScheduler };
      },
    });

    server.route({
      method: ['GET', 'HEAD'],
      url: '/_health',
      handler(_, res) {
        void res.status(200).send();
      },
    });

    server.route({
      method: ['GET', 'HEAD'],
      url: '/_readiness',
      handler(_, res) {
        reportReadiness(true);
        void res.status(200).send();
      },
    });

    await server.listen({
      port: env.http.port,
      host: '::',
    });

    if (env.prometheus) {
      await startMetrics(env.prometheus.labels.instance, env.prometheus.port);
    }
  } catch (error) {
    server.log.fatal(error);
    throw error;
  }
}

main().catch(err => {
  Sentry.captureException(err, {
    level: 'fatal',
  });
  console.error(err);
  process.exit(1);
});
