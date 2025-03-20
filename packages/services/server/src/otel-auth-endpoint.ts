import type { FastifyInstance } from 'fastify';
import type Redis from 'ioredis';
import type { DatabasePool } from 'slonik';
import type { AuthN } from '@hive/api/modules/auth/lib/authz';
import { PrometheusConfig } from '@hive/api/modules/shared/providers/prometheus-config';
import { TargetsByIdCache } from '@hive/api/modules/target/providers/targets-by-id-cache';
import { TargetsBySlugCache } from '@hive/api/modules/target/providers/targets-by-slug-cache';
import { isUUID } from '@hive/api/shared/is-uuid';

export function createOtelAuthEndpoint(args: {
  server: FastifyInstance;
  tracing: boolean;
  authN: AuthN;
  redis: Redis;
  pgPool: DatabasePool;
}) {
  const prometheusConfig = new PrometheusConfig(args.tracing);
  const targetsByIdCache = new TargetsByIdCache(args.redis, args.pgPool, prometheusConfig);
  const targetsBySlugCache = new TargetsBySlugCache(args.redis, args.pgPool, prometheusConfig);

  args.server.get('/otel-auth', async (req, reply) => {
    const targetRefHeader = req.headers['x-hive-target-ref'];

    const targetRefRaw = Array.isArray(targetRefHeader) ? targetRefHeader[0] : targetRefHeader;

    if (typeof targetRefRaw !== 'string' || targetRefRaw.trim().length === 0) {
      await reply.status(400).send({
        message: `Missing required header: 'X-Hive-Target-Ref'. Please provide a valid target reference in the request headers.`,
      });
      return;
    }

    const targetRefParseResult = parseTargetRef(targetRefRaw);

    if (!targetRefParseResult.ok) {
      await reply.status(400).send({
        message: targetRefParseResult.error,
      });
      return;
    }

    const targetRef = targetRefParseResult.data;

    const session = await args.authN.authenticate({ req, reply });

    const target = await (targetRef.kind === 'id'
      ? targetsByIdCache.get(targetRef.targetId)
      : targetsBySlugCache.get(targetRef));

    if (!target) {
      await reply.status(404).send({
        message: `The specified target does not exist. Verify the target reference and try again.`,
      });
      return;
    }

    const canReportUsage = await session.canPerformAction({
      organizationId: target.orgId,
      action: 'usage:report', // TODO: define a new action for tracing
      params: {
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
      },
    });

    if (!canReportUsage) {
      await reply.status(403).send({
        message: `You do not have permission to send traces for this target.`,
      });
      return;
    }

    await reply.status(200).send({
      message: 'Authenticated',
      targetId: target.id,
    });
    return;
  });
}

// TODO: https://github.com/open-telemetry/opentelemetry-collector/blob/ae0b83b94cc4d4cd90a73a2f390d23c25f848aec/config/confighttp/confighttp.go#L551C4-L551C84
//       swallows the error and returns 401 Unauthorized to the OTel SDK.
const invalidTaretRefError =
  'Invalid slug or ID provided for target reference. ' +
  'Must match target slug "$organization_slug/$project_slug/$target_slug" (e.g. "the-guild/graphql-hive/staging") ' +
  'or UUID (e.g. c8164307-0b42-473e-a8c5-2860bb4beff6).';

function parseTargetRef(targetRef: string) {
  if (targetRef.includes('/')) {
    const parts = targetRef.split('/');

    if (parts.length !== 3) {
      return {
        ok: false,
        error: invalidTaretRefError,
      } as const;
    }

    const [organizationSlug, projectSlug, targetSlug] = parts;

    return {
      ok: true,
      data: {
        kind: 'slugs',
        organizationSlug,
        projectSlug,
        targetSlug,
      },
    } as const;
  }

  if (!isUUID(targetRef)) {
    return {
      ok: false,
      error: invalidTaretRefError,
    } as const;
  }

  return {
    ok: true,
    data: {
      kind: 'id',
      targetId: targetRef,
    },
  } as const;
}
