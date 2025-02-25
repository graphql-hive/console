import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { AuthN } from '@hive/api/modules/auth/lib/authz';
import type { TargetsByIdCache } from '@hive/api/modules/target/providers/targets-by-id-cache';
import type { TargetsBySlugCache } from '@hive/api/modules/target/providers/targets-by-slug-cache';
import { maskToken, SpanStatusCode } from '@hive/service-common';
import * as Sentry from '@sentry/node';
import { measureHandler, measureParsing } from './metric-helper';
import {
  collectDuration,
  droppedReports,
  httpRequestDuration,
  httpRequests,
  httpRequestsWithNoAccess,
  httpRequestsWithoutToken,
  usedAPIVersion,
} from './metrics';
import type { UsageRateLimit } from './rate-limit';
import type { Usage } from './usage';
import { usageProcessorV2 } from './usage-processor-2';

const ParamsModel = z.union([
  z.object({
    targetId: z.string(),
  }),
  z.object({
    organizationSlug: z.string(),
    projectSlug: z.string(),
    targetSlug: z.string(),
  }),
]);

/**
 * Register Fastify route handlers for reporting usage based on
 * 1. "/:targetId"
 * 2. "/:organizationSlug/:projectSlug/:targetSlug"
 */
export function registerTargetIdRoute(args: {
  server: FastifyInstance;
  authN: AuthN;
  usageRateLimit: UsageRateLimit;
  targetsByIdCache: TargetsByIdCache;
  targetsBySlugCache: TargetsBySlugCache;
  usage: Usage;
}) {
  const handler = measureHandler(async function usageHandler(
    req: FastifyRequest,
    reply: FastifyReply,
  ) {
    const params = ParamsModel.parse(req.params);
    const otel = req.openTelemetry ? req.openTelemetry() : null;
    const activeSpan = otel?.activeSpan;
    httpRequests.inc();
    let token: string | undefined;
    const apiVersion = Array.isArray(req.headers['x-usage-api-version'])
      ? req.headers['x-usage-api-version'][0]
      : req.headers['x-usage-api-version'];

    // This endpoint only supports the v2 format
    if (apiVersion === '2') {
      activeSpan?.setAttribute('hive.usage.api_version', '2');
      usedAPIVersion.labels({ version: '2' }).inc();
    } else {
      activeSpan?.setAttribute('hive.usage.api_version', apiVersion ?? '');
      activeSpan?.setStatus({
        code: SpanStatusCode.ERROR,
        message: "Invalid 'x-api-version' header value.",
      });
      usedAPIVersion.labels({ version: 'invalid' }).inc();

      reply.log.debug("Invalid 'x-usage-api-version' header value.");
      activeSpan?.recordException("Invalid 'x-usage-api-version' header value.");
      await reply.status(401).send("Invalid 'x-usage-api-version' header value.");
      return;
    }

    activeSpan?.setAttribute('hive.usage.token_type', 'modern');
    const authValue = req.headers.authorization;

    if (authValue) {
      token = authValue.replace(/^Bearer\s+/, '');
    }

    if (!token) {
      httpRequestsWithoutToken.inc();
      activeSpan?.recordException('Missing token in request');
      await reply.status(401).send('Missing token');
      return;
    }

    const maskedToken = maskToken(token);
    activeSpan?.setAttribute('hive.usage.masked_token', maskedToken);

    const session = await args.authN.authenticate({ req, reply });

    const target = await ('targetId' in params
      ? args.targetsByIdCache.get(params.targetId)
      : args.targetsBySlugCache.get(params));

    if (!target) {
      activeSpan?.recordException('The Target does not exist.');
      await reply.status(404).send('Target not found');
      return;
    }

    const authenticatedRequestLogger = req.log.child({
      token: maskedToken,
      targetId: target.id,
      organizationId: target.orgId,
    });
    activeSpan?.setAttribute('hive.input.organizationId', target.orgId);
    activeSpan?.setAttribute('hive.input.projectId', target.projectId);
    activeSpan?.setAttribute('hive.input.targetId', target.id);

    const canReportUsage = await session.canPerformAction({
      organizationId: target.orgId,
      action: 'usage:report',
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });

    if (!canReportUsage) {
      httpRequestsWithNoAccess.inc();
      req.log.info('No access (token=%s)', maskedToken);
      activeSpan?.recordException('No access');
      await reply.status(403).send('No access');
      return;
    }

    const isRateLimited = await args.usageRateLimit
      .isRateLimited({
        targetId: target.id,
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
      droppedReports.labels({ targetId: target.id, orgId: target.orgId }).inc();
      authenticatedRequestLogger.debug('Rate limited', maskedToken, target.id, target.orgId);
      await reply.status(429).send();
      return;
    }

    const retentionInfo = await args.usageRateLimit
      .getRetentionForTargetId(target.id)
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
        await reply.status(503).send();
        return;
      }

      activeSpan?.addEvent('using v2');
      const result = measureParsing(
        () =>
          usageProcessorV2(
            reply.log,
            req.body,
            {
              organizationId: target.orgId,
              projectId: target.projectId,
              targetId: target.id,
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

        await reply.status(400).send({
          errors: result.errors,
        });

        return;
      }

      args.usage.collect(result.report);
      stopTimer({
        status: 'success',
      });
      await reply.status(200).send({
        id: result.report.id,
        operations: result.operations,
      });
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
      await reply.status(500).send();
    }
  });

  args.server.route<
    {
      Body: unknown;
    },
    {
      onRequestTime: number;
    }
  >({
    method: 'POST',
    url: '/:targetId',
    onRequest(req, _, done) {
      req.onRequestHRTime = process.hrtime();
      done();
    },
    onResponse(req, _, done) {
      const delta = process.hrtime(req.onRequestHRTime);
      httpRequestDuration.observe(delta[0] + delta[1] / 1e9);
      done();
    },
    handler,
  });

  args.server.route<
    {
      Body: unknown;
    },
    {
      onRequestTime: number;
    }
  >({
    method: 'POST',
    url: '/:organizationSlug/:projectSlug/:targetSlug',
    onRequest(req, _, done) {
      req.onRequestHRTime = process.hrtime();
      done();
    },
    onResponse(req, _, done) {
      const delta = process.hrtime(req.onRequestHRTime);
      httpRequestDuration.observe(delta[0] + delta[1] / 1e9);
      done();
    },
    handler,
  });
}
