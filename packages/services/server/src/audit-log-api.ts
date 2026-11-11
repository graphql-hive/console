import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Registry } from '@hive/api';
import type {
  AuditLogApiError,
  AuditLogApiErrorCode,
  AuditLogEventsPage,
} from '@hive/api/modules/audit-logs/lib/audit-log-api-models';
import {
  decodeAuditLogCursor,
  encodeAuditLogCursor,
  type AuditLogPosition,
} from '@hive/api/modules/audit-logs/lib/audit-log-cursor';
import { toAuditLogEnvelopeV1 } from '@hive/api/modules/audit-logs/lib/audit-log-envelope';
import {
  AuditLogEventReader,
  type AuditLogPage,
} from '@hive/api/modules/audit-logs/lib/audit-log-event-reader';
import {
  auditLogEventTypes,
  type AuditLogEventType,
} from '@hive/api/modules/audit-logs/providers/audit-logs-types';
import { AuthN, UnauthenticatedSession } from '@hive/api/modules/auth/lib/authz';
import { RedisRateLimiter } from '@hive/api/modules/shared/providers/redis-rate-limiter';
import { Storage } from '@hive/api/modules/shared/providers/storage';
import { metrics } from '@hive/service-common';
import { captureException } from '@sentry/node';

/**
 * Events are only returned once they are this old. An event inserted late (async insert
 * buffering, a slow pod, clock skew) with a timestamp behind an already returned event would
 * otherwise land behind a client's cursor and never be returned.
 */
export const AUDIT_LOG_API_SETTLE_LAG_SECONDS = 60;
/** Matches the `audit_logs` TTL. */
const RETENTION_SECONDS = 365 * 24 * 60 * 60;
/** Tolerated clock difference for cursors pointing slightly into the future. */
const MAX_CURSOR_CLOCK_SKEW_SECONDS = 5 * 60;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1_000;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 60;

const auditLogApiRequestLabelNames = ['status_code'];

const auditLogApiRequestCount = new metrics.Counter({
  name: 'api_audit_log_api_request_count',
  help: 'Number of completed audit log API requests',
  labelNames: auditLogApiRequestLabelNames,
});

const auditLogApiRequestDuration = new metrics.Histogram({
  name: 'api_audit_log_api_request_duration_seconds',
  help: 'Duration of completed audit log API requests in seconds',
  labelNames: auditLogApiRequestLabelNames,
});

const auditLogApiEventsReturned = new metrics.Counter({
  name: 'api_audit_log_api_events_returned',
  help: 'Number of audit log events returned by the audit log API',
});

const auditLogApiCursorLag = new metrics.Histogram({
  name: 'api_audit_log_api_cursor_lag_seconds',
  help: 'Age of the position a client requested events after',
  buckets: [60, 120, 300, 900, 3600, 6 * 3600, 24 * 3600, 7 * 24 * 3600],
});

const eventTypeSet = new Set<string>(auditLogEventTypes) as ReadonlySet<string>;

const QueryModel = z.object({
  cursor: z.string().optional(),
  since: z.string().optional(),
  limit: z
    .string()
    .regex(/^\d+$/, 'limit must be an integer')
    .transform(Number)
    .pipe(z.number().int().min(1).max(MAX_LIMIT))
    .optional(),
  eventTypes: z.string().optional(),
});

function sendError(
  reply: FastifyReply,
  status: number,
  code: AuditLogApiErrorCode,
  message: string,
) {
  const body: AuditLogApiError = { error: { code, message } };
  return reply.status(status).send(body);
}

function parseEventTypes(raw: string | undefined): AuditLogEventType[] | null | 'invalid' {
  if (raw === undefined) {
    return null;
  }
  const values = [
    ...new Set(
      raw
        .split(',')
        .map(value => value.trim())
        .filter(Boolean),
    ),
  ];
  if (values.length === 0 || values.some(value => !eventTypeSet.has(value))) {
    return 'invalid';
  }
  return values as AuditLogEventType[];
}

/**
 * The audit log API: lets SIEMs poll an organization's audit log, oldest first, with an opaque
 * cursor. Authenticated with organization access tokens holding `auditLog:describe`.
 */
