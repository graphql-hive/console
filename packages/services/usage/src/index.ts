#!/usr/bin/env node
import 'reflect-metadata';
import { hostname } from 'os';
import Redis from 'ioredis';
import { PrometheusConfig } from '@hive/api/modules/shared/providers/prometheus-config';
import { TargetsByIdCache } from '@hive/api/modules/target/providers/targets-by-id-cache';
import { TargetsBySlugCache } from '@hive/api/modules/target/providers/targets-by-slug-cache';
import {
  configureTracing,
  createServer,
  registerShutdown,
  reportReadiness,
  startMetrics,
  TracingInstance,
} from '@hive/service-common';
import { createConnectionString } from '@hive/storage';
import { getPool } from '@hive/storage/db/pool';
import * as Sentry from '@sentry/node';
import { createAuthN } from './authn';
import { env } from './environment';
import { createUsageRateLimit } from './rate-limit';
import { createTokens } from './tokens';
import { createUsage } from './usage';
import { registerUsageCollectionLegacyRoute } from './usage-collection-legacy-route';
import { registerUsageCollectionRoute } from './usage-collection-route';

declare module 'fastify' {
  interface FastifyRequest {
    onRequestHRTime: [number, number];
  }
}

async function main() {
  let tracing: TracingInstance | undefined;

  if (env.tracing.enabled && env.tracing.collectorEndpoint) {
    tracing = configureTracing({
      collectorEndpoint: env.tracing.collectorEndpoint,
      serviceName: 'usage',
    });

    tracing.instrumentNodeFetch();
    tracing.build();
    tracing.start();
  }

  if (env.sentry) {
    Sentry.init({
      serverName: hostname(),
      dist: 'usage',
      enabled: !!env.sentry,
      environment: env.environment,
      dsn: env.sentry.dsn,
      release: env.release,
      beforeSend: (event, hint) => (hint?.mechanism?.handled ? null : event),
    });
  }

  const redis = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
    maxRetriesPerRequest: 20,
    db: 0,
    enableReadyCheck: false,
    tls: env.redis.tlsEnabled ? {} : undefined,
  });

  const server = await createServer({
    name: 'usage',
    sentryErrorHandler: true,
    log: {
      level: env.log.level,
      requests: env.log.requests,
    },
  });

  const pgPool = await getPool(
    createConnectionString(env.postgres),
    5,
    tracing ? [tracing.instrumentSlonik()] : [],
  );

  const authN = createAuthN({
    pgPool,
    redis,
    isPrometheusEnabled: !!tracing,
  });

  const prometheusConfig = new PrometheusConfig(!!tracing);
  const targetsByIdCache = new TargetsByIdCache(redis, pgPool, prometheusConfig);
  const targetsBySlugCache = new TargetsBySlugCache(redis, pgPool, prometheusConfig);

  if (tracing) {
    await server.register(...tracing.instrumentFastify());
  }

  try {
    redis.on('error', err => {
      server.log.error(err, 'Redis connection error');
    });

    redis.on('connect', () => {
      server.log.info('Redis connection established');
    });

    redis.on('ready', () => {
      server.log.info('Redis connection ready... ');
    });

    redis.on('close', () => {
      server.log.info('Redis connection closed');
    });

    redis.on('reconnecting', (timeToReconnect?: number) => {
      server.log.info('Redis reconnecting in %s', timeToReconnect);
    });

    redis.on('end', async () => {
      server.log.info('Redis ended - no more reconnections will be made');
      await shutdown();
    });

    const usage = createUsage({
      logger: server.log,
      kafka: {
        topic: env.kafka.topic,
        buffer: env.kafka.buffer,
        connection: env.kafka.connection,
      },
      onStop(reason) {
        return shutdown(reason);
      },
    });

    const shutdown = registerShutdown({
      logger: server.log,
      async onShutdown() {
        server.log.info('Stopping tracing handler...');
        await tracing?.shutdown();

        server.log.info('Stopping service handler...');
        await Promise.all([usage.stop(), server.close()]);
      },
    });

    const tokens = createTokens({
      endpoint: env.hive.tokens.endpoint,
      logger: server.log,
    });

    const usageRateLimit = createUsageRateLimit(
      env.hive.commerce
        ? {
            endpoint: env.hive.commerce.endpoint,
            ttlMs: env.hive.commerce.ttl,
            logger: server.log,
          }
        : {
            logger: server.log,
          },
    );

    registerUsageCollectionRoute({
      server,
      authN,
      usageRateLimit,
      usage,
      targetsByIdCache,
      targetsBySlugCache,
    });

    registerUsageCollectionLegacyRoute({
      server,
      tokens,
      usageRateLimit,
      usage,
    });

    server.route({
      method: ['GET', 'HEAD'],
      url: '/_health',
      async handler(_, res) {
        await res.status(200).send();
      },
    });

    server.route({
      method: ['GET', 'HEAD'],
      url: '/_readiness',
      async handler(_, res) {
        const isReady = usage.readiness();
        reportReadiness(isReady);
        await res.status(isReady ? 200 : 400).send();
      },
    });

    if (env.prometheus) {
      await startMetrics(env.prometheus.labels.instance, env.prometheus.port);
    }

    await server.listen({
      port: env.http.port,
      host: '::',
    });
    await usage.start();
  } catch (error) {
    server.log.fatal(error);
    Sentry.captureException(error, {
      level: 'fatal',
    });
  }
}

main().catch(err => {
  Sentry.captureException(err, {
    level: 'fatal',
  });
  console.error(err);
  process.exit(1);
});
