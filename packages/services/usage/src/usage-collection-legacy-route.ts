import type { FastifyInstance } from 'fastify';
import { maskToken, SpanStatusCode } from '@hive/service-common';
import * as Sentry from '@sentry/node';
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
import type { UsageRateLimit } from './rate-limit';
import type { Tokens } from './tokens';
import type { Usage } from './usage';
import { usageProcessorV1 } from './usage-processor-1';
import { usageProcessorV2 } from './usage-processor-2';

/**
 * Register Fastify route handlers for reporting usage based on target (registry) access tokens
 * POST "/"
 */
export function registerUsageCollectionLegacyRoute(args: {
  server: FastifyInstance;
  tokens: Tokens;
  usageRateLimit: UsageRateLimit;
  usage: Usage;
}) {
  args.server.route<
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
      const tokenInfo = await args.tokens.fetch(token);
      const maskedToken = maskToken(token);
      activeSpan?.setAttribute('hive.usage.masked_token', maskedToken);

      if (args.tokens.isNotFound(tokenInfo)) {
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
      if (args.tokens.isNoAccess(tokenInfo)) {
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

      const isRateLimited = await args.usageRateLimit
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
        droppedReports.labels({ targetId: tokenInfo.target, orgId: tokenInfo.organization }).inc();
        authenticatedRequestLogger.debug(
          'Rate limited',
          maskedToken,
          tokenInfo.target,
          tokenInfo.organization,
        );
        await res.status(429).send();

        return;
      }

      const retentionInfo = await args.usageRateLimit
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
        if (args.usage.readiness() === false) {
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
            () => usageProcessorV1(req.log, req.body as any, tokenInfo, retentionInfo),
            'v1',
          );
          args.usage.collect(result.report);
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
                req.log,
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

          args.usage.collect(result.report);
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
}
