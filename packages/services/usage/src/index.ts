#!/usr/bin/env node
import 'reflect-metadata';
import { hostname } from 'os';
import Redis from 'ioredis';
import { PrometheusConfig } from '@hive/api/modules/shared/providers/prometheus-config';
import { TargetsCache } from '@hive/api/modules/target/providers/targets-cache';
import {
  configureTracing,
  createServer,
  maskToken,
  registerShutdown,
  reportReadiness,
  SpanStatusCode,
  startMetrics,
  TracingInstance,
} from '@hive/service-common';
import { createConnectionString } from '@hive/storage';
import { getPool } from '@hive/storage/db/pool';
import * as Sentry from '@sentry/node';
import { createAuthN } from './authn';
import { env } from './environment';
import { measureHandler, measureParsing } from './metric-helper';
import {
  collectDuration,
  droppedReports,
  httpRequestDuration,
  httpRequests,
  httpRequestsWithNoAccess,
  httpRequestsWithNonExistingToken,
  httpRequestsWithoutToken,
  tokensDuration,
  usedAPIVersion,
} from './metrics';
import { createUsageRateLimit } from './rate-limit';
import { registerTargetIdRoute } from './target-id-route';
import { createTokens } from './tokens';
import { createUsage } from './usage';
import { usageProcessorV1 } from './usage-processor-1';
import { usageProcessorV2 } from './usage-processor-2';

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

  const targetsCache = new TargetsCache(redis, pgPool, new PrometheusConfig(!!tracing));

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

    const { collect, readiness, start, stop } = usage;

    const shutdown = registerShutdown({
      logger: server.log,
      async onShutdown() {
        server.log.info('Stopping tracing handler...');
        await tracing?.shutdown();

        server.log.info('Stopping service handler...');
        await Promise.all([stop(), server.close()]);
      },
    });

    const tokens = createTokens({
      endpoint: env.hive.tokens.endpoint,
      logger: server.log,
    });

    const rateLimit = createUsageRateLimit(
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

    registerTargetIdRoute({
      server,
      authN,
      usageRateLimit: rateLimit,
      usage,
      targetsCache,
    });

    server.route<
      {
        Body: unknown;
      },
      {
        onRequestTime: number;
      }
    >({
      method: 'POST',
      url: '/',
      onRequest(req, _, done) {
        req.onRequestHRTime = process.hrtime();
        done();
      },
      onResponse(req, _, done) {
        const delta = process.hrtime(req.onRequestHRTime);
        httpRequestDuration.observe(delta[0] + delta[1] / 1e9);
        done();
      },
      handler: measureHandler(async function usageHandler(req, res) {
        const otel = req.openTelemetry ? req.openTelemetry() : null;
        const activeSpan = otel?.activeSpan;
        httpRequests.inc();
        let token: string | undefined;
        const legacyToken = req.headers['x-api-token'] as string;
        const apiVersion = Array.isArray(req.headers['x-usage-api-version'])
          ? req.headers['x-usage-api-version'][0]
          : req.headers['x-usage-api-version'];

        if (apiVersion) {
          if (apiVersion === '1') {
            usedAPIVersion.labels({ version: '1' }).inc();
            activeSpan?.setAttribute('hive.usage.api_version', '1');
          } else if (apiVersion === '2') {
            activeSpan?.setAttribute('hive.usage.api_version', '2');
            usedAPIVersion.labels({ version: '2' }).inc();
          } else {
            activeSpan?.setAttribute('hive.usage.api_version', apiVersion);
            activeSpan?.setStatus({
              code: SpanStatusCode.ERROR,
              message: "Invalid 'x-api-version' header value.",
            });

            usedAPIVersion.labels({ version: 'invalid' }).inc();
          }
        } else {
          usedAPIVersion.labels({ version: 'none' }).inc();
          activeSpan?.setAttribute('hive.usage.api_version', 'none');
        }

        if (legacyToken) {
          // TODO: add metrics to track legacy x-api-token header
          token = legacyToken;
          activeSpan?.setAttribute('hive.usage.token_type', 'legacy');
        } else {
          activeSpan?.setAttribute('hive.usage.token_type', 'modern');
          const authValue = req.headers.authorization;

          if (authValue) {
            token = authValue.replace(/^Bearer\s+/, '');
          }
        }

        if (!token) {
          httpRequestsWithoutToken.inc();
          activeSpan?.recordException('Missing token in request');
          await res.status(401).send('Missing token');
          return;
        }

        if (token.length !== 32) {
          activeSpan?.recordException('Invalid token');
          httpRequestsWithoutToken.inc();
          await res.status(401).send('Invalid token');
          return;
        }

        const stopTokensDurationTimer = tokensDuration.startTimer();
        const tokenInfo = await tokens.fetch(token);
        const maskedToken = maskToken(token);
        activeSpan?.setAttribute('hive.usage.masked_token', maskedToken);

        if (tokens.isNotFound(tokenInfo)) {
          stopTokensDurationTimer({
            status: 'not_found',
          });
          httpRequestsWithNonExistingToken.inc();
          req.log.info('Token not found (token=%s)', maskedToken);
          activeSpan?.recordException('Token not found');
          await res.status(401).send('Missing token');
          return;
        }

        // We treat collected operations as part of registry
        if (tokens.isNoAccess(tokenInfo)) {
          stopTokensDurationTimer({
            status: 'no_access',
          });
          httpRequestsWithNoAccess.inc();
          req.log.info('No access (token=%s)', maskedToken);
          activeSpan?.recordException('No access');
          await res.status(403).send('No access');
          return;
        }

        const authenticatedRequestLogger = req.log.child({
          token: maskedToken,
          target: tokenInfo.target,
          organization: tokenInfo.organization,
        });

        stopTokensDurationTimer({
          status: 'success',
        });

        activeSpan?.setAttribute('hive.input.target', tokenInfo.target);
        activeSpan?.setAttribute('hive.input.organization', tokenInfo.organization);
        activeSpan?.setAttribute('hive.input.project', tokenInfo.project);
        activeSpan?.setAttribute('hive.token.scopes', tokenInfo.scopes.join(','));

        const isRateLimited = await rateLimit
          .isRateLimited({
            targetId: tokenInfo.target,
            token,
          })
          .catch(error => {
            authenticatedRequestLogger.error('Failed to check rate limit');
            authenticatedRequestLogger.error(error);
            Sentry.captureException(error, {
              level: 'error',
            });
            activeSpan?.addEvent('Failed to check rate limit');
            activeSpan?.recordException(error);

            // If we can't check rate limit, we should not drop the report
            return false;
          });

        if (isRateLimited) {
          activeSpan?.addEvent('rate-limited');
          droppedReports
            .labels({ targetId: tokenInfo.target, orgId: tokenInfo.organization })
            .inc();
          authenticatedRequestLogger.debug(
            'Rate limited',
            maskedToken,
            tokenInfo.target,
            tokenInfo.organization,
          );
          await res.status(429).send();

          return;
        }

        const retentionInfo = await rateLimit
          .getRetentionForTargetId(tokenInfo.target)
          .catch(error => {
            authenticatedRequestLogger.error(error);
            Sentry.captureException(error, {
              level: 'error',
            });
            activeSpan?.addEvent('Failed to get retention info');

            return null;
          });

        if (typeof retentionInfo !== 'number') {
          authenticatedRequestLogger.error('Failed to get retention info');
        }

        const stopTimer = collectDuration.startTimer();
        try {
          if (readiness() === false) {
            authenticatedRequestLogger.warn('Not ready to collect report');
            stopTimer({
              status: 'not_ready',
            });
            activeSpan?.recordException('Not ready to collect report, status is not ready');
            // 503 - Service Unavailable
            // The server is currently unable to handle the request due being not ready.
            // This tells the gateway to retry the request and not to drop it.
            await res.status(503).send();
            return;
          }

          if (apiVersion === undefined || apiVersion === '1') {
            activeSpan?.addEvent('using v1');
            const result = measureParsing(
              () => usageProcessorV1(server.log, req.body as any, tokenInfo, retentionInfo),
              'v1',
            );
            collect(result.report);
            stopTimer({
              status: 'success',
            });
            await res.status(200).send({
              id: result.report.id,
              operations: result.operations,
            });
            return;
          }

          if (apiVersion === '2') {
            activeSpan?.addEvent('using v2');
            const result = measureParsing(
              () =>
                usageProcessorV2(
                  server.log,
                  req.body,
                  {
                    targetId: tokenInfo.target,
                    projectId: tokenInfo.project,
                    organizationId: tokenInfo.organization,
                  },
                  retentionInfo,
                ),
              'v2',
            );

            if (result.success === false) {
              stopTimer({
                status: 'error',
              });
              authenticatedRequestLogger.info(
                'Report validation failed (errors=%j)',
                result.errors.map(error => error.path + ': ' + error.message),
              );

              activeSpan?.addEvent('Failed to parse report object');
              result.errors.forEach(error =>
                activeSpan?.recordException(error.path + ': ' + error.message),
              );

              await res.status(400).send({
                errors: result.errors,
              });

              return;
            }

            collect(result.report);
            stopTimer({
              status: 'success',
            });
            await res.status(200).send({
              id: result.report.id,
              operations: result.operations,
            });
            return;
          }

          authenticatedRequestLogger.debug("Invalid 'x-api-version' header value.");
          stopTimer({
            status: 'error',
          });
          activeSpan?.recordException("Invalid 'x-api-version' header value.");
          await res.status(401).send("Invalid 'x-api-version' header value.");
          return;
        } catch (error) {
          stopTimer({
            status: 'error',
          });
          authenticatedRequestLogger.error('Failed to collect report');
          authenticatedRequestLogger.error(error, 'Failed to collect');
          Sentry.captureException(error, {
            level: 'error',
          });
          activeSpan?.recordException(error as Error);
          await res.status(500).send();
        }
      }),
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
        const isReady = readiness();
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
    await start();
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
