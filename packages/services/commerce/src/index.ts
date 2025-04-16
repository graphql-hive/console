#!/usr/bin/env node
import 'reflect-metadata';
import { hostname } from 'os';
import {
  configureTracing,
  createServer,
  registerShutdown,
  registerTRPC,
  reportReadiness,
  startMetrics,
  TracingInstance,
} from '@hive/service-common';
import { createConnectionString, createStorage as createPostgreSQLStorage } from '@hive/storage';
import * as Sentry from '@sentry/node';
import { commerceRouter } from './api';
import { env } from './environment';
import { createRateLimiter } from './rate-limit/limiter';
import { createStripeBilling } from './stripe-billing/billing';
import { createEstimator } from './usage-estimator/estimator';

async function main() {
  let tracing: TracingInstance | undefined;

  if (env.tracing.enabled && env.tracing.collectorEndpoint) {
    tracing = configureTracing({
      collectorEndpoint: env.tracing.collectorEndpoint,
      serviceName: 'commerce',
    });

    tracing.instrumentNodeFetch();
    tracing.build();
    tracing.start();
  }

  if (env.sentry) {
    Sentry.init({
      serverName: hostname(),
      dist: 'commerce',
      enabled: !!env.sentry,
      environment: env.environment,
      dsn: env.sentry.dsn,
      release: env.release,
      beforeSend: (event, hint) => (hint?.mechanism?.handled ? null : event),
    });
  }

  const server = await createServer({
    name: 'commerce',
    sentryErrorHandler: true,
    log: {
      level: env.log.level,
      requests: env.log.requests,
    },
  });

  try {
    const postgres = await createPostgreSQLStorage(
      createConnectionString(env.postgres),
      5,
      tracing ? [tracing.instrumentSlonik()] : undefined,
    );

    const usageEstimator = createEstimator({
      logger: server.log,
      clickhouse: {
        protocol: env.clickhouse.protocol,
        host: env.clickhouse.host,
        port: env.clickhouse.port,
        username: env.clickhouse.username,
        password: env.clickhouse.password,
      },
    });

    const rateLimiter = createRateLimiter({
      logger: server.log,
      rateLimitConfig: {
        interval: env.rateLimit.limitCacheUpdateIntervalMs,
      },
      usageEstimator,
      emails: env.hiveServices.emails.endpoint
        ? {
            endpoint: env.hiveServices.emails.endpoint,
          }
        : undefined,
      storage: postgres,
    });

    const stripeBilling = createStripeBilling({
      logger: server.log,
      stripe: {
        token: env.stripe.secretKey,
        syncIntervalMs: env.stripe.syncIntervalMs,
      },
      usageEstimator,
      storage: postgres,
    });

    registerShutdown({
      logger: server.log,
      async onShutdown() {
        await server.close();
        await Promise.all([usageEstimator.stop(), rateLimiter.stop(), stripeBilling.stop()]);
        await postgres.destroy();
      },
    });

    await registerTRPC(server, {
      router: commerceRouter,
      createContext({ req }) {
        return {
          req,
          usageEstimator,
          rateLimiter,
          stripeBilling,
        };
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
      async handler(_, res) {
        const readinessChecks = await Promise.all([
          usageEstimator.readiness(),
          rateLimiter.readiness(),
          postgres.isReady(),
        ]);
        const isReady = readinessChecks.every(val => val === true);
        reportReadiness(isReady);
        void res.status(isReady ? 200 : 400).send();
      },
    });

    if (env.prometheus) {
      await startMetrics(env.prometheus.labels.instance, env.prometheus.port);
    }
    await server.listen({
      port: env.http.port,
      host: '::',
    });
    await Promise.all([usageEstimator.start(), rateLimiter.start(), stripeBilling.start()]);
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