export const createAuditLogApiPlugin =
  (args: { injector: Registry['injector']; authN: AuthN }): FastifyPluginAsync =>
  async server => {
    const reader = args.injector.get(AuditLogEventReader);
    const storage = args.injector.get(Storage);
    const rateLimiter = args.injector.get(RedisRateLimiter);
    const requestStartTimeMap = new WeakMap<FastifyRequest, bigint>();

    server.addHook('onRequest', (request, _reply, done) => {
      requestStartTimeMap.set(request, process.hrtime.bigint());
      done();
    });

    server.addHook('onResponse', (request, reply, done) => {
      const start = requestStartTimeMap.get(request);
      const labels = { status_code: reply.statusCode };
      auditLogApiRequestCount.inc(labels);
      if (start) {
        auditLogApiRequestDuration.observe(labels, Number(process.hrtime.bigint() - start) / 1e9);
      }
      done();
    });

    server.get('/events', async (req, reply) => {
      const session = await args.authN.authenticate({ req, reply });
      if (session instanceof UnauthenticatedSession) {
        return sendError(reply, 401, 'UNAUTHENTICATED', 'Missing or invalid access token.');
      }

      const actor = await session.getActor();
      if (actor.type !== 'organizationAccessToken') {
        return sendError(
          reply,
          401,
          'UNAUTHENTICATED',
          'The audit log API requires an organization access token.',
        );
      }

      const accessToken = actor.organizationAccessToken;
      const organizationId = accessToken.organizationId;

      if (
        await rateLimiter.isOrganizationRateLimited(
          req,
          organizationId,
          'audit-log-api:events',
          RATE_LIMIT_WINDOW_SECONDS,
          RATE_LIMIT_MAX_REQUESTS,
        )
      ) {
        void reply.header('Retry-After', String(RATE_LIMIT_WINDOW_SECONDS));
        return sendError(reply, 429, 'RATE_LIMITED', 'Rate limited.');
      }

      const canRead = await session.canPerformAction({
        action: 'auditLog:describe',
        organizationId,
        params: { organizationId },
      });
      if (!canRead) {
        return sendError(
          reply,
          403,
          'FORBIDDEN',
          "The access token is missing the 'auditLog:describe' permission.",
        );
      }

      const organization = await storage.getOrganization({ organizationId });

      const query = QueryModel.safeParse(req.query);
      if (!query.success) {
        return sendError(
          reply,
          400,
          'INVALID_PARAMETER',
          query.error.issues
            .map(issue => `${issue.path.join('.') || 'query'}: ${issue.message}`)
            .join('; '),
        );
      }

      const eventTypes = parseEventTypes(query.data.eventTypes);
      if (eventTypes === 'invalid') {
        return sendError(
          reply,
          400,
          'INVALID_PARAMETER',
          'eventTypes must be a comma-separated list of known audit log event types.',
        );
      }

      const now = Math.floor(Date.now() / 1000);
      const retentionStart = now - RETENTION_SECONDS;
      let position: AuditLogPosition;
      let cursorExpired = false;

      if (query.data.cursor !== undefined) {
        const decoded = decodeAuditLogCursor(query.data.cursor);
        if (!decoded || decoded.timestamp > now + MAX_CURSOR_CLOCK_SKEW_SECONDS) {
          return sendError(reply, 400, 'INVALID_CURSOR', 'The cursor is invalid.');
        }
        position = decoded;
        // Rows older than the retention period may already be gone, so events right after the
        // cursor might be missing. Report it rather than silently skipping ahead.
        cursorExpired = decoded.timestamp < retentionStart;
      } else if (query.data.since !== undefined) {
        const since = Date.parse(query.data.since);
        if (Number.isNaN(since)) {
          return sendError(
            reply,
            400,
            'INVALID_PARAMETER',
            'since must be an ISO 8601 date-time, e.g. 2026-01-01T00:00:00Z.',
          );
        }
        // `{ timestamp, id: '' }` lies before every event of second `timestamp`, so `since` is inclusive.
        position = { timestamp: Math.max(0, Math.ceil(since / 1000)), id: '' };
      } else {
        position = { timestamp: retentionStart, id: '' };
      }

      const limit = query.data.limit ?? DEFAULT_LIMIT;
      let page: AuditLogPage;
      try {
        page = await reader.readPage({
          organizationId,
          after: position,
          highWater: now - AUDIT_LOG_API_SETTLE_LAG_SECONDS,
          eventTypes,
          limit,
        });
      } catch (error) {
        req.log.error(
          'failed to read audit log page (organizationId=%s, error=%s)',
          organizationId,
          error instanceof Error ? error.message : String(error),
        );
        captureException(error);
        return sendError(
          reply,
          500,
          'INTERNAL_ERROR',
          'Failed to read the audit log. Retry the request with the same cursor.',
        );
      }

      const nextCursor = encodeAuditLogCursor(page.next);

      if (page.hasMore) {
        // Built from the request, so the link points at the host the client called (e.g.
        // api.graphql-hive.com behind the proxy, which forwards the path unchanged).
        // `trustProxy` makes `protocol` and `host` honor X-Forwarded-Proto / X-Forwarded-Host.
        const nextUrl = new URL(req.url, `${req.protocol}://${req.host}`);
        nextUrl.search = '';
        nextUrl.searchParams.set('cursor', nextCursor);
        nextUrl.searchParams.set('limit', String(limit));
        if (eventTypes) {
          nextUrl.searchParams.set('eventTypes', eventTypes.join(','));
        }
        void reply.header('Link', `<${nextUrl.toString()}>; rel="next"`);
      }

      auditLogApiEventsReturned.inc(page.rows.length);
      auditLogApiCursorLag.observe(Math.max(0, now - position.timestamp));
      req.log.debug(
        'audit log page served (organizationId=%s, accessTokenId=%s, events=%s, hasMore=%s)',
        organizationId,
        accessToken.id,
        page.rows.length,
        page.hasMore,
      );

      const organizationRef = { id: organization.id, slug: organization.slug };
      const body: AuditLogEventsPage = {
        events: page.rows.map(row => toAuditLogEnvelopeV1(row, organizationRef)),
        nextCursor,
        hasMore: page.hasMore,
        cursorExpired,
      };
      return reply.status(200).send(body);
    });
  };
